import { expect, test, type Locator, type Page } from '@playwright/test'
import type { MtfData } from '../src/types/index.ts'
import { AREAS, Touch, card, center, deskCard, seedDesk, storedData, waitForDesk } from './helpers.ts'

test.use({ locale: 'es-AR' })

// "Frasco por área" (#19). Area Jars hide in the far look, and the desktop window opens
// zoomed out, so the desktop tests zoom in around a Desk point first.

const pan = { id: 'i1', text: 'Pan', done: true, createdAt: 1, updatedAt: 1 }
/** Finished, in Vida, a little below and left of Vida's Jar (1992, 136, 104 × 120). */
const done = card({ id: 'done', areaId: 'a2', title: 'Compras', items: [pan], position: { x: 1650, y: 320 } })
/** One Item still to check, next to it. */
const busy = card({
  id: 'busy',
  areaId: 'a2',
  title: 'Mudanza',
  items: [{ id: 'b1', text: 'Flete', done: false, createdAt: 1, updatedAt: 1 }],
  position: { x: 1300, y: 320 },
})
/** Finished, in Trabajo, near its right edge. */
const work = card({ id: 'work', areaId: 'a1', title: 'Informe', items: [pan], position: { x: 780, y: 220 } })

/** Between Trabajo's right edge and Vida's Jar: zooming in here keeps both on screen. */
const NEAR_VIDA_JAR = { x: 1480, y: 230 }

function areaJar(page: Page, areaId: string) {
  return page.locator(`[data-jar="${areaId}"]`)
}

function areaJars(page: Page) {
  return page.locator('[data-jar]:not([data-jar=""])')
}

function deskJar(page: Page) {
  return page.locator('[data-jar=""]')
}

function toast(page: Page) {
  return page.getByRole('status')
}

function question(page: Page) {
  return page.getByRole('dialog', { name: '¿Pasarla a Vida y llevarla al frasco?' })
}

/** Opens MTF over a stored document with "Frasco por área" on. */
async function seedWithAreaJars(page: Page, data: Partial<MtfData>) {
  await seedDesk(page, data)
  await page.evaluate(() => localStorage.setItem('mtf_area_jars', '1'))
  await page.reload()
  await waitForDesk(page)
}

/** Where a Desk point is on screen, from the world transform. */
async function toScreen(page: Page, point: { x: number; y: number }) {
  const { s, x, y } = await page.locator('[data-desk-world]').evaluate((world) => {
    const matrix = new DOMMatrix(getComputedStyle(world).transform)
    return { s: matrix.a, x: matrix.e, y: matrix.f }
  })
  return { x: point.x * s + x, y: point.y * s + y }
}

/** Mouse only: Ctrl + wheel around a Desk point until the near look. */
async function zoomInAround(page: Page, point: { x: number; y: number }) {
  while ((await page.locator('[data-desk-world][data-far]').count()) > 0) {
    const at = await toScreen(page, point)
    await page.mouse.move(at.x, at.y)
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -20)
    await page.keyboard.up('Control')
    await page.waitForTimeout(100)
  }
}

/** Near a Card's top edge: its title, never an Item box. */
async function grip(page: Page, id: string) {
  const box = (await deskCard(page, id).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + Math.min(20, box.height / 3) }
}

/** Drags a Card with the mouse until its center is on `to`; `whileOver` runs before the release. */
async function mouseDragTo(page: Page, id: string, to: { x: number; y: number }, whileOver?: () => Promise<void>) {
  const start = await grip(page, id)
  const from = await center(deskCard(page, id))
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + to.x - from.x, start.y + to.y - from.y, { steps: 15 })
  await whileOver?.()
  await page.mouse.up()
}

async function mouseDragOnto(page: Page, id: string, target: Locator, whileOver?: () => Promise<void>) {
  await mouseDragTo(page, id, await center(target), whileOver)
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse')

  test('off by default; Sí in Settings gives every Area its Jar, and it is remembered', async ({ page }) => {
    await seedDesk(page, {})
    await expect(areaJars(page)).toHaveCount(0)

    await page.getByRole('button', { name: 'Ajustes' }).click()
    const option = page.getByRole('group', { name: 'Frasco por área' })
    await expect(option.getByRole('button', { name: 'No' })).toHaveAttribute('aria-pressed', 'true')
    await option.getByRole('button', { name: 'Sí' }).click()
    await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(areaJars(page)).toHaveCount(3)
    await zoomInAround(page, NEAR_VIDA_JAR)
    await expect(areaJar(page, 'a2')).toBeVisible()
    await expect(areaJar(page, 'a2')).toHaveAccessibleName('Frasco de Vida: 0 tarjetas. Abrir Mis logros')
    await expect(deskJar(page)).toHaveCount(1)

    await page.reload()
    await waitForDesk(page)
    await expect(areaJars(page)).toHaveCount(3)
  })

  test('a finished Card dropped on its own Area Jar goes in, and both Jars count it', async ({ page }) => {
    await seedWithAreaJars(page, { cards: [done] })
    await zoomInAround(page, NEAR_VIDA_JAR)

    await mouseDragOnto(page, 'done', areaJar(page, 'a2'), async () => {
      await expect(areaJar(page, 'a2')).toHaveAttribute('data-over', '')
      await expect(deskJar(page)).not.toHaveAttribute('data-over')
    })

    await expect(deskCard(page, 'done')).toHaveCount(0)
    await expect(toast(page)).toContainText('¡Al frasco!')
    await expect(areaJar(page, 'a2')).not.toHaveAttribute('data-over')
    await expect(areaJar(page, 'a2')).toHaveAccessibleName('Frasco de Vida: 1 tarjeta. Abrir Mis logros')
    await expect(deskJar(page)).toHaveAccessibleName('Frasco: 1 tarjeta. Abrir Mis logros')
    expect((await storedData(page)).cards[0]).toMatchObject({ areaId: 'a2', jarredAt: expect.any(Number) })
  })

  test('a Card with an unchecked Item is refused by its Area Jar, with no question', async ({ page }) => {
    await seedWithAreaJars(page, { cards: [busy] })
    await zoomInAround(page, NEAR_VIDA_JAR)
    const before = await center(deskCard(page, 'busy'))

    await mouseDragOnto(page, 'busy', areaJar(page, 'a2'))

    await expect(toast(page)).toHaveText('Todavía noTe falta 1 elemento')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(deskCard(page, 'busy')).not.toHaveAttribute('data-returning')
    const after = await center(deskCard(page, 'busy'))
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
    expect((await storedData(page)).cards[0]).toMatchObject({ areaId: 'a2', jarredAt: null, position: busy.position })
  })

  test("another Area's Jar asks: No puts the Card back, Sí moves it there and into the Jar", async ({ page }) => {
    await seedWithAreaJars(page, { cards: [work] })
    await zoomInAround(page, NEAR_VIDA_JAR)
    const before = await center(deskCard(page, 'work'))

    await mouseDragOnto(page, 'work', areaJar(page, 'a2'))
    await expect(question(page)).toBeVisible()
    await expect(deskCard(page, 'work')).toHaveAttribute('data-lifted', '')
    expect((await storedData(page)).cards[0]).toMatchObject({ areaId: 'a1', jarredAt: null })

    await question(page).getByRole('button', { name: 'No' }).click()
    await expect(question(page)).toBeHidden()
    await expect(deskCard(page, 'work')).not.toHaveAttribute('data-returning')
    await expect(deskCard(page, 'work')).not.toHaveAttribute('data-lifted')
    const back = await center(deskCard(page, 'work'))
    expect(back.x).toBeCloseTo(before.x, 0)
    expect(back.y).toBeCloseTo(before.y, 0)
    expect((await storedData(page)).cards[0]).toMatchObject({ areaId: 'a1', jarredAt: null, position: work.position })

    await mouseDragOnto(page, 'work', areaJar(page, 'a2'))
    await question(page).getByRole('button', { name: 'Sí' }).click()

    await expect(deskCard(page, 'work')).toHaveCount(0)
    await expect(toast(page)).toContainText('¡Al frasco!')
    await expect(areaJar(page, 'a2')).toHaveAccessibleName('Frasco de Vida: 1 tarjeta. Abrir Mis logros')
    await expect(areaJar(page, 'a1')).toHaveAccessibleName('Frasco de Trabajo: 0 tarjetas. Abrir Mis logros')
    await page.getByRole('button', { name: /^Mis logros/ }).click()
    const row = page.getByRole('dialog', { name: 'Mis logros' }).getByRole('listitem').filter({ hasText: 'Informe' })
    await expect(row).toContainText('Vida · hoy')

    await page.reload()
    await waitForDesk(page)
    expect((await storedData(page)).cards[0]).toMatchObject({ areaId: 'a2', jarredAt: expect.any(Number) })
    // Hidden again in the far look of the opening view, so its label is read from the attribute.
    await expect(areaJar(page, 'a2')).toHaveAttribute('aria-label', 'Frasco de Vida: 1 tarjeta. Abrir Mis logros')
  })

  test('Esc answers No', async ({ page }) => {
    await seedWithAreaJars(page, { cards: [work] })
    await zoomInAround(page, NEAR_VIDA_JAR)
    await mouseDragOnto(page, 'work', areaJar(page, 'a2'))
    await expect(question(page)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(question(page)).toBeHidden()
    await expect(deskCard(page, 'work')).toHaveCount(1)
    expect((await storedData(page)).cards[0]).toMatchObject({ areaId: 'a1', jarredAt: null })
  })

  test('zoomed out, no Area Jar shows and a Card released there is just placed', async ({ page }) => {
    await seedWithAreaJars(page, { cards: [done] })
    await expect(page.locator('[data-desk-world][data-far]')).toHaveCount(1)
    await expect(areaJar(page, 'a2')).toBeHidden()
    await expect(deskJar(page)).toBeVisible()

    await mouseDragTo(page, 'done', await toScreen(page, { x: 2044, y: 196 }))

    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(deskCard(page, 'done')).toHaveCount(1)
    const saved = (await storedData(page)).cards[0]
    expect(saved).toMatchObject({ areaId: 'a2', jarredAt: null })
    expect(saved.position.x).not.toBe(done.position.x)
  })

  test('clicking an Area Jar opens Mis logros on that Area', async ({ page }) => {
    await seedWithAreaJars(page, {})
    await zoomInAround(page, NEAR_VIDA_JAR)
    await areaJar(page, 'a2').click()

    const filter = page.getByRole('dialog', { name: 'Mis logros' }).getByRole('group', { name: 'Área' })
    await expect(filter.getByRole('button', { name: 'Vida' })).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  // A narrow Trabajo, so its Jar is on screen in the opening view (its top-left corner).
  const areas = [{ ...AREAS[0], rect: { x: 80, y: 120, w: 520, h: 1000 } }, ...AREAS.slice(1)]
  const nearJar = card({ id: 'near', areaId: 'a1', title: 'Informe', items: [pan], position: { x: 150, y: 320 } })

  test('press and hold a finished Card, then drag it onto its Area Jar: it goes in', async ({ page }) => {
    await seedWithAreaJars(page, { areas, cards: [nearJar] })
    await expect(areaJar(page, 'a1')).toBeInViewport()
    const touch = await Touch.on(page)

    const start = await grip(page, 'near')
    const [from, to] = [await center(deskCard(page, 'near')), await center(areaJar(page, 'a1'))]
    await touch.drag(start, { x: start.x + to.x - from.x, y: start.y + to.y - from.y }, { holdMs: 450 })

    await expect(deskCard(page, 'near')).toHaveCount(0)
    await expect(toast(page)).toContainText('¡Al frasco!')
    await expect(areaJar(page, 'a1')).toHaveAccessibleName('Frasco de Trabajo: 1 tarjeta. Abrir Mis logros')
  })

  test('tapping an Area Jar opens Mis logros on that Area', async ({ page }) => {
    await seedWithAreaJars(page, { areas })
    await areaJar(page, 'a1').tap()
    const filter = page.getByRole('dialog', { name: 'Mis logros' }).getByRole('group', { name: 'Área' })
    await expect(filter.getByRole('button', { name: 'Trabajo' })).toHaveAttribute('aria-pressed', 'true')
  })
})
