import { expect, test, type Page } from '@playwright/test'
import { areaLabel } from './helpers.ts'

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

  await expect(page.getByRole('heading', { name: 'mtf', exact: true })).toBeVisible()
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
