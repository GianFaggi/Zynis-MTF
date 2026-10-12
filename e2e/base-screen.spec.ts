import { expect, test, type Page } from '@playwright/test'
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

const DARK_PAPER = 'rgb(28, 26, 24)' // #1c1a18
const LIGHT_PAPER = 'rgb(245, 241, 234)' // #f5f1ea

const paper = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

/** The status bar color: the `theme-color` meta whose `media` matches, as the browser picks it. */
const themeColor = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
      .find((meta) => !meta.media || matchMedia(meta.media).matches)
      ?.content.toLowerCase(),
  )

async function chooseTheme(page: Page, name: string) {
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('group', { name: 'Tema' }).getByRole('button', { name }).click()
  await page.keyboard.press('Escape')
}

test.describe('on a light device', () => {
  test.use({ colorScheme: 'light' })

  test('choosing Oscuro paints the dark paper and status bar, and survives a reload', async ({ page }) => {
    await openApp(page)
    expect(await paper(page)).toBe(LIGHT_PAPER)
    expect(await themeColor(page)).toBe('#f5f1ea')

    await chooseTheme(page, 'Oscuro')
    await expect.poll(() => paper(page)).toBe(DARK_PAPER)
    expect(await themeColor(page)).toBe('#1c1a18')

    await page.reload()
    await expect(areaLabel(page, 'Trabajo')).toBeVisible()
    expect(await paper(page)).toBe(DARK_PAPER)
    expect(await themeColor(page)).toBe('#1c1a18')

    await chooseTheme(page, 'Sistema')
    await expect.poll(() => paper(page)).toBe(LIGHT_PAPER)
    expect(await themeColor(page)).toBe('#f5f1ea')
  })
})

test.describe('on a dark device', () => {
  test.use({ colorScheme: 'dark' })

  test('choosing Claro paints the light paper and status bar', async ({ page }) => {
    await openApp(page)
    expect(await paper(page)).toBe(DARK_PAPER)

    await chooseTheme(page, 'Claro')
    await expect.poll(() => paper(page)).toBe(LIGHT_PAPER)
    expect(await themeColor(page)).toBe('#f5f1ea')
  })
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
