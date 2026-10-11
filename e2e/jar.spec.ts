import { expect, test, type Locator, type Page } from '@playwright/test'
import { AREAS, Touch, areaLabel, card, center, deskCard, seedDesk, storedData } from './helpers.ts'

test.use({ locale: 'es-AR' })

// A finished Card from before change 3 has no Win events yet, so the Jar gives it its
// Card Win: the counter goes from 0 to 1. Both Cards sit in Vida, just above the Jar.
const done = card({
  id: 'done',
  areaId: 'a2',
  title: 'Compras',
  items: [{ id: 'i1', text: 'Pan', done: true, createdAt: 1, updatedAt: 1 }],
  position: { x: 1250, y: 700 },
})
const busy = card({
  id: 'busy',
  areaId: 'a2',
  title: 'Mudanza',
  items: [
    { id: 'b1', text: 'Cajas', done: true, createdAt: 1, updatedAt: 1 },
    { id: 'b2', text: 'Flete', done: false, createdAt: 1, updatedAt: 1 },
    { id: 'b3', text: 'Llaves', done: false, createdAt: 1, updatedAt: 1 },
  ],
  position: { x: 1700, y: 700 },
})

function jar(page: Page) {
  return page.locator('[data-jar]')
}

function counter(page: Page) {
  return page.getByRole('button', { name: /^Mis logros/ })
}

function toast(page: Page) {
  return page.getByRole('status')
}

/**
 * Where to grab a Card without landing on one of its Item boxes: near its top edge,
 * which is its title in the near look and its padding in the far look (the desktop
 * window opens below 55%, where Cards show only their title).
 */
async function grip(page: Page, id: string) {
  const box = (await deskCard(page, id).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + Math.min(20, box.height / 3) }
}

/** Ctrl + wheel over `at` until Cards show their near look (Items and all). */
async function zoomToNearLook(page: Page, at: Locator) {
  while ((await page.locator('[data-desk-world][data-far]').count()) > 0) {
    const { x, y } = await center(at)
    await page.mouse.move(x, y)
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -20)
    await page.keyboard.up('Control')
    await page.waitForTimeout(100)
  }
}

/** The pointer movement that puts the Card's center on the Jar's center. */
async function towardJar(page: Page, id: string) {
  const [from, to] = [await center(deskCard(page, id)), await center(jar(page))]
  return { x: to.x - from.x, y: to.y - from.y }
}

async function mouseDrag(page: Page, start: { x: number; y: number }, by: { x: number; y: number }) {
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + by.x, start.y + by.y, { steps: 15 })
  await page.mouse.up()
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse')

  test('a finished Card dropped on the Jar goes in, counts once and stays there after a reload', async ({ page }) => {
    await seedDesk(page, { cards: [done] })
    await expect(counter(page)).toHaveAccessibleName('Mis logros: 0 cosas hechas en 7 días')
    await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 1 tarjeta')

    const start = await grip(page, 'done')
    const by = await towardJar(page, 'done')
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + by.x, start.y + by.y, { steps: 15 })
    await expect(jar(page)).toHaveAttribute('data-over', '')
    await page.mouse.up()

    await expect(deskCard(page, 'done')).toHaveCount(0)
    await expect(jar(page)).not.toHaveAttribute('data-over')
    await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 0 tarjetas')
    await expect(counter(page)).toHaveAccessibleName('Mis logros: 1 cosa hecha en 7 días')
    await expect(toast(page)).toHaveText('¡Al frasco!Ya va 1 cosa hecha en 7 días')
    await expect(jar(page)).toHaveAccessibleName('Frasco: 1 tarjeta. Abrir Mis logros')

    await page.reload()
    await expect(jar(page)).toHaveAccessibleName('Frasco: 1 tarjeta. Abrir Mis logros')
    await expect(deskCard(page, 'done')).toHaveCount(0)
    const saved = await storedData(page)
    expect(saved.cards[0].jarredAt).not.toBeNull()
    expect(saved.events.map((event) => [event.type, event.cardId])).toEqual([['card', 'done']])
  })

  test('a Card with 2 unchecked Items is refused and slides back to where it started, in its Area', async ({ page }) => {
    await seedDesk(page, { cards: [busy] })
    const before = await center(deskCard(page, 'busy'))

    await mouseDrag(page, await grip(page, 'busy'), await towardJar(page, 'busy'))

    await expect(toast(page)).toHaveText('Todavía noTe faltan 2 elementos')
    await expect(deskCard(page, 'busy')).not.toHaveAttribute('data-returning')
    const after = await center(deskCard(page, 'busy'))
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
    await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 1 tarjeta')
    const saved = await storedData(page)
    expect(saved.cards[0]).toMatchObject({ areaId: 'a2', jarredAt: null, position: busy.position })
    expect(saved.events).toEqual([])
  })

  test('dragging the paper from the Jar pans the Desk and opens nothing', async ({ page }) => {
    await seedDesk(page, {})
    const before = await center(jar(page))
    await mouseDrag(page, before, { x: -200, y: -100 })

    const after = await center(jar(page))
    expect(after.x - before.x).toBeCloseTo(-200, -1)
    expect(after.y - before.y).toBeCloseTo(-100, -1)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('on a 360 px screen the Dock scrolls sideways to reach "Frasco"', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await seedDesk(page, {})
    const dock = page.getByRole('navigation', { name: 'Áreas' })
    expect(await dock.evaluate((nav) => nav.scrollWidth > nav.clientWidth)).toBe(true)

    await dock.getByRole('button', { name: 'Frasco' }).click()
    await page.waitForTimeout(700)
    await expect(jar(page)).toBeInViewport()
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  test('press and hold a finished Card, then drag it onto the Jar: it goes in', async ({ page }) => {
    // Next to the Jar, so both are on screen once the view flies there.
    const near = { ...done, position: { x: 1250, y: 1250, tilt: 0, z: 1 } }
    await seedDesk(page, { cards: [near] })
    await page.getByRole('button', { name: 'Frasco', exact: true }).click()
    await page.waitForTimeout(700)
    const touch = await Touch.on(page)

    const start = await grip(page, 'done')
    const by = await towardJar(page, 'done')
    await touch.drag(start, { x: start.x + by.x, y: start.y + by.y }, { holdMs: 450 })

    await expect(deskCard(page, 'done')).toHaveCount(0)
    await expect(toast(page)).toContainText('¡Al frasco!')
    expect((await storedData(page)).cards[0].jarredAt).not.toBeNull()
  })
})

test('"Frasco" in the Dock brings the Jar into view, and tapping the Jar opens Mis logros', async ({ page, isMobile }) => {
  await seedDesk(page, {})
  await page.getByRole('navigation', { name: 'Áreas' }).getByRole('button', { name: 'Frasco' }).click()
  await page.waitForTimeout(700)
  await expect(jar(page)).toBeInViewport()

  if (isMobile) await jar(page).tap()
  else await jar(page).click()
  await expect(page.getByRole('dialog', { name: 'Mis logros' })).toBeVisible()
})

test('the wins counter is always visible and opens Mis logros', async ({ page }) => {
  await seedDesk(page, {})
  await expect(counter(page)).toBeInViewport()
  await counter(page).click()
  await expect(page.getByRole('dialog', { name: 'Mis logros' })).toBeVisible()
})

test('checking the last Item on the Desk celebrates and shows the "Llevala al frasco" chip', async ({ page }) => {
  const shopping = card({
    id: 'shop',
    areaId: 'a1',
    title: 'Compras',
    items: [
      { id: 'pan', text: 'Pan', done: true, createdAt: 1, updatedAt: 1 },
      { id: 'leche', text: 'Leche', done: false, createdAt: 1, updatedAt: 1 },
    ],
    position: { x: 200, y: 300 },
  })
  await seedDesk(page, { cards: [shopping] })
  await zoomToNearLook(page, deskCard(page, 'shop'))
  await deskCard(page, 'shop').getByRole('button', { name: 'Leche' }).click()

  await expect(toast(page)).toHaveText('¡Tarjeta completa!Arrastrala al frasco cuando quieras')
  await expect(deskCard(page, 'shop')).toContainText('Llevala al frasco')
  await expect(deskCard(page, 'shop')).toHaveAttribute('data-finished', '')
  await expect(deskCard(page, 'shop').locator('[data-seal]')).toBeVisible()
  await expect(deskCard(page, 'shop')).toHaveAttribute('data-celebrate', '')
  await expect(deskCard(page, 'shop')).not.toHaveAttribute('data-celebrate') // only once, then gone
  await expect(counter(page)).toHaveAccessibleName('Mis logros: 2 cosas hechas en 7 días')
})

test('Mis logros lists a jarred Card and "Devolver" puts it back inside its Area', async ({ page }) => {
  const jarred = card({ id: 'back', areaId: 'a2', title: 'Llamar al banco', jarredAt: Date.now() - 60_000, position: { x: 9000, y: 9000 } })
  await seedDesk(page, { cards: [jarred] })
  await counter(page).click()
  const sheet = page.getByRole('dialog', { name: 'Mis logros' })
  const row = sheet.getByRole('listitem').filter({ hasText: 'Llamar al banco' })
  await expect(row).toContainText('Vida · hoy')

  await row.getByRole('button', { name: 'Devolver' }).click()
  await expect(toast(page)).toHaveText('Volvió al escritorio')
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText('Cuando lleves una tarjeta al frasco, aparece acá.')

  await page.keyboard.press('Escape')
  await expect(deskCard(page, 'back')).toHaveCount(1)
  await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 1 tarjeta')
  const { cards } = await storedData(page)
  const life = AREAS[1].rect
  expect(cards[0].jarredAt).toBeNull()
  expect(cards[0].position.x).toBeGreaterThanOrEqual(life.x)
  expect(cards[0].position.x).toBeLessThanOrEqual(life.x + life.w)
  expect(cards[0].position.y).toBeGreaterThanOrEqual(life.y)
  expect(cards[0].position.y).toBeLessThanOrEqual(life.y + life.h)
})
