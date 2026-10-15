import { describe, expect, it } from 'vitest'
import { makeCard, rowOfAreas } from '../test/fixtures'
import { welcomeCard } from '../welcome/welcomeCard'
import { jarBounds, jarRect } from '../wins/jarLayout'
import {
  CARD_WIDTH,
  FAR_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  areaView,
  cardView,
  clampScale,
  deskBounds,
  fitRect,
  initialView,
  randomTilt,
  toScreen,
  toWorld,
  welcomeView,
  zoomAt,
  type View,
} from './geometry'

const view = { x: -120, y: 45, s: 0.6 }
const noHeights = new Map<string, number>()

describe('toWorld / toScreen', () => {
  it('are inverse of each other', () => {
    const point = { x: 310, y: 742 }
    const back = toScreen(view, toWorld(view, point))
    expect(back.x).toBeCloseTo(point.x)
    expect(back.y).toBeCloseTo(point.y)
  })

  it('apply screen = world * s + (x, y)', () => {
    expect(toScreen(view, { x: 100, y: 100 })).toEqual({ x: -60, y: 105 })
  })
})

describe('clampScale', () => {
  it('keeps the scale between 8% and 180%', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE)
    expect(clampScale(5)).toBe(MAX_SCALE)
    expect(clampScale(0.7)).toBe(0.7)
  })
})

describe('zoomAt', () => {
  it('keeps the Desk point under the origin fixed on screen', () => {
    const origin = { x: 400, y: 300 }
    const before = toWorld(view, origin)
    const zoomed = zoomAt(view, origin, 1.5)
    const after = toWorld(zoomed, origin)

    expect(zoomed.s).toBeCloseTo(0.9)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('stops at both limits', () => {
    expect(zoomAt(view, { x: 0, y: 0 }, 0.001).s).toBe(MIN_SCALE)
    expect(zoomAt(view, { x: 0, y: 0 }, 1000).s).toBe(MAX_SCALE)
  })
})

describe('fitRect', () => {
  it('centers the rect between the top controls and the Dock', () => {
    const viewport = { w: 1000, h: 800 }
    const rect = { x: 500, y: 500, w: 400, h: 300 }
    const fitted = fitRect(rect, viewport)
    const center = toScreen(fitted, { x: 700, y: 650 })

    expect(center.x).toBeCloseTo(500)
    // Free band: from 70 px to 800 − 90 = 710 px → its middle is at 390.
    expect(center.y).toBeCloseTo(390)
    expect(fitted.s).toBe(1) // fits with room to spare, capped at 100%
  })

  it('shrinks a large rect so it fits', () => {
    const fitted = fitRect({ x: 0, y: 0, w: 3000, h: 1000 }, { w: 1000, h: 800 })
    expect(fitted.s).toBeCloseTo(1000 / 3060)
  })
})

describe('areaView', () => {
  const [work] = rowOfAreas()

  it('fits the whole Area on a wide screen', () => {
    expect(areaView(work, { w: 1440, h: 900 })).toEqual(fitRect(work.rect, { w: 1440, h: 900 }))
  })

  it('shows the top-left part at a readable scale on a phone', () => {
    const phone = areaView(work, { w: 412, h: 915 })
    expect(phone.s).toBeCloseTo(412 / 560)
    const corner = toScreen(phone, { x: work.rect.x + 60, y: work.rect.y + 10 })
    expect(corner.x).toBeCloseTo(12)
    expect(corner.y).toBeCloseTo(80)
  })

  it('never goes below 62% on a very narrow phone', () => {
    expect(areaView(work, { w: 320, h: 640 }).s).toBe(0.62)
  })
})

describe('deskBounds', () => {
  it('is the union of every Area and every Card on the Desk', () => {
    const cards = [
      makeCard({ id: 'c1', position: { x: 4000, y: 2000 } }),
      makeCard({ id: 'jarred', position: { x: 9000, y: 9000 }, jarredAt: 5 }),
    ]
    expect(deskBounds(rowOfAreas(), cards, new Map([['c1', 300]]))).toEqual({ x: 80, y: 120, w: 4236 - 80, h: 2300 - 120 })
  })

  it('contains the Jar and its caption', () => {
    const bounds = deskBounds(rowOfAreas(), [], noHeights)!
    const jar = jarBounds(jarRect(rowOfAreas())!)
    expect(bounds).toEqual({ x: 80, y: 120, w: 3100, h: jar.y + jar.h - 120 })
  })

  it('is null for an empty Desk', () => {
    expect(deskBounds([], [], noHeights)).toBeNull()
  })
})

describe('initialView', () => {
  it('shows every Area and the Jar on a desktop window', () => {
    const viewport = { w: 1440, h: 900 }
    const result = initialView(rowOfAreas(), [], noHeights, viewport)
    expect(result).toEqual(fitRect(deskBounds(rowOfAreas(), [], noHeights)!, viewport))
    // The fit is width-limited (3100 px wide with or without the Jar), so the Jar costs no zoom.
    expect(result.s).toBeCloseTo(1440 / (3100 + 60))
  })

  it('shows the first Area on a phone', () => {
    const viewport = { w: 412, h: 915 }
    expect(initialView(rowOfAreas(), [], noHeights, viewport)).toEqual(areaView(rowOfAreas()[0], viewport))
  })
})

describe('welcomeView', () => {
  const area = rowOfAreas()[0]
  const card = welcomeCard(area, { title: 'Hola', body: '', items: ['1', '2', '3'] }, { z: 1, now: 1, newId: () => 'w' })
  const height = 300

  /** The Card's rect on screen under `view`. */
  function onScreen(view: View) {
    const topLeft = toScreen(view, card.position)
    return { left: topLeft.x, top: topLeft.y, right: topLeft.x + CARD_WIDTH * view.s, bottom: topLeft.y + height * view.s }
  }

  it("is the Area's view on a phone, with the Card in it and readable", () => {
    const viewport = { w: 390, h: 844 }
    const view = welcomeView(area, card, height, viewport)
    expect(view).toEqual(areaView(area, viewport))
    expect(view.s).toBeGreaterThanOrEqual(FAR_SCALE)
    const rect = onScreen(view)
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.right).toBeLessThanOrEqual(viewport.w)
    expect(rect.bottom).toBeLessThanOrEqual(viewport.h)
  })

  it('frames the Card itself on a desktop window, closer than the far look', () => {
    const viewport = { w: 1280, h: 720 }
    const view = welcomeView(area, card, height, viewport)
    expect(view).toEqual(cardView(card, height, viewport))
    expect(view.s).toBeGreaterThanOrEqual(FAR_SCALE)
    const rect = onScreen(view)
    expect(rect.left).toBeGreaterThanOrEqual(0)
    expect(rect.top).toBeGreaterThanOrEqual(0)
    expect(rect.right).toBeLessThanOrEqual(viewport.w)
    expect(rect.bottom).toBeLessThanOrEqual(viewport.h)
  })
})

describe('randomTilt', () => {
  it('stays within ±2.2°', () => {
    expect(randomTilt(() => 0)).toBe(-2.2)
    expect(randomTilt(() => 0.5)).toBe(0)
    expect(randomTilt(() => 0.999999)).toBeCloseTo(2.2)
  })
})
