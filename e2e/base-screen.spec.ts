import { expect, test } from '@playwright/test'
import { areaLabel, openApp } from './helpers.ts'

test.use({ locale: 'es-AR' })

test('opens to the Desk with its Areas, under the floating wordmark', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('heading', { name: 'mtf' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Escritorio' })).toBeVisible()
  await expect(areaLabel(page, 'Trabajo')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
})

test('the screen fits the viewport: no page scroll, only the Desk moves', async ({ page }) => {
  await openApp(page)
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  }))
  expect(overflow.x).toBeLessThanOrEqual(0)
  expect(overflow.y).toBeLessThanOrEqual(0)

  await page.mouse.move(200, 400)
  await page.mouse.wheel(0, 600)
  expect(await page.evaluate(() => [window.scrollX, window.scrollY])).toEqual([0, 0])
})

test('switching to English survives a reload in a Spanish browser', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(areaLabel(page, 'Work')).toBeVisible()

  await page.reload()
  await expect(areaLabel(page, 'Work')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('Settings closes when tapping outside it', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()

  await page.mouse.click(10, 10)
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('the first-run hint shows once and, dismissed, stays gone after a reload', async ({ page }) => {
  await openApp(page, { hintSeen: false })
  const hint = page.getByRole('note')
  await expect(hint).toContainText('Arrastrá las tarjetas a donde quieras')
  await hint.getByRole('button', { name: 'Entendido' }).click()
  await expect(hint).toBeHidden()

  await page.reload()
  await expect(areaLabel(page, 'Trabajo')).toBeVisible()
  await expect(hint).toBeHidden()
})
