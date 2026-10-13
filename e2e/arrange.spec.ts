import { expect, test, type Page } from '@playwright/test'
import type { Area, MtfData } from '../src/types/index.ts'
import { Touch, areaLabel, card, center, deskCard, deskScale, seedDesk, storedData, wait } from './helpers.ts'

test.use({ locale: 'es-AR' })

// Arranging the Areas (#18): Fila, Tabla, Estrella and Mi disposición from Settings,
// with mouse on the desktop project and touch on the phone project. Every step checks
// the stored rects, so it reads what the user would get after a reload.

const done = card({
  id: 'done',
  areaId: 'a2',
  title: 'Compras',
  items: [{ id: 'i1', text: 'Pan', done: true, createdAt: 1, updatedAt: 1 }],
  position: { x: 1250, y: 400 },
})
const note = card({ id: 'note', areaId: 'a3', title: 'Llamar a Juan', position: { x: 2300, y: 400 } })

type Rect = Area['rect']
type Point = { x: number; y: number }

function settings(page: Page) {
  return page.getByRole('dialog', { name: 'Ajustes' })
}

/** The slide (0.5 s) and the fly to the whole Desk (0.55 s), plus slack. */
function settle() {
  return wait(800)
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(settings(page)).toBeVisible()
}

/** Chooses an arrangement in Settings; with `confirm`, it expects the question and answers "Acomodar". */
async function arrange(page: Page, choice: string, { confirm = false } = {}) {
  await openSettings(page)
  await settings(page).getByRole('button', { name: choice, exact: true }).click()
  if (confirm) await settings(page).getByRole('button', { name: 'Acomodar', exact: true }).click()
  await expect(settings(page)).toBeHidden()
  await settle()
}

async function createArea(page: Page, name: string) {
  await openSettings(page)
  await settings(page).getByRole('button', { name: 'Nueva área' }).click()
  const editor = page.getByRole('dialog', { name: 'Área' })
  await expect(editor.getByRole('textbox', { name: 'Nombre' })).toBeFocused()
  await page.keyboard.type(name)
  await editor.getByRole('button', { name: 'Guardar' }).click()
  await expect(editor).toBeHidden()
}

/** A drag the way each project does it: press and hold on touch, a plain drag with the mouse. */
async function drag(page: Page, isMobile: boolean, from: Point, to: Point) {
  if (isMobile) {
    await (await Touch.on(page)).drag(from, to, { holdMs: 450 })
    return
  }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 15 })
  await page.mouse.up()
}

/** Moves an Area by its label, `by` Desk px. */
async function moveArea(page: Page, isMobile: boolean, name: string, by: Point) {
  const s = await deskScale(page)
  const from = await center(areaLabel(page, name))
  await drag(page, isMobile, from, { x: from.x + by.x * s, y: from.y + by.y * s })
  await settle()
}

function rects(data: MtfData): Rect[] {
  return data.areas.map((area) => area.rect)
}

function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function expectNoOverlap(all: Rect[]) {
  all.forEach((a, i) => all.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)))
}

/** Every Card on the Desk still has its center inside its own Area. */
function expectCardsInTheirAreas(data: MtfData) {
  for (const deskCard of data.cards.filter((candidate) => candidate.jarredAt === null)) {
    const { x, y, w, h } = data.areas.find((area) => area.id === deskCard.areaId)!.rect
    const point = { x: deskCard.position.x + 118, y: deskCard.position.y + 40 }
    expect(point.x > x && point.x < x + w && point.y > y && point.y < y + h, `${deskCard.id} inside its Area`).toBe(true)
  }
}

/** The Jar's rect in Desk coordinates, as drawn. */
function jarRect(page: Page): Promise<Rect> {
  return page.locator('[data-jar=""]').evaluate((jar: HTMLElement) => ({
    x: parseFloat(jar.style.left),
    y: parseFloat(jar.style.top),
    w: parseFloat(jar.style.width),
    h: parseFloat(jar.style.height),
  }))
}

test('Estrella, Tabla, Fila after a hand move, and Mi disposición, which survives a reload', async ({ page, isMobile }) => {
  await seedDesk(page, { cards: [done, note] })

  // Two new Areas take the free slots under Trabajo and Vida.
  await createArea(page, 'Facu')
  await createArea(page, 'Casa')
  let data = await storedData(page)
  expect(data.areas.map((area) => area.name ?? area.key)).toEqual(['work', 'life', 'remember', 'Facu', 'Casa'])

  // Estrella: a ring with Trabajo on top and the Jar in the middle, overlapping no Area.
  await arrange(page, 'Estrella')
  data = await storedData(page)
  expectNoOverlap(rects(data))
  expectCardsInTheirAreas(data)
  const centersY = rects(data).map((rect) => rect.y + rect.h / 2)
  expect(Math.min(...centersY)).toBe(centersY[0])
  const jar = await jarRect(page)
  const left = Math.min(...rects(data).map((rect) => rect.x))
  const right = Math.max(...rects(data).map((rect) => rect.x + rect.w))
  const bottom = Math.max(...rects(data).map((rect) => rect.y + rect.h))
  expect(Math.abs(jar.x + jar.w / 2 - (left + right) / 2)).toBeLessThanOrEqual(1)
  expect(jar.y + jar.h).toBeLessThan(bottom)
  for (const rect of rects(data)) expect(overlaps(rect, jar)).toBe(false)

  // The centered Jar still takes a finished Card.
  const box = (await deskCard(page, 'done').boundingBox())!
  const grip = { x: box.x + box.width / 2, y: box.y + Math.min(20, box.height / 3) }
  const [from, to] = [await center(deskCard(page, 'done')), await center(page.locator('[data-jar=""]'))]
  await drag(page, isMobile, grip, { x: grip.x + to.x - from.x, y: grip.y + to.y - from.y })
  await expect(deskCard(page, 'done')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('¡Al frasco!')

  // Tabla: five Areas in three columns, 3 + 2, in Settings order, with their Cards.
  await arrange(page, 'Tabla')
  data = await storedData(page)
  expect(rects(data).map(({ x, y }) => [x, y])).toEqual([
    [80, 120],
    [1140, 120],
    [2200, 120],
    [80, 1280],
    [1140, 1280],
  ])
  expectCardsInTheirAreas(data)

  // A hand move into the empty cell: now Fila asks first. Cancelar changes nothing.
  await moveArea(page, isMobile, 'Recordar', { x: 0, y: 1160 })
  const handMade = await storedData(page)
  expect(handMade.areas[2].rect.y).toBeGreaterThan(1200)
  await openSettings(page)
  await settings(page).getByRole('button', { name: 'Fila', exact: true }).click()
  await expect(settings(page).getByText('Tu disposición actual no está guardada. ¿Acomodar igual?')).toBeVisible()
  await settings(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(settings(page).getByRole('button', { name: 'Fila', exact: true })).toBeVisible()
  expect(await storedData(page)).toEqual(handMade)
  await page.keyboard.press('Escape')

  // Acomodar arranges: one row, tops aligned.
  await arrange(page, 'Fila', { confirm: true })
  data = await storedData(page)
  expect(rects(data).map(({ x, y }) => [x, y])).toEqual([
    [80, 120],
    [1140, 120],
    [2200, 120],
    [3260, 120],
    [4320, 120],
  ])
  expectCardsInTheirAreas(data)

  // Save a hand-made arrangement, go to Estrella, then back to Mi disposición.
  await moveArea(page, isMobile, 'Trabajo', { x: 0, y: 1160 })
  const saved = await storedData(page)
  await openSettings(page)
  await expect(settings(page).getByRole('button', { name: 'Mi disposición' })).toBeDisabled()
  await settings(page).getByRole('button', { name: 'Guardar esta disposición' }).click()
  await expect(page.getByRole('status')).toHaveText('Disposición guardada')
  await expect(settings(page)).toBeVisible()
  await expect(settings(page).getByRole('button', { name: 'Mi disposición' })).toBeEnabled()
  await page.keyboard.press('Escape')

  await arrange(page, 'Estrella')
  expect(rects(await storedData(page))).not.toEqual(rects(saved))
  await arrange(page, 'Mi disposición')
  data = await storedData(page)
  expect(rects(data)).toEqual(rects(saved))
  expect(data.cards).toEqual(saved.cards.map((kept) => ({ ...kept, updatedAt: expect.any(Number) })))

  // After a reload the arrangement is still there: Fila, then Mi disposición, brings it back.
  await page.reload()
  await expect(areaLabel(page, 'Trabajo')).toBeVisible()
  await arrange(page, 'Fila')
  await arrange(page, 'Mi disposición')
  expect(rects(await storedData(page))).toEqual(rects(saved))
})
