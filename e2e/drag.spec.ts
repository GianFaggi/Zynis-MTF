import { expect, test } from '@playwright/test'
import { Touch, areaLabel, card, cardColor, center, cssColor, deskCard, deskScale, seedDesk, storedData, wait } from './helpers.ts'

test.use({ locale: 'es-AR' })

const note = card({ id: 'note', areaId: 'a1', title: 'Notas del standup', body: 'Revisar los logs', position: { x: 200, y: 300, tilt: 0, z: 1 } })

function storedCard(data: Awaited<ReturnType<typeof storedData>>, id: string) {
  return data.cards.find((candidate) => candidate.id === id)!
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse')

  test('dragging a Card from Trabajo to Vida changes its color and both counts, and survives a reload', async ({ page }) => {
    await seedDesk(page, { cards: [note] })
    const from = await center(deskCard(page, 'note'))
    const s = await deskScale(page)
    // 1300 Desk px to the right lands the Card's center inside Vida (x 1140–2120).
    const to = { x: from.x + 1300 * s, y: from.y }

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 15 })
    await expect(deskCard(page, 'note')).toHaveAttribute('data-lifted', '')
    expect(await cardColor(page, 'note')).toBe(await cssColor(page, 'sand')) // previewed while dragging
    await page.mouse.up()

    await expect(deskCard(page, 'note')).not.toHaveAttribute('data-lifted')
    expect(await cardColor(page, 'note')).toBe(await cssColor(page, 'sand'))
    await expect(areaLabel(page, 'Trabajo')).toHaveAccessibleName('Trabajo, 0 tarjetas')
    await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 1 tarjeta')
    const landed = await center(deskCard(page, 'note'))
    expect(landed.x).toBeCloseTo(to.x, -1)

    const saved = storedCard(await storedData(page), 'note')
    expect(saved.areaId).toBe('a2')
    expect(saved.position.x).toBeCloseTo(1500, -1)

    await page.reload()
    await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 1 tarjeta')
    expect(await cardColor(page, 'note')).toBe(await cssColor(page, 'sand'))
    expect(storedCard(await storedData(page), 'note').position).toEqual(saved.position)
  })

  test('a dropped Card is drawn above the Card it overlaps, also after a reload', async ({ page }) => {
    const below = card({ id: 'below', title: 'Abajo', position: { x: 200, y: 300, tilt: 0, z: 5 } })
    const moved = card({ id: 'moved', title: 'Arriba', position: { x: 600, y: 300, tilt: 0, z: 1 } })
    await seedDesk(page, { cards: [below, moved] })
    const s = await deskScale(page)
    const from = await center(deskCard(page, 'moved'))

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(from.x - 300 * s, from.y, { steps: 10 })
    await page.mouse.up()
    await page.reload()

    const overlap = await center(deskCard(page, 'below'))
    const onTop = await page.evaluate(({ x, y }) => document.elementFromPoint(x + 40, y)?.closest('[data-card-id]')?.getAttribute('data-card-id'), overlap)
    expect(onTop).toBe('moved')
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  test('press and hold, then drag, moves the Card', async ({ page }) => {
    await seedDesk(page, { cards: [note] })
    const touch = await Touch.on(page)
    const from = await center(deskCard(page, 'note'))

    await touch.drag(from, { x: from.x + 100, y: from.y + 150 }, { holdMs: 450 })

    const after = await center(deskCard(page, 'note'))
    expect(after.x - from.x).toBeCloseTo(100, -1)
    expect(after.y - from.y).toBeCloseTo(150, -1)
    expect(storedCard(await storedData(page), 'note').position.y).toBeGreaterThan(300)
  })

  test('a quick swipe over a Card pans the Desk and leaves the Card in place', async ({ page }) => {
    await seedDesk(page, { cards: [note] })
    const touch = await Touch.on(page)
    const label = (await areaLabel(page, 'Trabajo').boundingBox())!
    const from = await center(deskCard(page, 'note'))

    await touch.drag(from, { x: from.x - 150, y: from.y })

    expect((await areaLabel(page, 'Trabajo').boundingBox())!.x).toBeLessThan(label.x - 100)
    expect(storedCard(await storedData(page), 'note').position).toEqual(note.position)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('a second finger during a drag puts the Card back and zooms instead', async ({ page }) => {
    await seedDesk(page, { cards: [note] })
    const touch = await Touch.on(page)
    const start = await center(deskCard(page, 'note'))
    const scale = await deskScale(page)

    await touch.send('touchStart', [start])
    await wait(450)
    const lifted = { x: start.x + 80, y: start.y + 80 }
    await touch.send('touchMove', [lifted])
    await expect(deskCard(page, 'note')).toHaveAttribute('data-lifted', '')

    const second = { x: lifted.x + 120, y: lifted.y }
    await touch.send('touchStart', [lifted, second])
    await expect(deskCard(page, 'note')).not.toHaveAttribute('data-lifted')
    await touch.send('touchMove', [lifted, { x: second.x + 150, y: second.y }])
    await touch.send('touchEnd', [])

    expect(await deskScale(page)).toBeGreaterThan(scale * 1.3)
    expect(storedCard(await storedData(page), 'note')).toMatchObject({ areaId: 'a1', position: note.position })
  })
})
