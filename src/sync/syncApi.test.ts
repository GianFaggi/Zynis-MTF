import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_URL, resetWake } from '../account/api'
import { initialAccountState, useAccountStore } from '../account/accountStore'
import { saveSession } from '../lib/storage'
import { makeCard } from '../test/fixtures'
import type { SyncRecord } from '../types'
import { KEEPALIVE_BYTES, PUSH_CHUNK_BYTES, chunkRecords, leaveSend, pullRecords, pushRecords } from './syncApi'

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** A Card record of roughly `size` bytes of JSON. */
function record(id: string, size = 200): SyncRecord {
  return { kind: 'card', id, updatedAt: 1, deleted: false, data: { id, title: 'x'.repeat(Math.max(0, size - 120)) } as never }
}

function records(count: number, size: number): SyncRecord[] {
  return Array.from({ length: count }, (_, index) => record(`c${index}`, size))
}

type Api = (url: string, init: RequestInit) => Promise<Response>

/** `/health` answers; every other request goes to `api`. */
function stubFetch(api: Api) {
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) =>
    url.endsWith('/health') ? Promise.resolve(new Response('Healthy')) : api(url, init),
  )
  vi.stubGlobal('fetch', fetchMock)
  const sync = () => fetchMock.mock.calls.filter(([url]) => url.includes('/api/sync/')) as [string, RequestInit][]
  return { fetchMock, sync }
}

const signedInAs = (accessToken: string | null, expiresIn = 10 * 60_000) =>
  useAccountStore.setState({ email: 'ana@example.com', accessToken, accessTokenExpiresAt: Date.now() + expiresIn })

describe('syncApi', () => {
  beforeEach(() => {
    resetWake()
    useAccountStore.setState(initialAccountState(), true)
    saveSession({ refreshToken: 'refresh-1', email: 'ana@example.com' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('never puts more than 512 KB in one push request', async () => {
    signedInAs('jwt')
    const { sync } = stubFetch(async () => json(200, {}))
    const all = records(400, 3000)

    const outcome = await pushRecords(all)

    expect(outcome).toEqual({ sent: all })
    expect(sync().length).toBeGreaterThan(1)
    for (const [, init] of sync()) expect(new TextEncoder().encode(init.body as string).byteLength).toBeLessThanOrEqual(PUSH_CHUNK_BYTES)
  })

  it('keeps the order and every record across chunks', () => {
    const all = records(50, 30_000)
    const chunks = chunkRecords(all)
    expect(chunks.flat()).toEqual(all)
    expect(chunks.length).toBeGreaterThan(1)
  })

  it('stops at the first failed chunk and reports what was confirmed', async () => {
    signedInAs('jwt')
    let call = 0
    stubFetch(async () => (++call === 1 ? json(200, {}) : json(503)))
    const all = records(400, 3000)

    const outcome = await pushRecords(all)

    expect(outcome.sent).toEqual(chunkRecords(all)[0])
    expect(outcome.failure).toMatchObject({ ok: false, code: 'server_error' })
  })

  it('fetches pages until no more are left', async () => {
    signedInAs('jwt')
    const pages: Record<string, unknown> = {
      0: { records: [record('a')], next: 5, more: true },
      5: { records: [record('b')], next: 9, more: true },
      9: { records: [record('c')], next: 12, more: false },
    }
    const { sync } = stubFetch(async (url) => json(200, pages[new URL(url).searchParams.get('after')!]))

    const result = await pullRecords(0)

    expect(result).toEqual({ ok: true, data: { records: [record('a'), record('b'), record('c')], next: 12 } })
    expect(sync().map(([url]) => url)).toEqual([0, 5, 9].map((after) => `${API_URL}/api/sync/pull?after=${after}`))
    expect(sync().every(([, init]) => init.method === 'GET')).toBe(true)
  })

  it('renews the access token once on a 401', async () => {
    signedInAs('old')
    const { fetchMock, sync } = stubFetch(async (url, init) => {
      if (url.endsWith('/api/auth/refresh'))
        return json(200, { accessToken: 'new', accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(), refreshToken: 'refresh-2', email: 'ana@example.com' })
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer new' ? json(200, { records: [], next: 0, more: false }) : json(401)
    })

    expect((await pullRecords(0)).ok).toBe(true)
    expect(sync().map(([, init]) => (init.headers as Record<string, string>).Authorization)).toEqual(['Bearer old', 'Bearer new'])
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'))).toHaveLength(1)
  })

  it('sends a 50 KB leave batch with keepalive, straight to the API', async () => {
    signedInAs('jwt')
    const { sync } = stubFetch(async () => json(200, {}))
    const batch = records(10, 5000)
    expect(new TextEncoder().encode(JSON.stringify({ records: batch })).byteLength).toBeLessThanOrEqual(KEEPALIVE_BYTES)

    const outcome = await leaveSend(batch, { renew: false })

    expect(outcome).toEqual({ sent: batch })
    expect(sync()).toHaveLength(1)
    expect(sync()[0][1]).toMatchObject({ method: 'POST', keepalive: true })
  })

  it('sends a 70 KB leave batch as an ordinary push', async () => {
    signedInAs('jwt')
    const { sync } = stubFetch(async () => json(200, {}))
    const batch = records(14, 5000)

    await leaveSend(batch, { renew: false })

    expect(sync()).toHaveLength(1)
    expect(sync()[0][1].keepalive).toBeUndefined()
  })

  it('sends a Card with a lot of handwriting, over 60 KB on its own, as an ordinary push (#47)', async () => {
    signedInAs('jwt')
    const { sync } = stubFetch(async () => json(200, {}))
    const stroke = Array.from({ length: 6000 }, (_, i) => [i % 1000, 100 + (i % 2000), 50 + (i % 50)]).flat()
    const card = makeCard({ id: 'h', ink: { height: 2500, strokes: [stroke] } })
    const batch: SyncRecord[] = [{ kind: 'card', id: 'h', updatedAt: 2, deleted: false, data: card }]
    expect(new TextEncoder().encode(JSON.stringify({ records: batch })).byteLength).toBeGreaterThan(KEEPALIVE_BYTES)

    const outcome = await leaveSend(batch, { renew: false })

    expect(outcome).toEqual({ sent: batch })
    expect(sync()).toHaveLength(1)
    expect(sync()[0][1].keepalive).toBeUndefined()
    expect(JSON.parse(sync()[0][1].body as string).records[0].data.ink).toEqual(card.ink)
  })

  it('renews an access token about to expire before a leave send on hiding', async () => {
    signedInAs('old', 30_000)
    const { sync } = stubFetch(async (url) =>
      url.endsWith('/api/auth/refresh')
        ? json(200, { accessToken: 'new', accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(), refreshToken: 'refresh-2', email: 'ana@example.com' })
        : json(200, {}),
    )

    await leaveSend([record('a')], { renew: true })

    expect((sync()[0][1].headers as Record<string, string>).Authorization).toBe('Bearer new')
  })

  it('sends with what it has on pagehide, and a refused send stays unconfirmed', async () => {
    signedInAs('old', 30_000)
    const { fetchMock } = stubFetch(async () => json(401))

    const outcome = await leaveSend([record('a')], { renew: false })

    expect(outcome.sent).toEqual([])
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/api/auth/refresh'))).toBe(false)
  })
})
