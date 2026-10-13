import { newId } from '../lib/id'
import type { Area, AreaColor } from '../types'
import { CARD_WIDTH, between, type Point, type Random, type Rect } from './geometry'

// Areas are soft regions of the Desk, read from `data.areas`. Nothing here assumes
// there are three: custom Areas (ticket #7) only add to that list.

type DefaultKey = NonNullable<Area['key']>

/** Every Area color, in swatch order. Two Areas may share one; none of them is the accent. */
export const AREA_COLORS = [
  'sage',
  'sand',
  'sky',
  'plum',
  'rose',
  'teal',
  'olive',
  'slate',
  'indigo',
  'turquoise',
  'pine',
  'berry',
] as const satisfies readonly AreaColor[]

const defaults: { key: DefaultKey; color: AreaColor }[] = [
  { key: 'work', color: 'sage' },
  { key: 'life', color: 'sand' },
  { key: 'remember', color: 'sky' },
]

// The mockup's row: 980 × 1000 Areas from (80, 120), 80 px apart. The space below
// the middle Area stays free for the Jar (change 3).
const AREA_SIZE = { w: 980, h: 1000 }
/** Where the default row starts; the arrangements of `arrange.ts` start there too. */
export const ROW_ORIGIN = { x: 80, y: 120 }
/** Paper between two Areas side by side. */
export const AREA_GAP = 80
/** Rows of Areas are further apart, so a second row's label stands clear of the first row's Cards. */
export const ROW_GAP = 160
const SLOTS_PER_ROW = 3
/** A slot is free only when this much paper is left around it, against moved Areas too. */
const SLOT_MARGIN = 40
const MAX_ROWS = 1000

/** The smallest Area: about two Card columns plus margins. */
export const MIN_AREA_SIZE = 520
/** The longest Area name; also the name field's `maxLength`. */
export const AREA_NAME_MAX = 40

/** Trabajo, Vida and Recordar side by side, as stored entities with real ids. */
export function defaultAreas(now: number): Area[] {
  return defaults.map(({ key, color }, index) => ({
    id: newId(),
    key,
    color,
    rect: { x: ROW_ORIGIN.x + index * (AREA_SIZE.w + AREA_GAP), y: ROW_ORIGIN.y, ...AREA_SIZE },
    createdAt: now,
    updatedAt: now,
  }))
}

/** The first color no Area uses, so a new Area stands apart; the first color once all of them are taken. */
export function nextColor(areas: readonly Area[]): AreaColor {
  const used = new Set(areas.map((area) => area.color))
  return AREA_COLORS.find((color) => !used.has(color)) ?? AREA_COLORS[0]
}

/**
 * Where a new Area goes: the default row continued as a grid of 3 per row, read row
 * by row. The first slot with `SLOT_MARGIN` of paper around it free of every Area.
 */
export function freeSlot(areas: readonly Area[]): Rect {
  for (let row = 0; row < MAX_ROWS; row++) {
    for (let column = 0; column < SLOTS_PER_ROW; column++) {
      const slot = {
        x: ROW_ORIGIN.x + column * (AREA_SIZE.w + AREA_GAP),
        y: ROW_ORIGIN.y + row * (AREA_SIZE.h + ROW_GAP),
        ...AREA_SIZE,
      }
      const around = grown(slot, SLOT_MARGIN)
      if (!areas.some((area) => overlaps(area.rect, around))) return slot
    }
  }
  return { x: ROW_ORIGIN.x, y: ROW_ORIGIN.y + MAX_ROWS * (AREA_SIZE.h + ROW_GAP), ...AREA_SIZE }
}

/** `rect` with `by` px more paper on every side. */
export function grown(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + 2 * by, h: rect.h + 2 * by }
}

export function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

/** Whether two rects share some area. Touching edges do not count. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** Whether `rect` would overlap any Area other than the Area `id` itself. */
export function overlapsAny(areas: readonly Area[], id: string, rect: Rect): boolean {
  return areas.some((area) => area.id !== id && overlaps(area.rect, rect))
}

/** A rect resized from its bottom-right corner: the top-left stays, never below `MIN_AREA_SIZE`. */
export function resizedRect(rect: Rect, dx: number, dy: number): Rect {
  return {
    x: rect.x,
    y: rect.y,
    w: Math.max(MIN_AREA_SIZE, Math.round(rect.w + dx)),
    h: Math.max(MIN_AREA_SIZE, Math.round(rect.h + dy)),
  }
}

/** The other Area closest to `area` (0 when touching); ties go to the first in the list. */
export function nearestArea(areas: readonly Area[], area: Area): Area | undefined {
  let best: Area | undefined
  let bestGap = Infinity
  for (const other of areas) {
    if (other.id === area.id) continue
    const gap = gapBetween(area.rect, other.rect)
    if (gap < bestGap) {
      best = other
      bestGap = gap
    }
  }
  return best
}

function gapBetween(a: Rect, b: Rect): number {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w))
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h))
  return Math.hypot(dx, dy)
}

/**
 * The name to store for what the user typed: trimmed and cut at `AREA_NAME_MAX`.
 * Left empty, a default Area goes back to its translated name (`undefined`) and a
 * custom one keeps the name it had, so no Area is ever nameless.
 */
export function cleanName(area: Area, typed: string): string | undefined {
  const name = typed.trim().slice(0, AREA_NAME_MAX).trimEnd()
  if (name) return name
  return area.key ? undefined : area.name
}

/** The Area name in the current language; a custom `name` wins over the default `key`. */
export function areaName(area: Area, t: (key: DefaultKey) => string): string {
  return area.name ?? (area.key ? t(area.key) : '')
}

/**
 * The Area a Desk point belongs to: the Area that contains it, otherwise the one
 * whose rect is closest to it. Ties go to the first Area in the list.
 */
export function areaForPoint(areas: readonly Area[], point: Point): Area | undefined {
  let best: Area | undefined
  let bestDistance = Infinity
  for (const area of areas) {
    const distance = distanceToRect(area.rect, point)
    if (distance < bestDistance) {
      best = area
      bestDistance = distance
    }
  }
  return best
}

/** 0 inside the rect (edges included), otherwise the distance to its nearest edge. */
function distanceToRect(rect: Rect, point: Point): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.w))
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.h))
  return Math.hypot(dx, dy)
}

/** A free-looking spot for a Card inside an Area, below its label (Place selector). */
export function spotIn(area: Area, random: Random): Point {
  const { x, y, w } = area.rect
  const right = Math.max(70, w - CARD_WIDTH - 70)
  return { x: Math.round(x + between(random, 70, right)), y: Math.round(y + between(random, 150, 420)) }
}
