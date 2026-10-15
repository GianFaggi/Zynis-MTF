import { expect, test, type Page } from '@playwright/test'
import { Touch, card, center, deskCard, openApp, seedDesk, storedData, waitForDesk } from './helpers.ts'

test.use({ locale: 'es-AR' })

// The Welcome Card (#20). Its id is a fresh uuid, so tests find it in the stored data by its title.

const TITLE = '¡Hola! Esto es MTF'
const ITEMS = ['Arrastrame a otro lugar (en el celu, mantené apretado y mové)', 'Tildá este ítem', 'Tildá todo y llevame al frasco']

/** Ids of the Welcome Cards on the Desk, as saved. */
async function welcomeIds(page: Page) {
  const { cards } = await storedData(page)
  return cards.filter((candidate) => candidate.title === TITLE && candidate.jarredAt === null).map((candidate) => candidate.id)
}

async function theWelcomeCard(page: Page) {
  const ids = await welcomeIds(page)
  expect(ids).toHaveLength(1)
  return { id: ids[0], element: deskCard(page, ids[0]) }
}

/** Near its top edge, on the title: never on an Item box, which does not start a drag. */
async function grip(page: Page, id: string) {
  const box = (await deskCard(page, id).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + Math.min(20, box.height / 3) }
}

const jar = (page: Page) => page.locator('[data-jar=""]')
const counter = (page: Page) => page.getByRole('button', { name: /^Mis logros/ })
const toast = (page: Page) => page.getByRole('status')

/** "Ver todo", so the Card and the Jar are both on screen (the desktop window then shows the far look). */
async function showWholeDesk(page: Page) {
  await page.getByRole('navigation', { name: 'Áreas' }).getByRole('button', { name: 'Ver todo' }).click()
  await page.waitForTimeout(700)
}

async function dropOnJar(page: Page, id: string) {
  const start = await grip(page, id)
  const [from, to] = [await center(deskCard(page, id)), await center(jar(page))]
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + to.x - from.x, start.y + to.y - from.y, { steps: 15 })
  await page.mouse.up()
}

test('a first launch shows the Welcome Card, readable, with three unchecked Items; a reload keeps that one', async ({ page, isMobile }) => {
  await openApp(page, { welcome: true })
  const { id, element } = await theWelcomeCard(page)
  const world = page.locator('[data-desk-world]')

  await expect(world).not.toHaveAttribute('data-far')
  await expect(element).toBeInViewport({ ratio: 1 })
  await expect(element).toContainText(TITLE)
  for (const text of ITEMS) await expect(element.getByRole('button', { name: text })).toHaveAttribute('aria-pressed', 'false')

  await page.reload()
  await waitForDesk(page)
  await expect(deskCard(page, id)).toBeAttached()
  expect(await welcomeIds(page)).toEqual([id])
  // The usual first view again: on the desktop window, the whole Desk in the far look.
  if (!isMobile) await expect(world).toHaveAttribute('data-far', '')
})

test('a device already in use gets one Welcome Card on top of its own Cards, and keeps them as they were', async ({ page }) => {
  const own = card({ id: 'own', title: 'Viaje', position: { x: 400, y: 500, z: 5 } })
  await seedDesk(page, { cards: [own] }, { welcome: true })

  const { id } = await theWelcomeCard(page)
  const { cards } = await storedData(page)
  expect(cards).toHaveLength(2)
  expect(cards.find((candidate) => candidate.id === 'own')).toEqual(own)
  expect(cards.find((candidate) => candidate.id === id)).toMatchObject({ areaId: 'a1', position: { z: 6 } })
})

test('deleted, it does not come back after a reload', async ({ page, isMobile }) => {
  await openApp(page, { welcome: true })
  const { element } = await theWelcomeCard(page)

  if (isMobile) await element.getByRole('heading', { name: TITLE }).tap()
  else await element.getByRole('heading', { name: TITLE }).click()
  const editor = page.getByRole('dialog')
  await editor.getByRole('button', { name: 'Borrar' }).click()
  await editor.getByRole('button', { name: '¿Borrar? Tocá otra vez' }).click()
  expect(await welcomeIds(page)).toEqual([])

  await page.reload()
  await expect(page.locator('[data-area-label]').first()).toBeVisible()
  expect((await storedData(page)).cards).toEqual([])
})

test('Settings → "Ver introducción" places a new Welcome Card and shows it', async ({ page }) => {
  await openApp(page)
  expect((await storedData(page)).cards).toEqual([])

  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.getByRole('button', { name: 'Ver introducción' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  const { element } = await theWelcomeCard(page)
  await page.waitForTimeout(700)
  await expect(element).toBeInViewport()
  await expect(page.locator('[data-desk-world]')).not.toHaveAttribute('data-far')
})

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse')

  test('dropped on the Jar with its Items unchecked, it is refused with "Todavía no"', async ({ page }) => {
    await openApp(page, { welcome: true })
    const { id } = await theWelcomeCard(page)
    await showWholeDesk(page)

    await dropOnJar(page, id)

    await expect(toast(page)).toHaveText('Todavía noTe faltan 3 elementos')
    expect(await welcomeIds(page)).toEqual([id])
  })

  test('checking its three Items counts 4 Wins, and then the Jar takes it', async ({ page }) => {
    await openApp(page, { welcome: true })
    const { id, element } = await theWelcomeCard(page)
    await expect(counter(page)).toHaveAccessibleName('Mis logros: 0 cosas hechas en 7 días')

    for (const text of ITEMS) await element.getByRole('button', { name: text }).click()
    await expect(counter(page)).toHaveAccessibleName('Mis logros: 4 cosas hechas en 7 días')

    await showWholeDesk(page)
    await dropOnJar(page, id)

    await expect(deskCard(page, id)).toHaveCount(0)
    await expect(toast(page)).toContainText('¡Al frasco!')
    await expect(counter(page)).toHaveAccessibleName('Mis logros: 4 cosas hechas en 7 días')
    const { events } = await storedData(page)
    expect(events.map((event) => event.type).sort()).toEqual(['card', 'item', 'item', 'item'])
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch')

  test('press and hold, then drag, moves it and checks none of its Items', async ({ page }) => {
    await openApp(page, { welcome: true })
    const { id } = await theWelcomeCard(page)
    const before = (await storedData(page)).cards[0].position
    const touch = await Touch.on(page)

    const from = await grip(page, id)
    await touch.drag(from, { x: from.x + 60, y: from.y + 220 }, { holdMs: 450 })

    const [moved] = (await storedData(page)).cards
    expect(moved.position.y).toBeGreaterThan(before.y + 100)
    expect(moved.items.map((item) => item.done)).toEqual([false, false, false])
  })
})
