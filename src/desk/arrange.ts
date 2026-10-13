import type { Area, AreaId, SavedArrangement } from '../types'
import { centeredJar } from '../wins/jarLayout'
import { AREA_GAP, ROW_GAP, ROW_ORIGIN, freeSlot, grown, overlaps, sameRect } from './areas'
import { boundingBox, type Rect } from './geometry'

// Arranging the Areas (#18, KB/frontend/desk.md): each arrangement maps every Area to
// its target rect. Sizes are kept, values are integers and no two Areas overlap; the
// store moves the Areas and their Cards there in one write (`arrangeAreas`).

export type Arrangement = Map<AreaId, Rect>

/** Estrella's radius grows by this much until everything fits. */
const RING_STEP = 20
/** A bound the search never reaches with real Areas; it only guards against a loop. */
const MAX_RADIUS = 1_000_000

/** Fila: side by side in list order, tops aligned, with the default row's origin and spacing. */
export function rowArrangement(areas: readonly Area[]): Arrangement {
  const targets: Arrangement = new Map()
  let x = ROW_ORIGIN.x
  for (const area of areas) {
    targets.set(area.id, { ...area.rect, x, y: ROW_ORIGIN.y })
    x += area.rect.w + AREA_GAP
  }
  return targets
}

/**
 * Tabla: the smallest square grid that holds every Area, filled row by row in list
 * order. A column is as wide as its widest Area and a row as tall as its tallest; each
 * Area sits at the top-left of its cell.
 */
export function gridArrangement(areas: readonly Area[]): Arrangement {
  const columns = Math.ceil(Math.sqrt(areas.length))
  const widths: number[] = []
  const heights: number[] = []
  areas.forEach((area, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    widths[column] = Math.max(widths[column] ?? 0, area.rect.w)
    heights[row] = Math.max(heights[row] ?? 0, area.rect.h)
  })
  const lefts = starts(ROW_ORIGIN.x, widths, AREA_GAP)
  const tops = starts(ROW_ORIGIN.y, heights, ROW_GAP)
  return new Map(
    areas.map((area, index) => [area.id, { ...area.rect, x: lefts[index % columns], y: tops[Math.floor(index / columns)] }]),
  )
}

/**
 * Estrella: a ring around an empty center for the Jar, the first Area at the top and
 * the rest clockwise, evenly spread (two Areas: left and right). The radius grows in
 * `RING_STEP`s until the Areas are `AREA_GAP` apart and the Jar fits in the middle,
 * checked with `centeredJar`, the rule `jarRect` itself uses. A single Area is a row.
 */
export function starArrangement(areas: readonly Area[]): Arrangement {
  if (areas.length < 2) return rowArrangement(areas)
  for (let radius = 0; ; radius += RING_STEP) {
    const rects = ring(areas, radius)
    if (radius >= MAX_RADIUS || (spaced(rects) && centeredJar(rects))) return fromOrigin(areas, rects)
  }
}

/** Every Area's rect with its center on a circle of `radius` around (0, 0). */
function ring(areas: readonly Area[], radius: number): Rect[] {
  return areas.map((area, index) => {
    // Screen y points down, so a growing angle turns clockwise and -90° is the top.
    const angle = areas.length === 2 ? Math.PI * (1 - index) : -Math.PI / 2 + (2 * Math.PI * index) / areas.length
    const { w, h } = area.rect
    return { x: Math.round(radius * Math.cos(angle) - w / 2), y: Math.round(radius * Math.sin(angle) - h / 2), w, h }
  })
}

/** Whether no two rects are closer than `AREA_GAP`. */
function spaced(rects: readonly Rect[]): boolean {
  return rects.every((a, i) => rects.slice(i + 1).every((b) => !overlaps(grown(a, AREA_GAP), b)))
}

/** The rects shifted so their bounding box starts at `ROW_ORIGIN`, like the other arrangements. */
function fromOrigin(areas: readonly Area[], rects: readonly Rect[]): Arrangement {
  const box = boundingBox(rects)
  const dx = ROW_ORIGIN.x - box.x
  const dy = ROW_ORIGIN.y - box.y
  return new Map(areas.map((area, index) => [area.id, { ...rects[index], x: rects[index].x + dx, y: rects[index].y + dy }]))
}

/**
 * Mi disposición: every saved Area back at its saved rect; an Area created since,
 * in list order, at the first free slot among the rects placed so far. Saved ids of
 * deleted Areas are ignored.
 */
export function savedArrangement(areas: readonly Area[], saved: SavedArrangement['rects']): Arrangement {
  const placed = areas.filter((area) => Object.hasOwn(saved, area.id)).map((area) => ({ ...area, rect: { ...saved[area.id] } }))
  for (const area of areas) {
    if (!Object.hasOwn(saved, area.id)) placed.push({ ...area, rect: freeSlot(placed) })
  }
  const rects = new Map(placed.map((area) => [area.id, area.rect]))
  return new Map(areas.map((area) => [area.id, rects.get(area.id)!]))
}

/** Whether "Mi disposición" can be chosen: the saved arrangement knows at least one current Area. */
export function canRestore(areas: readonly Area[], saved: SavedArrangement | null): saved is SavedArrangement {
  return saved !== null && areas.some((area) => Object.hasOwn(saved.rects, area.id))
}

/**
 * Whether one of the four choices brings the Areas back exactly where they are now,
 * so arranging loses nothing. When it does not, Settings asks before arranging.
 */
export function isRecoverable(areas: readonly Area[], saved: SavedArrangement | null): boolean {
  const choices = [rowArrangement, gridArrangement, starArrangement]
  if (canRestore(areas, saved)) choices.push((current) => savedArrangement(current, saved.rects))
  return choices.some((arrange) => {
    const targets = arrange(areas)
    return areas.every((area) => sameRect(area.rect, targets.get(area.id)!))
  })
}

/** Where each of `sizes` starts when laid out from `origin` with `gap` between them. */
function starts(origin: number, sizes: readonly number[], gap: number): number[] {
  let at = origin
  return sizes.map((size) => {
    const start = at
    at += size + gap
    return start
  })
}
