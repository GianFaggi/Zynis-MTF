import { expect, test, type Page } from '@playwright/test'
import type { MtfData, SyncRecord, SyncState } from '../src/types/index.ts'
import { AREAS, Touch, card, center, deskCard, storedData, waitForDesk } from './helpers.ts'

// Sync in a real browser (#37). The API is mocked with `page.route` at its own address, which the
// production build calls; nothing here reaches a real server.

test.use({ locale: 'es-AR' })

const API = 'https://api.mtf.zynis.com.ar'
const EMAIL = 'ana@example.com'

type PullAnswer = { records: SyncRecord[]; next: number; more: boolean }

/** A pull answer held back until the test opens it. */
function gate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => (open = resolve))
  return { open, opened }
}

/** Mocks renewals, pulls (answered by `pull`) and pushes; records every request to the API. */
async function mockSyncApi(page: Page, pull: (after: number) => PullAnswer | Promise<PullAnswer>) {
  const requests: { method: string; path: string; body: unknown }[] = []
  await page.route(`${API}/**`, async (route) => {
    const request = route.request()
    const cors = {
      'Access-Control-Allow-Origin': new URL(page.url() || 'http://localhost:4173').origin,
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Allow-Methods': 'GET, POST',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const url = new URL(request.url())
    requests.push({ method: request.method(), path: url.pathname, body: request.postDataJSON() })
    const json = (body: unknown) => route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (url.pathname === '/health') return route.fulfill({ status: 200, headers: cors, body: 'Healthy' })
    if (url.pathname === '/api/auth/refresh')
      return json({ accessToken: 'jwt', accessTokenExpiresAt: '2030-01-01T00:00:00Z', refreshToken: 'rt-2', email: EMAIL })
    if (url.pathname === '/api/sync/pull') return json(await pull(Number(url.searchParams.get('after'))))
    if (url.pathname === '/api/sync/push') return json({})
    return route.fulfill({ status: 404, headers: cors })
  })
  return requests
}

/** Opens MTF signed in, over a stored Desk and sync state (a device that already synced unless given). */
async function openSignedIn(page: Page, data: Partial<MtfData>, sync: Partial<SyncState> = { owner: EMAIL, cursor: 10 }) {
  await page.addInitScript(() => localStorage.setItem('mtf_welcome_placed', '1'))
  await page.goto('/')
  await page.evaluate(
    ({ doc, sync, email }) => {
      localStorage.setItem('mtf_data', JSON.stringify(doc))
      localStorage.setItem('mtf_session', JSON.stringify({ refreshToken: 'rt-1', email }))
      localStorage.setItem('mtf_sync', JSON.stringify({ owner: null, cursor: 0, pending: {}, held: [], claim: null, lastSyncAt: null, ...sync }))
    },
    { doc: { schemaVersion: 1, areas: AREAS, cards: [], events: [], ...data }, sync, email: EMAIL },
  )
  await page.reload()
  await waitForDesk(page)
}

const lifted = card({ id: 'lifted', title: 'La que arrastro', position: { x: 200, y: 300, tilt: 0, z: 1 } })
const other = card({ id: 'other', title: 'Otra', position: { x: 600, y: 300, tilt: 0, z: 2 } })

/** Another device changed both Cards, later than anything here. */
function remoteChanges(): PullAnswer {
  const later = Date.now() + 60 * 60 * 1000
  return {
    records: [
      { kind: 'card', id: 'other', updatedAt: later, deleted: false, data: { ...other, title: 'Otra, del teléfono', updatedAt: later } },
      { kind: 'card', id: 'lifted', updatedAt: later, deleted: false, data: { ...lifted, title: 'Arrastrada, del teléfono', updatedAt: later } },
    ],
    next: 20,
    more: false,
  }
}

const titleOf = async (page: Page, id: string) => (await storedData(page)).cards.find((c) => c.id === id)?.title

test('a signed-in launch shows the Desk at once while the server has not answered', async ({ page }) => {
  const held = gate()
  const requests = await mockSyncApi(page, async () => {
    await held.opened
    return { records: [], next: 10, more: false }
  })

  await openSignedIn(page, { cards: [lifted, other] })

  await expect(deskCard(page, 'lifted')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ajustes' })).toBeEnabled()
  await expect.poll(() => requests.some((r) => r.path === '/api/sync/pull')).toBe(true)
  // A sync that lasts more than 2 s shows the paper plane in the tools pill.
  await expect(page.getByRole('img', { name: 'Sincronizando…' })).toBeVisible()
  held.open()
  await expect(page.getByRole('img', { name: 'Sincronizando…' })).toBeHidden()
})

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse')

  test('changes fetched during a drag wait for the drop, and the Card stays under the pointer', async ({ page }) => {
    const held = gate()
    await mockSyncApi(page, async () => {
      await held.opened
      return remoteChanges()
    })
    await openSignedIn(page, { cards: [lifted, other] })
    const from = await center(deskCard(page, 'lifted'))
    const to = { x: from.x + 60, y: from.y + 40 }

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 10 })
    await expect(deskCard(page, 'lifted')).toHaveAttribute('data-lifted', '')

    held.open()
    await page.waitForTimeout(600)
    expect(await titleOf(page, 'other')).toBe('Otra')
    expect(await titleOf(page, 'lifted')).toBe('La que arrastro')
    const during = await center(deskCard(page, 'lifted'))
    expect(Math.abs(during.x - to.x)).toBeLessThan(8)
    expect(Math.abs(during.y - to.y)).toBeLessThan(8)

    await page.mouse.up()

    await expect.poll(() => titleOf(page, 'other')).toBe('Otra, del teléfono')
    await expect.poll(() => titleOf(page, 'lifted')).toBe('Arrastrada, del teléfono')
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  test('changes fetched while a Card is held wait for the drop, and the Card stays under the finger', async ({ page }) => {
    const held = gate()
    await mockSyncApi(page, async () => {
      await held.opened
      return remoteChanges()
    })
    await openSignedIn(page, { cards: [lifted, other] })
    const touch = await Touch.on(page)
    const from = await center(deskCard(page, 'lifted'))
    const to = { x: from.x + 50, y: from.y + 60 }

    await touch.send('touchStart', [from])
    await page.waitForTimeout(450)
    for (let step = 1; step <= 10; step++) {
      await touch.send('touchMove', [{ x: from.x + ((to.x - from.x) * step) / 10, y: from.y + ((to.y - from.y) * step) / 10 }])
    }
    await expect(deskCard(page, 'lifted')).toHaveAttribute('data-lifted', '')

    held.open()
    await page.waitForTimeout(600)
    expect(await titleOf(page, 'other')).toBe('Otra')
    const during = await center(deskCard(page, 'lifted'))
    expect(Math.abs(during.x - to.x)).toBeLessThan(8)
    expect(Math.abs(during.y - to.y)).toBeLessThan(8)

    await touch.send('touchEnd', [])

    await expect.poll(() => titleOf(page, 'other')).toBe('Otra, del teléfono')
    await expect.poll(() => titleOf(page, 'lifted')).toBe('Arrastrada, del teléfono')
  })
})

test.describe('first sign-in dialog', () => {
  const mine = card({ id: 'mine', title: 'Mía', position: { x: 200, y: 300, tilt: 0, z: 1 } })
  const theirs = card({ id: 'theirs', title: 'De la cuenta', position: { x: 300, y: 400, tilt: 0, z: 1 }, updatedAt: 5 })
  const account = (): PullAnswer => ({
    records: [
      ...AREAS.map((area) => ({ kind: 'area' as const, id: area.id, updatedAt: 1, deleted: false, data: area })),
      { kind: 'card', id: 'theirs', updatedAt: 5, deleted: false, data: theirs },
    ],
    next: 30,
    more: false,
  })

  test('neither choice is preselected, closing sends nothing, and Usar el de la cuenta can be recovered', async ({ page }) => {
    const requests = await mockSyncApi(page, account)
    await openSignedIn(page, { cards: [mine] }, { owner: null })

    const dialog = page.getByRole('dialog', { name: '¿Con qué escritorio seguimos?' })
    await expect(dialog).toBeVisible()
    const useAccount = dialog.getByRole('button', { name: 'Usar el de la cuenta' })
    const upload = dialog.getByRole('button', { name: 'Subir este' })
    await expect(useAccount).not.toBeFocused()
    await expect(upload).not.toBeFocused()
    expect(await useAccount.getAttribute('class')).toBe(await upload.getAttribute('class'))

    await dialog.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dialog).toBeHidden()
    expect(requests.some((r) => r.path === '/api/sync/push')).toBe(false)
    expect((await storedData(page)).cards.map((c) => c.id)).toEqual(['mine'])

    // The next arrival asks again.
    await page.reload()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Usar el de la cuenta' }).click()
    await expect(dialog).toBeHidden()
    await expect(deskCard(page, 'theirs')).toBeVisible()
    await expect(deskCard(page, 'mine')).toHaveCount(0)

    await page.getByRole('button', { name: 'Ajustes' }).click()
    await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: 'Recuperar el escritorio anterior' }).click()
    await expect(deskCard(page, 'mine')).toBeVisible()
    await expect(deskCard(page, 'theirs')).toHaveCount(0)
  })
})
