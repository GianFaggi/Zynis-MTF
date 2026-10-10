import { expect, test } from '@playwright/test'

test.use({ locale: 'es-AR' })

test('shows the base paper screen with no horizontal scroll', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'mtf' })).toBeVisible()
  await expect(page.getByText('Hola. Tu escritorio de papel ya casi está listo.')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('the welcome line is centered on the paper, clear of the floating wordmark', async ({ page }) => {
  await page.goto('/')
  const wordmark = (await page.getByRole('heading', { name: 'mtf' }).boundingBox())!
  const welcome = (await page.getByText('Hola. Tu escritorio de papel ya casi está listo.').boundingBox())!
  const viewport = page.viewportSize()!

  expect(welcome.y).toBeGreaterThan(wordmark.y + wordmark.height)
  expect(Math.abs(welcome.y + welcome.height / 2 - viewport.height / 2)).toBeLessThan(viewport.height * 0.1)
})

test('switching to English survives a reload in a Spanish browser', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByText('Hi. Your paper desk is almost ready.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Hi. Your paper desk is almost ready.')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('Settings closes when tapping outside it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()

  await page.mouse.click(10, 10)
  await expect(page.getByRole('dialog')).toBeHidden()
})
