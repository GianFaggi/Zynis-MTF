import { expect, test, type Page } from '@playwright/test'
import { Touch, areaLabel, card, deskCard, deskScale, seedDesk } from './helpers.ts'

test.use({ locale: 'es-AR' })

const trip = card({ id: 'trip', title: 'Viaje a Córdoba', body: 'Salimos el viernes', position: { x: 200, y: 300, tilt: 0 } })

/** A screen point on empty paper: not on a Card, a label or a control. */
async function emptyPaper(page: Page) {
  const viewport = page.viewportSize()!
  const point = { x: Math.round(viewport.width * 0.6), y: Math.round(viewport.height * 0.6) }
  const onPaper = await page.evaluate(
    ({ x, y }) => !document.elementFromPoint(x, y)?.closest('[data-card-id], [data-area-label], button'),
    point,
  )
  expect(onPaper).toBe(true)
  return point
}

async function ctrlWheel(page: Page, at: { x: number; y: number }, deltaY: number) {
  await page.mouse.move(at.x, at.y)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, deltaY)
  await page.keyboard.up('Control')
  // use-gesture ends a wheel gesture after a short pause.
  await page.waitForTimeout(200)
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse and wheel')

  test('dragging empty paper pans the Desk by the drag distance', async ({ page }) => {
    await seedDesk(page, {})
    const label = areaLabel(page, 'Vida')
    const before = (await label.boundingBox())!
    const from = await emptyPaper(page)

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x - 200, from.y + 50, { steps: 10 })
    await page.mouse.up()

    const after = (await label.boundingBox())!
    expect(after.x - before.x).toBeCloseTo(-200, 0)
    expect(after.y - before.y).toBeCloseTo(50, 0)
  })

  test('the wheel without a modifier pans and does not zoom', async ({ page }) => {
    await seedDesk(page, {})
    const label = areaLabel(page, 'Vida')
    const before = (await label.boundingBox())!
    const scale = await deskScale(page)

    await page.mouse.move(400, 400)
    await page.mouse.wheel(120, 80)
    await expect.poll(async () => (await label.boundingBox())!.x).toBeCloseTo(before.x - 120, 0)
    expect((await label.boundingBox())!.y).toBeCloseTo(before.y - 80, 0)
    expect(await deskScale(page)).toBe(scale)
  })

  test('Ctrl + wheel zooms around the cursor', async ({ page }) => {
    await seedDesk(page, { cards: [trip] })
    const box = (await deskCard(page, 'trip').boundingBox())!
    const cursor = { x: box.x + 30, y: box.y + 20 }
    const before = await deskScale(page)

    await ctrlWheel(page, cursor, -40)

    const after = await deskScale(page)
    expect(after).toBeGreaterThan(before * 1.2)
    // The Desk point under the cursor stays under it: the Card's corner moved away from the cursor by the zoom ratio.
    const moved = (await deskCard(page, 'trip').boundingBox())!
    expect(cursor.x - moved.x).toBeCloseTo((cursor.x - box.x) * (after / before), 0)
    expect(cursor.y - moved.y).toBeCloseTo((cursor.y - box.y) * (after / before), 0)
  })

  test('zooming out below 55% shows only titles; zooming back in shows everything', async ({ page }) => {
    await seedDesk(page, { cards: [trip] })
    const tripCard = deskCard(page, 'trip')
    const cursor = { x: 600, y: 400 }

    while ((await deskScale(page)) < 0.6) await ctrlWheel(page, cursor, -20)
    await expect(tripCard.getByText('Salimos el viernes')).toBeVisible()
    await expect(tripCard.getByRole('heading', { name: 'Viaje a Córdoba' })).toBeVisible()

    while ((await deskScale(page)) >= 0.5) await ctrlWheel(page, cursor, 20)
    await expect(tripCard.getByText('Salimos el viernes')).toBeHidden()
    await expect(tripCard.getByRole('heading')).toBeHidden()
    await expect(tripCard.locator('p[aria-hidden]')).toHaveText('Viaje a Córdoba')
    await expect(tripCard.locator('p[aria-hidden]')).toBeVisible()
  })

  test('zoom stops at 8% and at 180%', async ({ page }) => {
    await seedDesk(page, {})
    for (let i = 0; i < 6; i++) await ctrlWheel(page, { x: 600, y: 400 }, 400)
    expect(await deskScale(page)).toBeCloseTo(0.08, 5)
    for (let i = 0; i < 8; i++) await ctrlWheel(page, { x: 600, y: 400 }, -400)
    expect(await deskScale(page)).toBeCloseTo(1.8, 5)
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  test('one finger on empty paper pans the Desk', async ({ page }) => {
    await seedDesk(page, {})
    const label = areaLabel(page, 'Trabajo')
    const before = (await label.boundingBox())!
    const from = await emptyPaper(page)
    const touch = await Touch.on(page)

    await touch.drag(from, { x: from.x - 120, y: from.y - 60 })

    const after = (await label.boundingBox())!
    expect(after.x - before.x).toBeCloseTo(-120, 0)
    expect(after.y - before.y).toBeCloseTo(-60, 0)
  })

  test('a two-finger pinch zooms in and out, down to titles only', async ({ page }) => {
    await seedDesk(page, { cards: [trip] })
    const touch = await Touch.on(page)
    const at = await emptyPaper(page)
    const before = await deskScale(page)

    await touch.pinch(at, 100, 200)
    expect(await deskScale(page)).toBeGreaterThan(before * 1.5)

    await touch.pinch(at, 300, 60)
    expect(await deskScale(page)).toBeLessThan(0.55)
    await expect(deskCard(page, 'trip').getByText('Salimos el viernes')).toBeHidden()
    await expect(deskCard(page, 'trip').locator('p[aria-hidden]')).toBeVisible()
  })
})
