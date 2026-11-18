import { expect, test, type Page } from '@playwright/test'
import { areaLabel, waitForDesk } from './helpers.ts'

test.use({ locale: 'es-AR' })

async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
}

/** Whether the face the base screen uses (`font` shorthand, e.g. `italic 16px "Literata Variable"`) is loaded. */
function fontLoaded(page: Page, font: string) {
  return page.evaluate(async (font) => {
    await document.fonts.ready
    return document.fonts.check(font)
  }, font)
}

test('opens offline after the first visit, with its fonts', async ({ page, context }) => {
  await page.goto('/')
  await waitForServiceWorker(page)

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'MTF By Zynis', exact: true })).toBeVisible()
  await expect(areaLabel(page, 'Trabajo')).toBeVisible()
  expect(await fontLoaded(page, 'italic 16px "Literata Variable"')).toBe(true)

  // Figtree draws the Area counts and every control.
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('group', { name: 'Idioma' })).toBeVisible()
  expect(await fontLoaded(page, '16px "Figtree Variable"')).toBe(true)
})

test('shows the language chosen online when opened offline', async ({ page, context }) => {
  await page.goto('/')
  await waitForServiceWorker(page)
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'English' }).click()

  await context.setOffline(true)
  await page.reload()

  await expect(areaLabel(page, 'Work')).toBeVisible()
})

test('no request leaves the MTF origin', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const foreign: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) foreign.push(request.url())
  })

  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()

  expect(foreign).toEqual([])
})

/** As if the user switched apps and came back: hidden, then visible. */
async function hideAndShow(page: Page) {
  for (const state of ['hidden', 'visible']) {
    await page.evaluate((state) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
      document.dispatchEvent(new Event('visibilitychange'))
    }, state)
  }
}

test('with no session, launching, working, hiding and showing sends no request (#37)', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const foreign: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) foreign.push(request.url())
  })

  await page.goto('/')
  await waitForDesk(page)
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  await page.keyboard.type('Una nota')
  await page.keyboard.press('Escape')
  await hideAndShow(page)
  await page.waitForTimeout(500)

  expect(foreign).toEqual([])
})

test('with a session, every request goes to the API address only (#37)', async ({ page, baseURL }) => {
  const API = 'https://api.mtf.zynis.com.ar'
  const origin = new URL(baseURL!).origin
  const elsewhere: string[] = []
  let api = 0
  page.on('request', (request) => {
    const target = new URL(request.url()).origin
    if (target === API) api++
    else if (target !== origin) elsewhere.push(request.url())
  })
  await page.route(API + '/**', (route) => {
    const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST' }
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const body =
      path === '/api/auth/refresh'
        ? { accessToken: 'jwt', accessTokenExpiresAt: '2030-01-01T00:00:00Z', refreshToken: 'rt-2', email: 'ana@example.com' }
        : path === '/api/sync/pull'
          ? { records: [], next: 10, more: false }
          : {}
    return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  })

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('mtf_session', JSON.stringify({ refreshToken: 'rt-1', email: 'ana@example.com' }))
    localStorage.setItem('mtf_sync', JSON.stringify({ owner: 'ana@example.com', cursor: 10, pending: {}, held: [], claim: null, lastSyncAt: null }))
  })
  await page.reload()
  await waitForDesk(page)
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  await page.keyboard.type('Una nota')
  await page.keyboard.press('Escape')
  await hideAndShow(page)

  await expect.poll(() => api).toBeGreaterThan(0)
  expect(elsewhere).toEqual([])
})
