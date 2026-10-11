import { newId } from '../lib/id'
import type { Area, AreaColor } from '../types'
import { CARD_WIDTH, between, type Point, type Random, type Rect } from './geometry'

// Areas are soft regions of the Desk, read from `data.areas`. Nothing here assumes
// there are three: custom Areas (ticket #7) only add to that list.

type DefaultKey = NonNullable<Area['key']>

const defaults: { key: DefaultKey; color: AreaColor }[] = [
  { key: 'work', color: 'sage' },
  { key: 'life', color: 'sand' },
  { key: 'remember', color: 'sky' },
]

// The mockup's row: 980 × 1000 Areas from (80, 120), 80 px apart. The space below
// the middle Area stays free for the Jar (change 3).
const AREA_SIZE = { w: 980, h: 1000 }
const ROW_ORIGIN = { x: 80, y: 120 }
const AREA_GAP = 80

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
