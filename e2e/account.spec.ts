import { expect, test, type Page } from '@playwright/test'
import { areaLabel } from './helpers.ts'

// The Account flows in a real browser (#36). The API is mocked with `page.route` at its own
// address, which the production build calls; nothing here reaches a real server.

test.use({ locale: 'es-AR' })

const API = 'https://api.mtf.zynis.com.ar'
const tokens = (refreshToken: string) => ({
  accessToken: `jwt-${refreshToken}`,
  accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  refreshToken,
  email: 'gian@example.com',
})

type Answer = { status: number; body?: unknown }

/** Mocks the API: `answers[path]` gives each answer (a function for answers that change); records every request. */
async function mockApi(page: Page, answers: Record<string, Answer | (() => Answer)> = {}) {
  const requests: { path: string; body: unknown }[] = []
  await page.route(`${API}/**`, async (route) => {
    const request = route.request()
    const cors = {
      'Access-Control-Allow-Origin': new URL(page.url() || 'http://localhost:4173').origin,
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Allow-Methods': 'GET, POST',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })

    const path = new URL(request.url()).pathname
    requests.push({ path, body: request.postDataJSON() })
    const answer = path === '/health' ? { status: 200 } : (answers[path] ?? { status: 404 })
    const { status, body } = typeof answer === 'function' ? answer() : answer
    await route.fulfill({
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: body === undefined ? '' : JSON.stringify(body),
    })
  })
  return requests
}

async function openAccountSheet(page: Page) {
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: /Entrar o crear una cuenta|gian@example\.com/ }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeHidden()
}

async function signIn(page: Page) {
  await openAccountSheet(page)
  const sheet = page.getByRole('dialog', { name: 'Cuenta' })
  await sheet.getByLabel('Email').fill('gian@example.com')
  await sheet.getByLabel('Contraseña').fill('secreto123')
  await sheet.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(sheet.getByText('Entraste como')).toBeVisible()
}

async function settingsShowsEmail(page: Page) {
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' }).getByText('gian@example.com')).toBeVisible()
}

test('signs in, sees the email, and still sees it after a reload', async ({ page }) => {
  const requests = await mockApi(page, { '/api/auth/login': { status: 200, body: tokens('rt-1') } })
  await page.goto('/')

  await signIn(page)
  expect(requests.find((r) => r.path === '/api/auth/login')?.body).toEqual({ email: 'gian@example.com', password: 'secreto123' })
  await page.keyboard.press('Escape')

  await page.reload()
  await settingsShowsEmail(page)
})

test('relaunched offline with a session: the Desk works and Settings shows the email', async ({ page, context }) => {
  await mockApi(page, { '/api/auth/login': { status: 200, body: tokens('rt-1') } })
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await signIn(page)
  await page.keyboard.press('Escape')

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'MTF By Zynis', exact: true })).toBeVisible()
  await expect(areaLabel(page, 'Trabajo')).toBeVisible()
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  await expect(page.getByRole('dialog', { name: 'Tarjeta' })).toBeVisible()
  await page.keyboard.press('Escape')
  await settingsShowsEmail(page)
})

test('the privacy page is served, also offline, and asks nothing of the API', async ({ page, context }) => {
  const requests = await mockApi(page)
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  await context.setOffline(true)
  await page.goto('/privacidad.html#en')

  await expect(page.getByRole('heading', { name: 'Privacidad', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'contacto@zynis.com.ar' }).first()).toBeVisible()
  expect(requests).toEqual([])
})

test('opening Settings makes no API request', async ({ page }) => {
  const requests = await mockApi(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' }).getByText('Entrar o crear una cuenta')).toBeVisible()

  expect(requests).toEqual([])
})

test('a signed-in launch makes no API request', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mtf_session', JSON.stringify({ refreshToken: 'rt-1', email: 'gian@example.com' }))
  })
  const requests = await mockApi(page)

  await page.goto('/')
  await expect(areaLabel(page, 'Trabajo')).toBeVisible()
  await settingsShowsEmail(page)

  expect(requests).toEqual([])
})

test('opening the Account sheet wakes only /health', async ({ page }) => {
  const requests = await mockApi(page)
  await page.goto('/')

  await openAccountSheet(page)
  await expect.poll(() => requests.length).toBeGreaterThan(0)

  expect(requests.map((r) => r.path)).toEqual(['/health'])
})

test('a recovery link opens on its step and leaves the address at once', async ({ page }) => {
  const requests = await mockApi(page, { '/api/auth/reset-password': { status: 204 } })

  await page.goto('/#reset=reset_token-123')

  const sheet = page.getByRole('dialog', { name: 'Elegí una contraseña nueva' })
  await expect(sheet).toBeVisible()
  expect(page.url()).not.toContain('reset_token-123')
  await sheet.getByLabel('Contraseña nueva').fill('nueva-clave-1')
  await sheet.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByRole('dialog', { name: 'Contraseña guardada' })).toBeVisible()
  expect(requests.find((r) => r.path === '/api/auth/reset-password')?.body).toEqual({
    token: 'reset_token-123',
    newPassword: 'nueva-clave-1',
  })
})

test('Google: opens its window with only the hash, and shows the account once handed over', async ({ page }) => {
  await page.addInitScript(() => {
    const opened: string[] = []
    Object.assign(window, { __opened: opened })
    window.open = (url?: string | URL) => {
      opened.push(String(url))
      return null
    }
  })
  let polls = 0
  const requests = await mockApi(page, {
    '/api/auth/google/exchange': () => (++polls < 2 ? { status: 202 } : { status: 200, body: tokens('rt-g') }),
  })
  await page.goto('/')
  await openAccountSheet(page)

  const sheet = page.getByRole('dialog', { name: 'Cuenta' })
  await sheet.getByRole('button', { name: 'Continuar con Google' }).click()
  await expect(sheet.getByText('Seguí en la ventana de Google.', { exact: false })).toBeVisible()

  await expect(sheet.getByText('Entraste como')).toBeVisible({ timeout: 15_000 })
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)
  expect(opened).toHaveLength(1)
  // MTF's own address, which waits for the API before going on to Google.
  const waitAddress = new URL(opened[0])
  expect(waitAddress.origin).toBe(new URL(page.url()).origin)
  const fragment = new URLSearchParams(waitAddress.hash.slice(1))
  const handoff = fragment.get('google')!
  expect(handoff).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(fragment.get('lang')).toBe('es')
  const secret = (requests.find((r) => r.path === '/api/auth/google/exchange')?.body as { secret: string }).secret
  expect(secret).not.toBe(handoff)
  expect(opened[0]).not.toContain(secret)
})

test("Google's window: the plane in MTF while the API wakes, then Google by itself, with no Desk behind it", async ({ page }) => {
  const hash = 'h4sh_of-the-secret'.padEnd(43, 'x')
  await page.route(`${API}/**`, async (route) => {
    if (new URL(route.request().url()).pathname === '/health') {
      // Asleep for a while: long enough for the plane to take off (1.5 s).
      await new Promise((resolve) => setTimeout(resolve, 4_000))
      return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Healthy' })
    }
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' })
  })
  const login = page.waitForRequest((request) => request.url().startsWith(`${API}/api/auth/google/login`))

  // The browser's language is Spanish (es-AR); the address says English.
  await page.goto(`/#google=${hash}&lang=en`)

  await expect(page.getByRole('status')).toHaveText('Connecting…')
  await expect(page.locator('main svg').first()).toBeVisible()
  await expect(page.getByRole('button')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('mtf_language'))).toBeNull()

  const url = new URL((await login).url())
  expect(url.searchParams.get('handoff')).toBe(hash)
  expect(url.searchParams.get('lang')).toBe('en')
  await expect(page.getByText('Google')).toBeVisible()
})
