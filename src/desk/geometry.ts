import type { Area, Card } from '../types'
import { jarBounds, jarRect } from '../wins/jarLayout'

// View math for the Desk (KB/frontend/desk.md). The numbers come from the approved
// mockup (design/mtf-mockup-desk.html). Everything here is pure, so it is unit-tested.

export interface Point {
  x: number
  y: number
}

export type Rect = Area['rect']

/** The view transform: `screen = world * s + (x, y)`. */
export interface View {
  x: number
  y: number
  s: number
}

export interface Viewport {
  w: number
  h: number
}

/** A source of numbers in [0, 1), injectable so layouts are deterministic in tests. */
export type Random = () => number

export const MIN_SCALE = 0.08
export const MAX_SCALE = 1.8
/** Below this scale Cards collapse to their title. */
export const FAR_SCALE = 0.55
export const CARD_WIDTH = 236
/** Used when a Card's rendered height is unknown. */
export const FALLBACK_CARD_HEIGHT = 160

// Room kept free for the floating UI when fitting a rect: wordmark/tools on top, Dock below.
const PAD_TOP = 70
const PAD_BOTTOM = 90
const MARGIN_X = 60
const MARGIN_Y = 40

const PHONE_WIDTH = 640
const INITIAL_MIN_SCALE = 0.34

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function clampScale(s: number): number {
  return clamp(s, MIN_SCALE, MAX_SCALE)
}

export function between(random: Random, min: number, max: number): number {
  return min + random() * (max - min)
}

/** A paper-like tilt in degrees, ±2.2°, rounded to 2 decimals. */
export function randomTilt(random: Random): number {
  return Math.round(between(random, -2.2, 2.2) * 100) / 100
}

export function toWorld(view: View, point: Point): Point {
  return { x: (point.x - view.x) / view.s, y: (point.y - view.y) / view.s }
}

export function toScreen(view: View, point: Point): Point {
  return { x: point.x * view.s + view.x, y: point.y * view.s + view.y }
}

/** Scales by `factor` around a screen point, keeping the Desk point under it fixed. */
export function zoomAt(view: View, origin: Point, factor: number): View {
  const anchor = toWorld(view, origin)
  const s = clampScale(view.s * factor)
  return { x: origin.x - anchor.x * s, y: origin.y - anchor.y * s, s }
}

/** The scale at which `rect` fits the free part of the viewport, before clamping. */
export function fitScale(rect: Rect, viewport: Viewport): number {
  return Math.min(viewport.w / (rect.w + MARGIN_X), (viewport.h - PAD_TOP - PAD_BOTTOM) / (rect.h + MARGIN_Y))
}

/** A view that centers `rect` in the space between the top controls and the Dock. */
export function fitRect(rect: Rect, viewport: Viewport, { maxScale = 1 } = {}): View {
  const s = clamp(fitScale(rect, viewport), MIN_SCALE, maxScale)
  const freeHeight = viewport.h - PAD_TOP - PAD_BOTTOM
  return {
    s,
    x: viewport.w / 2 - (rect.x + rect.w / 2) * s,
    y: PAD_TOP + freeHeight / 2 - (rect.y + rect.h / 2) * s,
  }
}

/**
 * The view for an Area. On a phone a whole Area would be too small to read, so the
 * view shows its top-left part at a readable scale instead.
 */
export function areaView(area: Area, viewport: Viewport): View {
  if (viewport.w >= PHONE_WIDTH) return fitRect(area.rect, viewport)
  const s = clamp(viewport.w / 560, 0.62, 1)
  return { s, x: 12 - (area.rect.x + 60) * s, y: 80 - (area.rect.y + 10) * s }
}

export function cardRect(card: Card, height: number | undefined): Rect {
  return { x: card.position.x, y: card.position.y, w: CARD_WIDTH, h: height ?? FALLBACK_CARD_HEIGHT }
}

/** A view of one Card with some paper around it (search: fly to a match). */
export function cardView(card: Card, height: number | undefined, viewport: Viewport): View {
  const rect = cardRect(card, height)
  return fitRect({ x: rect.x - 200, y: rect.y - 120, w: rect.w + 400, h: rect.h + 240 }, viewport)
}

/** The union of every Area, every Card on the Desk and the Jar with its caption; `null` when there is nothing. */
export function deskBounds(areas: readonly Area[], cards: readonly Card[], heights: ReadonlyMap<string, number>): Rect | null {
  const jar = jarRect(areas)
  const rects = [
    ...areas.map((area) => area.rect),
    ...cards.filter((card) => card.jarredAt === null).map((card) => cardRect(card, heights.get(card.id))),
    ...(jar ? [jarBounds(jar)] : []),
  ]
  if (rects.length === 0) return null

  const left = Math.min(...rects.map((r) => r.x))
  const top = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.w))
  const bottom = Math.max(...rects.map((r) => r.y + r.h))
  return { x: left, y: top, w: right - left, h: bottom - top }
}

/** The whole Desk when it fits at 34% or more, otherwise the first Area. */
export function initialView(
  areas: readonly Area[],
  cards: readonly Card[],
  heights: ReadonlyMap<string, number>,
  viewport: Viewport,
): View {
  const bounds = deskBounds(areas, cards, heights)
  if (bounds && fitScale(bounds, viewport) >= INITIAL_MIN_SCALE) return fitRect(bounds, viewport)
  if (areas[0]) return areaView(areas[0], viewport)
  return { x: 0, y: 0, s: 1 }
}
