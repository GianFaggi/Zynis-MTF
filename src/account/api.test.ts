import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WAIT_LIMIT } from '../sync/wait'
import { API_URL, AWAKE_FOR, WAKE_RETRY, apiBaseUrl, apiRequest, resetWake, wakeApi, withSession } from './api'

type Handler = (url: string, init: RequestInit) => Promise<Response>

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** A request that never answers, until it is aborted. */
const hang: Handler = (_, init) =>
  new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))

const healthy: Handler = async () => new Response('Healthy', { status: 200 })

/** Stubs `fetch`: `/health` answers with `health`, everything else with `api`. */
function stubFetch(health: Handler, api: Handler = async () => json(204)) {
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) => (url.endsWith('/health') ? health(url, init) : api(url, init)))
  vi.stubGlobal('fetch', fetchMock)
  const calls = (path: string) =>
    fetchMock.mock.calls.filter(([url]) => url === `${API_URL}${path}`) as [string, RequestInit][]
  return { fetchMock, calls }
}

describe('apiBaseUrl', () => {
  it('calls its own domain in production, never the host provider', () => {
    expect(apiBaseUrl({ DEV: false })).toBe('https://api.mtf.zynis.com.ar')
  })

  it('calls the local API in development', () => {
    expect(apiBaseUrl({ DEV: true })).toBe('http://localhost:5000')
  })

  it('takes VITE_API_URL as a local override', () => {
    expect(apiBaseUrl({ DEV: false, VITE_API_URL: 'http://192.168.1.10:5000' })).toBe('http://192.168.1.10:5000')
  })
})

describe('apiRequest', () => {
  beforeEach(() => {
    resetWake()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends nothing when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { fetchMock } = stubFetch(healthy)

    expect(await apiRequest('/api/auth/login', { body: {} })).toEqual({ ok: false, code: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts JSON to the API and reads a JSON answer', async () => {
    const { calls } = stubFetch(healthy, async () => json(200, { email: 'gian@example.com' }))

    const result = await apiRequest('/api/auth/login', { body: { email: 'gian@example.com', password: 'x' } })

    expect(result).toEqual({ ok: true, data: { email: 'gian@example.com' } })
    const [, init] = calls('/api/auth/login')[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ email: 'gian@example.com', password: 'x' }))
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('reads an empty answer as done', async () => {
    stubFetch(healthy, async () => json(204))

    expect(await apiRequest('/api/auth/register', { body: {} })).toEqual({ ok: true, data: undefined })
  })

  it('sends the access token when given one', async () => {
    const { calls } = stubFetch(healthy, async () => json(200, {}))

    await apiRequest('/api/auth/me', { method: 'GET', accessToken: 'jwt' })

    expect(new Headers(calls('/api/auth/me')[0][1].headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('passes a code from the server through, with its status', async () => {
    stubFetch(healthy, async () => json(401, { code: 'invalid_credentials', title: 'invalid_credentials' }))

    expect(await apiRequest('/api/auth/login', { body: {} })).toEqual({ ok: false, code: 'invalid_credentials', status: 401 })
  })

  it('reads a server error with no code as server_error', async () => {
    stubFetch(healthy, async () => new Response('Bad gateway', { status: 502 }))

    expect(await apiRequest('/api/auth/login', { body: {} })).toMatchObject({ ok: false, code: 'server_error', status: 502 })
  })

  it('reads a failed request as network', async () => {
    stubFetch(healthy, async () => {
      throw new TypeError('Failed to fetch')
    })

    expect(await apiRequest('/api/auth/login', { body: {} })).toEqual({ ok: false, code: 'network' })
  })

  it('gives up with timeout at the wait limit, wake included, and never sends the request', async () => {
    const { calls } = stubFetch(hang)

    const result = apiRequest('/api/auth/login', { body: {} })
    await vi.advanceTimersByTimeAsync(WAIT_LIMIT)

    expect(await result).toEqual({ ok: false, code: 'timeout' })
    expect(calls('/api/auth/login')).toHaveLength(0)
  })

  it('gives up with timeout when the API is awake but the request never answers', async () => {
    stubFetch(healthy, hang)

    const result = apiRequest('/api/auth/login', { body: {} })
    await vi.advanceTimersByTimeAsync(WAIT_LIMIT)

    expect(await result).toEqual({ ok: false, code: 'timeout' })
  })

  it('stops with aborted when the sheet closes', async () => {
    stubFetch(healthy, hang)
    const sheet = new AbortController()

    const result = apiRequest('/api/auth/login', { body: {}, signal: sheet.signal })
    await vi.advanceTimersByTimeAsync(100)
    sheet.abort()

    expect(await result).toEqual({ ok: false, code: 'aborted' })
  })

  it('waits for the wake, then sends the request exactly once', async () => {
    let healthCalls = 0
    const { calls } = stubFetch(async () => {
      healthCalls++
      if (healthCalls < 3) throw new TypeError('Failed to fetch') // Render still spinning up
      return new Response('Healthy', { status: 200 })
    })

    const result = apiRequest('/api/auth/reset-password', { body: { token: 't', newPassword: 'p' } })
    await vi.advanceTimersByTimeAsync(WAKE_RETRY)
    expect(calls('/api/auth/reset-password')).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(WAKE_RETRY)

    expect(await result).toEqual({ ok: true, data: undefined })
    expect(calls('/health')).toHaveLength(3)
    expect(calls('/api/auth/reset-password')).toHaveLength(1)
  })
})

describe('wakeApi', () => {
  beforeEach(() => {
    resetWake()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('asks /health again every 5 seconds until it answers', async () => {
    let answers = false
    const { calls } = stubFetch(async () => {
      if (!answers) throw new TypeError('Failed to fetch')
      return new Response('Healthy', { status: 200 })
    })

    const woke = wakeApi()
    await vi.advanceTimersByTimeAsync(0)
    expect(calls('/health')).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(WAKE_RETRY)
    expect(calls('/health')).toHaveLength(2)
    answers = true
    await vi.advanceTimersByTimeAsync(WAKE_RETRY)

    expect(await woke).toBe(true)
    expect(calls('/health')).toHaveLength(3)
  })

  it('gives up at the wait limit', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch')
    })

    const woke = wakeApi()
    await vi.advanceTimersByTimeAsync(WAIT_LIMIT)

    expect(await woke).toBe(false)
  })

  it('skips /health within 10 minutes of an answer, and asks again after', async () => {
    const { calls } = stubFetch(healthy)
    await wakeApi()

    await vi.advanceTimersByTimeAsync(AWAKE_FOR - 1)
    expect(await wakeApi()).toBe(true)
    expect(calls('/health')).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(2)
    await wakeApi()
    expect(calls('/health')).toHaveLength(2)
  })

  it('shares one wake between calls made at the same time', async () => {
    const { calls } = stubFetch(healthy)

    await Promise.all([wakeApi(), wakeApi(), wakeApi()])

    expect(calls('/health')).toHaveLength(1)
  })
})

describe('withSession', () => {
  it('renews once when the access token was refused, then calls again', async () => {
    const refresh = vi.fn(async () => ({ ok: true as const, data: 'new-jwt' }))
    const call = vi.fn(async (token: string) =>
      token === 'old-jwt' ? { ok: false as const, code: 'unknown', status: 401 } : { ok: true as const, data: 'me' },
    )

    const result = await withSession({ accessToken: () => 'old-jwt', refresh }, call)

    expect(result).toEqual({ ok: true, data: 'me' })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(call.mock.calls.map(([token]) => token)).toEqual(['old-jwt', 'new-jwt'])
  })

  it('renews first when there is no access token, and does not renew twice', async () => {
    const refresh = vi.fn(async () => ({ ok: true as const, data: 'jwt' }))
    const call = vi.fn(async () => ({ ok: false as const, code: 'unknown', status: 401 }))

    const result = await withSession({ accessToken: () => null, refresh }, call)

    expect(result).toEqual({ ok: false, code: 'unknown', status: 401 })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('returns the renewal failure without calling', async () => {
    const call = vi.fn()

    const result = await withSession(
      { accessToken: () => null, refresh: async () => ({ ok: false, code: 'session_ended', status: 401 }) },
      call,
    )

    expect(result).toEqual({ ok: false, code: 'session_ended', status: 401 })
    expect(call).not.toHaveBeenCalled()
  })
})
