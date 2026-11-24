import { expect, type CDPSession, type Locator, type Page } from '@playwright/test'
import type { Area, Card, MtfData } from '../src/types/index.ts'

// Shared e2e helpers (KB/frontend/testing.md). Tests seed `mtf_data` directly and
// reload, so each one starts from a known Desk. The Welcome Card is marked as placed
// unless a test asks for it, so no extra Card sits on the Desk.

export const AREAS: Area[] = [
  { id: 'a1', key: 'work', color: 'sage', rect: { x: 80, y: 120, w: 980, h: 1000 }, createdAt: 1, updatedAt: 1 },
  { id: 'a2', key: 'life', color: 'sand', rect: { x: 1140, y: 120, w: 980, h: 1000 }, createdAt: 1, updatedAt: 1 },
  { id: 'a3', key: 'remember', color: 'sky', rect: { x: 2200, y: 120, w: 980, h: 1000 }, createdAt: 1, updatedAt: 1 },
]

type CardInput = Partial<Omit<Card, 'position'>> & Pick<Card, 'id'> & { position?: Partial<Card['position']> }

export function card({ position, ...rest }: CardInput): Card {
  return {
    areaId: 'a1',
    title: '',
    body: '',
    items: [],
    pinned: false,
    jarredAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...rest,
    position: { x: 0, y: 0, tilt: 0, z: 1, ...position },
  }
}

/**
 * Marks the Welcome Card as already placed before any page script runs. It must come
 * before the first `goto`: by the time a later write lands, that first load has already
 * saved a Welcome Card in `mtf_data`. Only the flag, never the data, so reloads stay safe.
 */
async function skipWelcome(page: Page) {
  await page.addInitScript(() => localStorage.setItem('mtf_welcome_placed', '1'))
}

/** Opens MTF, waits for the Desk's first view and its fonts. A blank Desk unless `welcome`. */
export async function openApp(page: Page, { welcome = false } = {}) {
  if (!welcome) await skipWelcome(page)
  await page.goto('/')
  await waitForDesk(page)
}

/** Opens MTF over a stored document (default Areas a1–a3 unless given). With `welcome`, as a device that never had its Welcome Card. */
export async function seedDesk(page: Page, data: Partial<MtfData>, { welcome = false } = {}) {
  const doc: MtfData = { schemaVersion: 1, areas: AREAS, cards: [], events: [], ...data }
  if (!welcome) await skipWelcome(page)
  await page.goto('/')
  await page.evaluate(
    ({ doc, welcome }) => {
      localStorage.setItem('mtf_data', JSON.stringify(doc))
      // The first load placed a Welcome Card on a blank Desk; forget it, so the seeded Desk gets its own.
      if (welcome) localStorage.removeItem('mtf_welcome_placed')
    },
    { doc, welcome },
  )
  await page.reload()
  await waitForDesk(page)
}

export async function waitForDesk(page: Page) {
  // The world div itself has no size (everything in it is absolutely placed).
  await expect(page.locator('[data-area-label]').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  // The first view is set after the fonts; let it reach the DOM.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

export function areaLabel(page: Page, name: string): Locator {
  return page.locator('[data-area-label]', { hasText: name })
}

export function deskCard(page: Page, id: string): Locator {
  return page.locator(`[data-card-id="${id}"]`)
}

/** The stored document, as the app saved it. */
export function storedData(page: Page): Promise<MtfData> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('mtf_data')!))
}

/** A screen point on empty paper: not on a Card, a label or a control. */
export async function emptyPaper(page: Page) {
  const viewport = page.viewportSize()!
  const point = { x: Math.round(viewport.width * 0.6), y: Math.round(viewport.height * 0.6) }
  const onPaper = await page.evaluate(
    ({ x, y }) => !document.elementFromPoint(x, y)?.closest('[data-card-id], [data-area-label], button'),
    point,
  )
  expect(onPaper).toBe(true)
  return point
}

export async function center(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** The world transform scale, read from the DOM. */
export function deskScale(page: Page): Promise<number> {
  return page.locator('[data-desk-world]').evaluate((world) => new DOMMatrix(getComputedStyle(world).transform).a)
}

/**
 * Mouse only: Ctrl + wheel around `at` until the Desk shows the near look (Cards in
 * full, the Area edit buttons and resize handles). Desktop opens zoomed out.
 */
export async function zoomInIfFar(page: Page, at: { x: number; y: number }) {
  while ((await deskScale(page)) < 0.6) {
    await page.mouse.move(at.x, at.y)
    await page.keyboard.down('Control')
    await page.mouse.wheel(0, -20)
    await page.keyboard.up('Control')
    await page.waitForTimeout(200)
  }
}

/**
 * Real touch input through the Chrome DevTools Protocol: Playwright has no touch
 * drag or pinch API. Both e2e projects run Chromium, and the phone project emulates
 * a touch screen, so Chrome turns these into touch and pointer events.
 */
export class Touch {
  private readonly cdp: CDPSession

  private constructor(cdp: CDPSession) {
    this.cdp = cdp
  }

  static async on(page: Page) {
    return new Touch(await page.context().newCDPSession(page))
  }

  /** Every finger currently down; Chrome works out which ones started, moved or lifted. */
  send(type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number }[]) {
    return this.cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((point, id) => ({ x: Math.round(point.x), y: Math.round(point.y), id })),
    })
  }

  /** One finger from `from` to `to`, optionally holding still first. */
  async drag(from: { x: number; y: number }, to: { x: number; y: number }, { holdMs = 0, steps = 12 } = {}) {
    await this.send('touchStart', [from])
    if (holdMs) await new Promise((resolve) => setTimeout(resolve, holdMs))
    for (let step = 1; step <= steps; step++) {
      const t = step / steps
      await this.send('touchMove', [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }])
    }
    await this.send('touchEnd', [])
  }

  /** Two fingers around `at`, moving from `startGap` to `endGap` px apart. */
  async pinch(at: { x: number; y: number }, startGap: number, endGap: number, steps = 10) {
    const fingers = (gap: number) => [
      { x: at.x - gap / 2, y: at.y },
      { x: at.x + gap / 2, y: at.y },
    ]
    await this.send('touchStart', fingers(startGap))
    for (let step = 1; step <= steps; step++) await this.send('touchMove', fingers(startGap + ((endGap - startGap) * step) / steps))
    await this.send('touchEnd', [])
  }
}

/**
 * A pen through the Chrome DevTools Protocol (#47): Playwright has no pen API, but CDP's
 * `Input.dispatchMouseEvent` takes `pointerType: 'pen'` and a `force` (0–1), which Chrome
 * delivers as pointer events with `pointerType` "pen" and that `pressure`.
 */
export class Pen {
  private readonly cdp: CDPSession

  private constructor(cdp: CDPSession) {
    this.cdp = cdp
  }

  static async on(page: Page) {
    return new Pen(await page.context().newCDPSession(page))
  }

  private send(type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', point: { x: number; y: number }, force: number) {
    return this.cdp.send('Input.dispatchMouseEvent', {
      type,
      x: Math.round(point.x),
      y: Math.round(point.y),
      button: 'left',
      buttons: type === 'mouseReleased' ? 0 : 1,
      clickCount: type === 'mouseMoved' ? 0 : 1,
      force: type === 'mouseReleased' ? 0 : force,
      pointerType: 'pen',
    })
  }

  /** The pen down at the first point, through the others, and up at the last one. */
  async stroke(points: { x: number; y: number }[], { pressure = 0.5 } = {}) {
    await this.send('mouseMoved', points[0], 0)
    await this.send('mousePressed', points[0], pressure)
    for (const point of points.slice(1)) await this.send('mouseMoved', point, pressure)
    await this.send('mouseReleased', points.at(-1)!, 0)
  }
}

/**
 * Exports through Settings (in Spanish) and returns the downloaded file's name and path. Desktop
 * only: on the phone project Export opens the share sheet, which Chromium cannot drive.
 */
export async function exportBackup(page: Page) {
  await page.getByRole('button', { name: 'Ajustes' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar copia' }).click()
  const file = await download
  await expect(page.getByRole('status')).toContainText('Copia lista')
  await page.keyboard.press('Escape')
  return { name: file.suggestedFilename(), path: (await file.path())! }
}

/** Imports a Backup file through Settings (in Spanish), confirming the replacement. */
export async function importBackup(page: Page, path: string) {
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await page.locator('input[type="file"]').setInputFiles(path)
  await page.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeHidden()
  await expect(page.getByRole('status')).toContainText('Copia importada')
}

/** A Card's resolved Area color (`--b`), to compare with `cssColor(page, 'sand')`. */
export function cardColor(page: Page, id: string): Promise<string> {
  return deskCard(page, id).evaluate((element) => getComputedStyle(element).getPropertyValue('--b').trim())
}

export function cssColor(page: Page, color: string): Promise<string> {
  return page.evaluate((color) => getComputedStyle(document.documentElement).getPropertyValue(`--color-${color}`).trim(), color)
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
