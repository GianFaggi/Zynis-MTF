import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  Pen,
  Touch,
  areaLabel,
  card,
  center,
  deskCard,
  deskScale,
  emptyPaper,
  exportBackup,
  importBackup,
  seedDesk,
  storedData,
  wait,
  zoomInIfFar,
} from './helpers.ts'

// Handwriting (#47): the box in the Card editor, written with the mouse, a finger and a pen
// (simulated through CDP), and a handwritten Card on the Desk under the usual gestures.
// Pens (#51): choosing and editing them, each stroke keeping its color and width.

test.use({ locale: 'es-AR' })

const trip = card({ id: 'trip', areaId: 'a1', title: 'Viaje', position: { x: 200, y: 300, tilt: 0, z: 1 } })
const handwritten = card({
  id: 'hand',
  areaId: 'a1',
  position: { x: 200, y: 300, tilt: 0, z: 2 },
  ink: { height: 400, strokes: [[100, 100, 50, 300, 200, 50, 500, 100, 50]] },
})

type Point = { x: number; y: number }

function editor(page: Page) {
  return page.getByRole('dialog', { name: 'Tarjeta' })
}

function inkBox(page: Page) {
  return page.getByRole('img', { name: 'Espacio para escribir a mano' })
}

/** Screen points inside the box, from fractions of its width and height. */
async function inBox(page: Page, fractions: [number, number][]): Promise<Point[]> {
  const box = (await inkBox(page).boundingBox())!
  return fractions.map(([fx, fy]) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy }))
}

async function mouseStroke(page: Page, points: Point[]) {
  await page.mouse.move(points[0].x, points[0].y)
  await page.mouse.down()
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 6 })
  await page.mouse.up()
}

async function storedStrokes(page: Page, id: string) {
  return (await storedData(page)).cards.find((candidate) => candidate.id === id)?.ink?.strokes
}

/** The handwriting setting on, before the first load (only that key, so reloads stay safe). */
async function handwritingOn(page: Page) {
  await page.addInitScript(() => localStorage.setItem('mtf_handwriting', '1'))
}

async function openCard(page: Page, id: string, isMobile: boolean) {
  if (isMobile) await deskCard(page, id).tap()
  else await deskCard(page, id).click()
  await expect(editor(page)).toBeVisible()
}

/** A pen button in the box's tray, by the start of its name ("Lápiz 2, Medio"). */
function penButton(page: Page, name: string) {
  return editor(page).getByRole('button', { name: new RegExp(`^${name},`) })
}

/** The `fill` of every committed stroke under `root` (`null` for Tinta). The box's live path has no `d` yet. */
function strokeFills(root: Locator) {
  return root.locator('path[d^="M"]').evaluateAll((paths) => paths.map((path) => path.getAttribute('fill')))
}

async function storedInk(page: Page, id: string) {
  return (await storedData(page)).cards.find((candidate) => candidate.id === id)?.ink
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse and CDP pen')

  test('turn the setting on, write with the mouse, and find the handwriting after a reload', async ({ page }) => {
    await seedDesk(page, { cards: [trip] })

    // Off on this device: the editor has no offer.
    await openCard(page, 'trip', false)
    await expect(editor(page).getByRole('button', { name: 'A mano' })).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Ajustes' }).click()
    await page.getByRole('group', { name: 'Escritura a mano' }).getByRole('button', { name: 'Sí' }).click()
    await page.keyboard.press('Escape')

    await openCard(page, 'trip', false)
    await editor(page).getByRole('button', { name: 'A mano' }).click()
    await expect(inkBox(page)).toBeVisible()
    await mouseStroke(page, await inBox(page, [[0.1, 0.2], [0.3, 0.5], [0.5, 0.2]]))
    await expect(inkBox(page).locator('path[d^="M"]')).toHaveCount(1)
    await editor(page).getByRole('button', { name: 'Guardar' }).click()
    await expect(editor(page)).toBeHidden()

    await page.reload()
    const [stroke] = (await storedStrokes(page, 'trip'))!
    expect(stroke.length % 3).toBe(0)
    expect(stroke.filter((_, i) => i % 3 === 2).every((p) => p === 50)).toBe(true) // the mouse: even pressure

    await zoomInIfFar(page, await center(deskCard(page, 'trip')))
    await expect(deskCard(page, 'trip').locator('[data-ink-view] path')).toHaveCount(1)
    await openCard(page, 'trip', false)
    await expect(inkBox(page).locator('path[d^="M"]')).toHaveCount(1)
  })

  test('undo and "Borrar todo"', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', false)
    await editor(page).getByRole('button', { name: 'A mano' }).click()

    await mouseStroke(page, await inBox(page, [[0.1, 0.2], [0.4, 0.2]]))
    await mouseStroke(page, await inBox(page, [[0.1, 0.6], [0.4, 0.6]]))
    expect(await storedStrokes(page, 'trip')).toHaveLength(2)

    await editor(page).getByRole('button', { name: 'Deshacer' }).click()
    expect(await storedStrokes(page, 'trip')).toHaveLength(1)

    // The keyboard does the same: Ctrl+Z takes back the stroke just drawn.
    await mouseStroke(page, await inBox(page, [[0.1, 0.6], [0.4, 0.6]]))
    expect(await storedStrokes(page, 'trip')).toHaveLength(2)
    await page.keyboard.press('Control+z')
    expect(await storedStrokes(page, 'trip')).toHaveLength(1)

    await editor(page).getByRole('button', { name: 'Borrar todo' }).click()
    expect(await storedStrokes(page, 'trip')).toHaveLength(1)
    await editor(page).getByRole('button', { name: '¿Borrar todo? Tocá otra vez' }).click()
    expect(await storedStrokes(page, 'trip')).toEqual([])
    await expect(inkBox(page).locator('path[d^="M"]')).toHaveCount(0)

    await editor(page).getByRole('button', { name: 'Deshacer' }).click()
    expect(await storedStrokes(page, 'trip')).toHaveLength(1)
  })

  test('a Card with only handwriting survives closing the editor, shows it zoomed out, and goes to the Jar', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, {})
    await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
    await editor(page).getByRole('button', { name: 'A mano' }).click()
    await mouseStroke(page, await inBox(page, [[0.2, 0.3], [0.6, 0.6]]))
    await editor(page).getByRole('button', { name: 'Guardar' }).click()
    await expect(editor(page)).toBeHidden()

    const [kept] = (await storedData(page)).cards
    expect(kept.ink!.strokes).toHaveLength(1)
    expect((await storedData(page)).events.map((event) => event.type)).toEqual(['note'])

    // Desktop opens zoomed out: the far look shows the handwriting, not an empty title.
    expect(await deskScale(page)).toBeLessThan(0.55)
    const desk = deskCard(page, kept.id)
    await expect(desk).toHaveAccessibleName('Escritura a mano')
    await expect(desk.locator('[data-far-ink] path')).toBeVisible()

    await openCard(page, kept.id, false)
    await editor(page).getByRole('button', { name: 'Llevar al frasco' }).click()
    await expect(editor(page)).toBeHidden()
    expect((await storedData(page)).cards[0].jarredAt).not.toBeNull()
    await expect(desk).toHaveCount(0)
  })

  test('a stroke that ends outside the box draws and does not close the editor', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', false)
    await editor(page).getByRole('button', { name: 'A mano' }).click()

    const [start] = await inBox(page, [[0.5, 0.5]])
    // Out over the scrim, in the window's corner, and released there.
    await mouseStroke(page, [start, { x: 8, y: 8 }])

    await expect(editor(page)).toBeVisible()
    const [stroke] = (await storedStrokes(page, 'trip'))!
    expect(stroke.slice(-3, -1)).toEqual([0, 0]) // kept drawing along the box's edge
  })

  test('a pen draws with its pressure', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', false)
    await editor(page).getByRole('button', { name: 'A mano' }).click()
    const pen = await Pen.on(page)

    await pen.stroke(await inBox(page, [[0.1, 0.3], [0.3, 0.5], [0.5, 0.3]]), { pressure: 0.9 })

    const [stroke] = (await storedStrokes(page, 'trip'))!
    expect(stroke.filter((_, i) => i % 3 === 2)).toContain(90)
  })

  test('with the setting on, a handwritten Card drags to another Area like any Card, also with a pen', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [handwritten] })
    const s = await deskScale(page)
    const from = await center(deskCard(page, 'hand'))

    await mouseStroke(page, [from, { x: from.x + 1300 * s, y: from.y }])
    await expect(areaLabel(page, 'Vida')).toHaveAccessibleName('Vida, 1 tarjeta')
    let saved = (await storedData(page)).cards[0]
    expect(saved.areaId).toBe('a2')
    expect(saved.ink).toEqual(handwritten.ink)

    // On the Desk the pen acts like the mouse: it moves the Card, it does not write.
    const pen = await Pen.on(page)
    const at = await center(deskCard(page, 'hand'))
    await pen.stroke([at, { x: at.x - 650 * s, y: at.y }, { x: at.x - 1300 * s, y: at.y }])
    await expect(areaLabel(page, 'Trabajo')).toHaveAccessibleName('Trabajo, 1 tarjeta')
    saved = (await storedData(page)).cards[0]
    expect(saved.areaId).toBe('a1')
    expect(saved.ink).toEqual(handwritten.ink)
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('with the setting on, a Card with only handwriting dropped on the Jar goes in', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [handwritten] })
    const jar = page.locator('[data-jar=""]')
    const from = await center(deskCard(page, 'hand'))
    const to = await center(jar)

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 15 })
    await expect(jar).toHaveAttribute('data-over', '')
    await page.mouse.up()

    await expect(deskCard(page, 'hand')).toHaveCount(0)
    await expect(jar).toHaveAccessibleName('Frasco: 1 tarjeta. Abrir Mis logros')
    expect((await storedData(page)).cards[0].jarredAt).not.toBeNull()
  })

  test('pens: edit Lápiz 2’s color and width, write with it, and find it all after a reload (#51)', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', false)
    await editor(page).getByRole('button', { name: 'A mano' }).click()
    await expect(penButton(page, 'Tinta')).toHaveAttribute('aria-pressed', 'true')

    // One tap chooses, a second one on the chosen pen edits it.
    const penEditor = page.getByRole('dialog', { name: 'Editar Lápiz 2' })
    await penButton(page, 'Lápiz 2').click()
    await expect(penEditor).toHaveCount(0)
    await penButton(page, 'Lápiz 2').click()
    await penEditor.getByLabel('Color').fill('#8a2be2')
    await penEditor.getByRole('button', { name: 'Grueso' }).click()
    await penEditor.getByRole('button', { name: 'Listo' }).click()
    await expect(penEditor).toBeHidden()
    await expect(editor(page)).toBeVisible()
    await expect(penButton(page, 'Lápiz 2')).toHaveAccessibleName('Lápiz 2, Grueso')

    await mouseStroke(page, await inBox(page, [[0.1, 0.2], [0.3, 0.5], [0.5, 0.2]]))
    expect(await strokeFills(inkBox(page))).toEqual(['#8a2be2'])
    await editor(page).getByRole('button', { name: 'Guardar' }).click()
    await expect(editor(page)).toBeHidden()

    await page.reload()
    expect((await storedInk(page, 'trip'))!.styles).toEqual([{ color: '#8a2be2', size: 12 }])
    await zoomInIfFar(page, await center(deskCard(page, 'trip')))
    expect(await strokeFills(deskCard(page, 'trip').locator('[data-ink-view]'))).toEqual(['#8a2be2'])

    // The pen is still chosen, with its new color and width, and the editor shows the stroke as drawn.
    await openCard(page, 'trip', false)
    expect(await strokeFills(inkBox(page))).toEqual(['#8a2be2'])
    await expect(penButton(page, 'Lápiz 2')).toHaveAttribute('aria-pressed', 'true')
    await expect(penButton(page, 'Lápiz 2')).toHaveAccessibleName('Lápiz 2, Grueso')
    await expect(penButton(page, 'Lápiz 2').locator('[data-pen-dot]')).toHaveCSS('background-color', 'rgb(138, 43, 226)')

    // Tinta draws with no fill of its own: it follows the theme.
    await penButton(page, 'Tinta').click()
    await mouseStroke(page, await inBox(page, [[0.1, 0.7], [0.5, 0.7]]))
    expect(await strokeFills(inkBox(page))).toEqual(['#8a2be2', null])
    expect((await storedInk(page, 'trip'))!.styles).toEqual([
      { color: '#8a2be2', size: 12 },
      { color: null, size: 7 },
    ])

    // A step between the presets, with the slider's own keys: Medio 7 → 9, kept by the next stroke.
    await penButton(page, 'Tinta').click()
    const slider = page.getByRole('dialog', { name: 'Editar Tinta' }).getByRole('slider', { name: 'Grosor exacto' })
    await slider.press('ArrowRight')
    await slider.press('ArrowRight')
    await expect(slider).toHaveValue('9')
    await expect(penButton(page, 'Tinta')).toHaveAccessibleName('Tinta, Grosor 9')
    await mouseStroke(page, await inBox(page, [[0.6, 0.15], [0.9, 0.15]]))
    await expect(slider).toBeHidden()
    expect((await storedInk(page, 'trip'))!.styles).toEqual([
      { color: '#8a2be2', size: 12 },
      { color: null, size: 7 },
      { color: null, size: 9 },
    ])
  })

  test('pens: Lápiz 3 with a pen’s pressure, back from the eraser, and through a Backup to a fresh device (#51)', async ({ page, browser, baseURL }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', false)
    await editor(page).getByRole('button', { name: 'A mano' }).click()

    await penButton(page, 'Lápiz 3').click()
    const pen = await Pen.on(page)
    await pen.stroke(await inBox(page, [[0.1, 0.3], [0.3, 0.5], [0.5, 0.3]]), { pressure: 0.9 })
    let ink = (await storedInk(page, 'trip'))!
    expect(ink.styles).toEqual([{ color: '#d0443a', size: 7 }])
    expect(ink.strokes[0].filter((_, i) => i % 3 === 2)).toContain(90)

    // The eraser on, then a tap on a pen: back to writing, with no editor.
    const eraser = editor(page).getByRole('button', { name: 'Borrador' })
    await eraser.click()
    await expect(penButton(page, 'Lápiz 3')).toHaveAttribute('aria-pressed', 'false')
    await penButton(page, 'Lápiz 4').click()
    await expect(eraser).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('dialog', { name: /^Editar/ })).toHaveCount(0)
    await mouseStroke(page, await inBox(page, [[0.1, 0.7], [0.5, 0.7]]))
    ink = (await storedInk(page, 'trip'))!
    expect(ink.strokes).toHaveLength(2)
    expect(ink.styles).toEqual([
      { color: '#d0443a', size: 7 },
      { color: '#2f9a5e', size: 7 },
    ])
    await editor(page).getByRole('button', { name: 'Guardar' }).click()
    await expect(editor(page)).toBeHidden()

    const { path } = await exportBackup(page)
    const fresh = await browser.newContext({ baseURL, locale: 'es-AR' })
    const other = await fresh.newPage()
    await seedDesk(other, {})
    await importBackup(other, path)
    expect(await storedInk(other, 'trip')).toEqual(ink)
    await zoomInIfFar(other, await center(deskCard(other, 'trip')))
    expect(await strokeFills(deskCard(other, 'trip').locator('[data-ink-view]'))).toEqual(['#d0443a', '#2f9a5e'])
    // The pens are a device setting: the Backup did not bring them.
    expect(await other.evaluate(() => localStorage.getItem('mtf_pens'))).toBeNull()
    await fresh.close()
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  test('the finger writes until a pen touches the box, then is ignored', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', true)
    await editor(page).getByRole('button', { name: 'A mano' }).tap()
    const touch = await Touch.on(page)
    const pen = await Pen.on(page)

    const [a, b] = await inBox(page, [[0.1, 0.3], [0.5, 0.3]])
    await touch.drag(a, b, { steps: 8 })
    expect(await storedStrokes(page, 'trip')).toHaveLength(1)

    await pen.stroke(await inBox(page, [[0.1, 0.6], [0.5, 0.6]]), { pressure: 0.7 })
    const strokes = (await storedStrokes(page, 'trip'))!
    expect(strokes).toHaveLength(2)
    expect(strokes[1].filter((_, i) => i % 3 === 2)).toContain(70)

    // A palm now: nothing is drawn, and the editor stays.
    const [c, d] = await inBox(page, [[0.1, 0.8], [0.5, 0.8]])
    await touch.drag(c, d, { steps: 8 })
    expect(await storedStrokes(page, 'trip')).toHaveLength(2)
    await expect(editor(page)).toBeVisible()

    // A new editor: the finger writes again.
    await page.keyboard.press('Escape')
    await openCard(page, 'trip', true)
    await touch.drag(c, d, { steps: 8 })
    expect(await storedStrokes(page, 'trip')).toHaveLength(3)
  })

  test('pens: choose Lápiz 3 with the finger, write with a finger and a pen, and come back from the eraser (#51)', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [trip] })
    await openCard(page, 'trip', true)
    await editor(page).getByRole('button', { name: 'A mano' }).tap()
    const touch = await Touch.on(page)
    const pen = await Pen.on(page)
    const red = { color: '#d0443a', size: 7 }

    await penButton(page, 'Lápiz 3').tap()
    await expect(penButton(page, 'Lápiz 3')).toHaveAttribute('aria-pressed', 'true')
    const [a, b] = await inBox(page, [[0.1, 0.3], [0.5, 0.3]])
    await touch.drag(a, b, { steps: 8 })
    await pen.stroke(await inBox(page, [[0.1, 0.5], [0.5, 0.5]]), { pressure: 0.7 })
    let ink = (await storedInk(page, 'trip'))!
    expect(ink.styles).toEqual([red, red])
    expect(ink.strokes[1].filter((_, i) => i % 3 === 2)).toContain(70)

    const eraser = editor(page).getByRole('button', { name: 'Borrador' })
    await eraser.tap()
    await penButton(page, 'Tinta').tap()
    await expect(eraser).toHaveAttribute('aria-pressed', 'false')
    await pen.stroke(await inBox(page, [[0.1, 0.8], [0.5, 0.8]]))
    ink = (await storedInk(page, 'trip'))!
    expect(ink.strokes).toHaveLength(3)
    expect(ink.styles).toEqual([red, red, { color: null, size: 7 }])
    expect(await strokeFills(inkBox(page))).toEqual(['#d0443a', '#d0443a', null])
  })

  test('with the setting on, a handwritten Card still moves with press and hold, and the Desk still pinches', async ({ page }) => {
    await handwritingOn(page)
    await seedDesk(page, { cards: [handwritten] })
    const touch = await Touch.on(page)
    const from = await center(deskCard(page, 'hand'))

    await touch.drag(from, { x: from.x + 100, y: from.y + 150 }, { holdMs: 450 })
    const after = await center(deskCard(page, 'hand'))
    expect(after.x - from.x).toBeCloseTo(100, -1)
    expect(after.y - from.y).toBeCloseTo(150, -1)
    const saved = (await storedData(page)).cards[0]
    expect(saved.position.y).toBeGreaterThan(300)
    expect(saved.ink).toEqual(handwritten.ink)

    const before = await deskScale(page)
    await touch.pinch(await emptyPaper(page), 100, 200)
    await wait(200)
    expect(await deskScale(page)).toBeGreaterThan(before * 1.5)
  })
})
