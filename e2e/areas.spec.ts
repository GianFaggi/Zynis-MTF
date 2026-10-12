import { expect, test, type Page } from '@playwright/test'
import type { MtfData } from '../src/types/index.ts'
import { Touch, areaLabel, card, center, deskCard, deskScale, seedDesk, storedData, wait, zoomInIfFar } from './helpers.ts'

test.use({ locale: 'es-AR' })

// Areas the user shapes (#7): move by the label, resize by the corner handle, never
// overlapping; create, rename and delete from Settings.

const note = card({ id: 'note', areaId: 'a3', title: 'Llamar a Juan', position: { x: 2300, y: 400, tilt: 1, z: 2 } })
/** A Vida Card left outside every Area, right where Recordar ends up after a 600 px move. */
const stray = card({ id: 'stray', areaId: 'a2', title: 'Suelta', position: { x: 3400, y: 600, tilt: 0, z: 1 } })
const work = card({ id: 'work', areaId: 'a1', title: 'Informe', position: { x: 200, y: 300, tilt: 0, z: 3 } })

function areaWrapper(page: Page, id: string) {
  return page.locator(`[data-area-id="${id}"]`)
}

function storedArea(data: MtfData, id: string) {
  return data.areas.find((area) => area.id === id)!
}

function storedCard(data: MtfData, id: string) {
  return data.cards.find((candidate) => candidate.id === id)!
}

async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 15 })
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse')

  test('dragging Recordar by its label moves it with its Cards, leaves other Cards alone, and survives a reload', async ({ page }) => {
    await seedDesk(page, { cards: [note, stray] })
    const s = await deskScale(page)
    const from = await center(areaLabel(page, 'Recordar'))
    const noteBefore = await center(deskCard(page, 'note'))

    await mouseDrag(page, from, { x: from.x + 600 * s, y: from.y })
    await expect(areaWrapper(page, 'a3')).toHaveAttribute('data-lifted', '')
    await expect(areaWrapper(page, 'a3')).not.toHaveAttribute('data-blocked')
    await page.mouse.up()

    await expect(areaWrapper(page, 'a3')).not.toHaveAttribute('data-lifted')
    const data = await storedData(page)
    expect(storedArea(data, 'a3').rect.x).toBeCloseTo(2800, -1)
    expect(storedArea(data, 'a3').rect.y).toBe(120)
    const moved = storedCard(data, 'note')
    expect(moved.areaId).toBe('a3')
    expect(moved.position.x - note.position.x).toBe(storedArea(data, 'a3').rect.x - 2200)
    expect(moved.position).toMatchObject({ y: 400, tilt: 1, z: 2 })
    expect(storedCard(data, 'stray')).toMatchObject({ areaId: 'a2', position: stray.position })
    expect((await center(deskCard(page, 'note'))).x - noteBefore.x).toBeCloseTo(600 * s, -1)

    await page.reload()
    await expect(areaLabel(page, 'Recordar')).toBeVisible()
    expect(storedArea(await storedData(page), 'a3').rect).toEqual(storedArea(data, 'a3').rect)
  })

  test('Recordar dropped over Vida shows the warning, slides back with its Cards, saves nothing and says why', async ({ page }) => {
    await seedDesk(page, { cards: [note] })
    const s = await deskScale(page)
    const from = await center(areaLabel(page, 'Recordar'))
    const noteBefore = await center(deskCard(page, 'note'))

    await mouseDrag(page, from, { x: from.x - 600 * s, y: from.y })
    await expect(areaWrapper(page, 'a3')).toHaveAttribute('data-blocked', '')
    await page.mouse.up()

    await expect(page.getByRole('status')).toHaveText(/Ahí hay otra área/)
    await expect(areaWrapper(page, 'a3')).not.toHaveAttribute('data-returning')
    expect(await center(areaLabel(page, 'Recordar'))).toEqual(from)
    expect(await center(deskCard(page, 'note'))).toEqual(noteBefore)
    const data = await storedData(page)
    expect(storedArea(data, 'a3').rect.x).toBe(2200)
    expect(storedCard(data, 'note').position).toEqual(note.position)
  })

  test('the resize handle grows Vida, moves no Card, and stops at 520 × 520', async ({ page }) => {
    const life = card({ id: 'life', areaId: 'a2', title: 'Viaje', position: { x: 1300, y: 400 } })
    await seedDesk(page, { cards: [life] })
    const handle = page.locator('[data-area-resize="a2"]')
    await expect(handle).toBeHidden() // far zoom: no handle
    await page.getByRole('navigation', { name: 'Áreas' }).getByRole('button', { name: 'Vida' }).click()
    await page.waitForTimeout(700)
    // Zoom in around Vida's bottom-right corner (the wrapper sits at its top-left), so the handle stays on screen.
    const origin = (await areaWrapper(page, 'a2').boundingBox())!
    const far = await deskScale(page)
    await zoomInIfFar(page, { x: origin.x + 980 * far, y: origin.y + 1000 * far })
    await expect(handle).toBeInViewport()
    const s = await deskScale(page)

    const from = await center(handle)
    await mouseDrag(page, from, { x: from.x, y: from.y + 80 })
    await page.mouse.up()
    let vida = storedArea(await storedData(page), 'a2')
    expect(vida.rect).toMatchObject({ x: 1140, y: 120, w: 980 })
    expect(vida.rect.h).toBeCloseTo(1000 + 80 / s, -1)
    expect(storedCard(await storedData(page), 'life').position).toEqual(life.position)

    const grown = await center(handle)
    await mouseDrag(page, grown, { x: 5, y: 5 })
    await page.mouse.up()
    vida = storedArea(await storedData(page), 'a2')
    expect(vida.rect).toEqual({ x: 1140, y: 120, w: 520, h: 520 })
  })

  test('a quick click on a label still flies to the Area and moves nothing', async ({ page }) => {
    await seedDesk(page, {})
    await page.getByRole('navigation', { name: 'Áreas' }).getByRole('button', { name: 'Trabajo' }).click()
    await page.waitForTimeout(700)
    const before = await center(areaLabel(page, 'Vida'))

    await areaLabel(page, 'Vida').click()
    await page.waitForTimeout(700)

    expect(await center(areaLabel(page, 'Vida'))).not.toEqual(before)
    expect(storedArea(await storedData(page), 'a2').rect.x).toBe(1140)
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  // The phone's first view shows Trabajo's top-left corner, so these use Trabajo.

  test('press and hold a label, then drag, moves the Area and its Cards', async ({ page }) => {
    await seedDesk(page, { cards: [work] })
    const touch = await Touch.on(page)
    const s = await deskScale(page)
    const from = await center(areaLabel(page, 'Trabajo'))

    await touch.drag(from, { x: from.x + 40, y: from.y + 150 }, { holdMs: 450 })

    const data = await storedData(page)
    expect(storedArea(data, 'a1').rect.y - 120).toBeCloseTo(150 / s, -1)
    expect(storedCard(data, 'work').position.y - work.position.y).toBe(storedArea(data, 'a1').rect.y - 120)
  })

  test('a quick swipe over a label pans the Desk and leaves the Area in place', async ({ page }) => {
    await seedDesk(page, { cards: [work] })
    const touch = await Touch.on(page)
    const from = await center(areaLabel(page, 'Trabajo'))

    await touch.drag(from, { x: from.x, y: from.y + 150 })

    expect((await center(areaLabel(page, 'Trabajo'))).y).toBeGreaterThan(from.y + 100)
    expect(storedArea(await storedData(page), 'a1').rect).toEqual({ x: 80, y: 120, w: 980, h: 1000 })
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('a second finger during a move puts the Area and its Cards back and zooms instead', async ({ page }) => {
    await seedDesk(page, { cards: [work] })
    const touch = await Touch.on(page)
    const start = await center(areaLabel(page, 'Trabajo'))
    const scale = await deskScale(page)

    await touch.send('touchStart', [start])
    await wait(450)
    const lifted = { x: start.x + 20, y: start.y + 120 }
    await touch.send('touchMove', [lifted])
    await expect(areaWrapper(page, 'a1')).toHaveAttribute('data-lifted', '')

    const second = { x: lifted.x + 120, y: lifted.y }
    await touch.send('touchStart', [lifted, second])
    await expect(areaWrapper(page, 'a1')).not.toHaveAttribute('data-lifted')
    expect(await deskCard(page, 'work').evaluate((element) => element.style.translate)).toBe('')
    await touch.send('touchMove', [lifted, { x: second.x + 150, y: second.y }])
    await touch.send('touchEnd', [])

    expect(await deskScale(page)).toBeGreaterThan(scale * 1.3)
    const data = await storedData(page)
    expect(storedArea(data, 'a1').rect).toEqual({ x: 80, y: 120, w: 980, h: 1000 })
    expect(storedCard(data, 'work').position).toEqual(work.position)
  })
})

test('create "Facu", put a Card in it, then delete it choosing Trabajo: the Card and the things-done count stay', async ({ page }) => {
  await seedDesk(page, {})
  const dock = page.getByRole('navigation', { name: 'Áreas' })
  const counter = page.getByRole('button', { name: /^Mis logros/ })

  // Create: Settings closes, the editor opens with the provisional name selected.
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'Nueva área' }).click()
  const editor = page.getByRole('dialog', { name: 'Área' })
  await expect(editor).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeHidden()
  await expect(editor.getByRole('textbox', { name: 'Nombre' })).toBeFocused()
  await page.keyboard.type('Facu')
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(editor).toBeHidden()
  await expect(dock.getByRole('button', { name: 'Facu' })).toBeVisible()
  await expect(areaLabel(page, 'Facu')).toBeInViewport()
  const facu = (await storedData(page)).areas[3]
  expect(facu).toMatchObject({ name: 'Facu', rect: { x: 80, y: 1280 } })

  // A Card in the middle of the view lands in Facu; checking its only Item finishes it: 2 things done.
  await page.getByRole('button', { name: 'Nueva tarjeta' }).click()
  const cardEditor = page.getByRole('dialog', { name: 'Tarjeta' })
  await page.keyboard.type('Apuntes')
  await cardEditor.getByRole('button', { name: 'Añadir elemento' }).click()
  await page.keyboard.type('Leer capítulo 3')
  await cardEditor.getByRole('button', { name: 'Leer capítulo 3' }).click()
  await cardEditor.getByRole('button', { name: 'Guardar' }).click()
  const [written] = (await storedData(page)).cards
  expect(written.areaId).toBe(facu.id)
  await expect(counter).toHaveAccessibleName(/: 2 cosas hechas/)

  // Delete Facu from Settings, sending its Card to Trabajo.
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('button', { name: 'Facu' }).click()
  await editor.getByRole('button', { name: 'Borrar área' }).click()
  await editor.getByRole('combobox', { name: 'Su tarjeta pasa a' }).selectOption({ label: 'Trabajo' })
  await editor.getByRole('button', { name: 'Borrar', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(page.getByRole('status')).toHaveText(/Área borrada.*1 tarjeta pasó a Trabajo/)
  await expect(dock.getByRole('button', { name: 'Facu' })).toHaveCount(0)
  await expect(areaLabel(page, 'Trabajo')).toHaveAccessibleName('Trabajo, 1 tarjeta')
  await expect(counter).toHaveAccessibleName(/: 2 cosas hechas/)

  await page.reload()
  const data = await storedData(page)
  expect(data.areas.map((area) => area.id)).toEqual(['a1', 'a2', 'a3'])
  expect(storedCard(data, written.id).areaId).toBe('a1')
  await expect(areaLabel(page, 'Trabajo')).toHaveAccessibleName('Trabajo, 1 tarjeta')
  await expect(counter).toHaveAccessibleName(/: 2 cosas hechas/)
})
