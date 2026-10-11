import { expect, test } from '@playwright/test'
import { AREAS, areaLabel, card, center, seedDesk, storedData } from './helpers.ts'

test.use({ locale: 'es-AR' })

// Cards scattered in a heap, partly over each other, some far from their Area.
const heap = [
  card({ id: 'w1', areaId: 'a1', title: 'Ideas para el sprint', body: 'Exportar a PDF y modo oscuro.', pinned: true, position: { x: 300, y: 400 } }),
  card({ id: 'w2', areaId: 'a1', title: 'Preguntarle a Juan', body: 'Deploy del viernes\nPresupuesto Q4', position: { x: 330, y: 420 } }),
  card({ id: 'w3', areaId: 'a1', title: 'Notas del standup', position: { x: 2600, y: 500 } }),
  card({ id: 'l1', areaId: 'a2', title: 'Viaje a Córdoba', body: 'Salimos el viernes.', position: { x: 1300, y: 500 } }),
  card({ id: 'l2', areaId: 'a2', title: 'Libros', body: 'Proyecto Hail Mary\nEl infinito en un junco', position: { x: 1310, y: 510 } }),
  card({ id: 'r1', areaId: 'a3', title: 'Wifi del depto', position: { x: -400, y: 2000 } }),
]

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

test('Tidy up leaves no two Cards overlapping and keeps every Card in its Area, also after a reload', async ({ page }) => {
  await seedDesk(page, { cards: heap })
  await page.getByRole('button', { name: 'Ordenar' }).click()
  await page.waitForTimeout(700) // the tidy animation

  for (const phase of ['tidied', 'reloaded']) {
    if (phase === 'reloaded') await page.reload()
    const { cards } = await storedData(page)
    expect(cards.map((c) => [c.id, c.areaId])).toEqual(heap.map((c) => [c.id, c.areaId]))
    for (const c of cards) {
      const area = AREAS.find((a) => a.id === c.areaId)!.rect
      expect(c.position.x).toBeGreaterThan(area.x)
      expect(c.position.x + 236).toBeLessThan(area.x + area.w)
    }
    // Measured in the near look, rotated boxes included: none overlap.
    while ((await page.locator('[data-desk-world][data-far]').count()) > 0) {
      await page.mouse.move(600, 400)
      await page.keyboard.down('Control')
      await page.mouse.wheel(0, -20)
      await page.keyboard.up('Control')
      await page.waitForTimeout(200)
    }
    const rects = await page.locator('[data-card-id]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()))
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i], rects[j])).toBe(false)
  }
})

test('the pinned Card comes first in its Area after Tidy up', async ({ page }) => {
  await seedDesk(page, { cards: heap })
  await page.getByRole('button', { name: 'Ordenar' }).click()
  const { cards } = await storedData(page)
  const w1 = cards.find((c) => c.id === 'w1')!.position
  const others = cards.filter((c) => c.areaId === 'a1' && c.id !== 'w1').map((c) => c.position)
  expect(others.every((p) => p.x > w1.x || p.y > w1.y)).toBe(true)
})

test('tapping an Area label flies to it', async ({ page, isMobile }) => {
  await seedDesk(page, {})
  const label = areaLabel(page, 'Vida')
  if (isMobile) {
    // On a phone the first view shows Trabajo; bring Vida's label on screen with See all first.
    await page.getByRole('button', { name: 'Ver todo' }).click()
    await page.waitForTimeout(700)
  }
  const before = await center(label)
  if (isMobile) await label.tap()
  else await label.click()
  await page.waitForTimeout(700)

  const after = await center(label)
  const viewport = page.viewportSize()!
  expect(after).not.toEqual(before)
  expect(after.x).toBeGreaterThan(0)
  expect(after.x).toBeLessThan(viewport.width)
  expect(after.y).toBeLessThan(viewport.height / 2)
})

test('the Dock flies to an Area and See all shows a far-away Card', async ({ page }) => {
  // Far outside every Area, yet within what 8% zoom can show on a 412 px phone.
  const lost = card({ id: 'lost', areaId: 'a3', title: 'Perdida', position: { x: 4200, y: 2600 } })
  await seedDesk(page, { cards: [lost] })
  await page.getByRole('navigation', { name: 'Áreas' }).getByRole('button', { name: 'Recordar' }).click()
  await page.waitForTimeout(700)
  await expect(areaLabel(page, 'Recordar')).toBeInViewport()

  await page.getByRole('button', { name: 'Ver todo' }).click()
  await page.waitForTimeout(700)
  await expect(page.locator('[data-card-id="lost"]')).toBeInViewport()
  await expect(areaLabel(page, 'Trabajo')).toBeInViewport()
})

test('search: Enter brings a far-away matching Card into view; closing restores every Card', async ({ page }) => {
  const song = card({ id: 'song', areaId: 'a3', title: 'Canción para Caro', position: { x: 3000, y: 1900 } })
  const other = card({ id: 'other', areaId: 'a1', title: 'Auto', position: { x: 200, y: 300 } })
  await seedDesk(page, { cards: [song, other] })
  await page.getByRole('navigation', { name: 'Áreas' }).getByRole('button', { name: 'Trabajo' }).click()
  await page.waitForTimeout(700)
  await expect(page.locator('[data-card-id="song"]')).not.toBeInViewport()

  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('searchbox', { name: 'Buscar en tus tarjetas' }).fill('cancion')
  await expect(page.locator('[data-card-id="other"]')).toHaveCSS('opacity', '0.18')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(700)
  await expect(page.locator('[data-card-id="song"]')).toBeInViewport()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('searchbox')).toBeHidden()
  await expect(page.locator('[data-card-id="other"]')).toHaveCSS('opacity', '1')
})
