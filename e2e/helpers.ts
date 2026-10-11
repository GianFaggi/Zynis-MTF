import { expect, type CDPSession, type Locator, type Page } from '@playwright/test'
import type { Area, Card, MtfData } from '../src/types/index.ts'

// Shared e2e helpers (KB/frontend/testing.md). Tests seed `mtf_data` directly and
// reload, so each one starts from a known Desk. The first-run hint is marked as seen
// unless a test asks for it, so it never covers a gesture.

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

/** Opens MTF, waits for the Desk's first view and its fonts. */
export async function openApp(page: Page, { hintSeen = true } = {}) {
  await page.goto('/')
  if (hintSeen) {
    await page.evaluate(() => localStorage.setItem('mtf_hint_seen', '1'))
    await page.reload()
  }
  await waitForDesk(page)
}

/** Opens MTF over a stored document (default Areas a1–a3 unless given). */
export async function seedDesk(page: Page, data: Partial<MtfData>, { hintSeen = true } = {}) {
  const doc: MtfData = { schemaVersion: 1, areas: AREAS, cards: [], events: [], ...data }
  await page.goto('/')
  await page.evaluate(
    ({ doc, hintSeen }) => {
      localStorage.setItem('mtf_data', JSON.stringify(doc))
      if (hintSeen) localStorage.setItem('mtf_hint_seen', '1')
    },
    { doc, hintSeen },
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

export async function center(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** The world transform scale, read from the DOM. */
export function deskScale(page: Page): Promise<number> {
  return page.locator('[data-desk-world]').evaluate((world) => new DOMMatrix(getComputedStyle(world).transform).a)
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
