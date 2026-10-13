import { grown, overlaps } from '../desk/areas'
import { boundingBox, type Point, type Rect } from '../desk/geometry'
import type { Area, AreaColor } from '../types'

// The Jar's place and fill (KB/frontend/desk.md). Its place is derived from the Areas,
// never stored: in their middle when it is free, otherwise centered under them, so it
// follows custom Areas (#7) and arrangements (#18) for free.
// The numbers come from the approved mockup (design/mtf-mockup-desk.html).

const JAR_SIZE = { w: 260, h: 300 }
/** Paper between the Jar and the Areas: below the lowest one, or around the Jar and its caption in the middle. */
const JAR_GAP = 50
/** "Tu frasco" and the week line under the Jar. */
const CAPTION = { w: 360, h: 90, gap: 14 }
/** The hit area is forgiving: the Jar grown by these margins. */
const HIT = { side: 50, top: 60, bottom: 30 }

/** An Area Jar (#19): 40% of the Jar, inside its Area's top-right corner. */
const AREA_JAR_SIZE = { w: 104, h: 120 }
/** Paper between an Area Jar and its Area's right and top edges. */
const AREA_JAR_INSET = { right: 24, top: 16 }
/** An Area Jar's hit area: the Desk Jar's margins, scaled down. */
const AREA_JAR_HIT = 30

/** Pieces per row, and how many rows fit inside the glass before the Jar looks full. */
const PER_ROW = 7
const ROWS = 11
export const JAR_CAPACITY = PER_ROW * ROWS

export interface JarPiece {
  x: number
  y: number
  /** Degrees, around the piece's center. */
  rotate: number
  color: AreaColor
}

/**
 * At the center of the Areas when there is room for it there (`centeredJar`), as in
 * Estrella; otherwise centered under them, 50 px below the lowest one. `null` without
 * Areas (no Jar is drawn).
 */
export function jarRect(areas: readonly Area[]): Rect | null {
  if (areas.length === 0) return null
  const rects = areas.map((area) => area.rect)
  const centered = centeredJar(rects)
  if (centered) return centered
  const box = boundingBox(rects)
  return { x: Math.round(box.x + box.w / 2 - JAR_SIZE.w / 2), y: box.y + box.h + JAR_GAP, ...JAR_SIZE }
}

/**
 * The Jar placed so that it and its caption (`jarBounds`) are centered on the bounding
 * box of `rects`, when that block, with `JAR_GAP` of paper around it, overlaps none of
 * them; otherwise `null`. Estrella grows its ring until this holds.
 */
export function centeredJar(rects: readonly Rect[]): Rect | null {
  const box = boundingBox(rects)
  // The block's offset from the Jar's top-left: the caption is wider than the Jar.
  const block = jarBounds({ x: 0, y: 0, ...JAR_SIZE })
  const jar = {
    x: Math.round(box.x + box.w / 2 - block.w / 2 - block.x),
    y: Math.round(box.y + box.h / 2 - block.h / 2 - block.y),
    ...JAR_SIZE,
  }
  const around = grown(jarBounds(jar), JAR_GAP)
  return rects.some((rect) => overlaps(rect, around)) ? null : jar
}

/** Where the caption sits, centered under the Jar. */
export function captionRect(jar: Rect): Rect {
  return { x: jar.x + jar.w / 2 - CAPTION.w / 2, y: jar.y + jar.h + CAPTION.gap, w: CAPTION.w, h: CAPTION.h }
}

/** The Jar with its caption: what See all and the Dock's "Frasco" must show. */
export function jarBounds(jar: Rect): Rect {
  const caption = captionRect(jar)
  const x = Math.min(jar.x, caption.x)
  return { x, y: jar.y, w: Math.max(jar.x + jar.w, caption.x + caption.w) - x, h: caption.y + caption.h - jar.y }
}

/** Whether a dragged Card's center (Desk coordinates) is over the Jar, with the forgiving margins. */
export function isOverJar(jar: Rect, point: Point): boolean {
  return (
    point.x > jar.x - HIT.side &&
    point.x < jar.x + jar.w + HIT.side &&
    point.y > jar.y - HIT.top &&
    point.y < jar.y + jar.h + HIT.bottom
  )
}

/**
 * An Area's own small Jar (#19), in its top-right corner: the label and its pencil hold
 * the top-left and the resize handle the bottom-right. It ends above the 140 px where
 * Tidy up starts placing Cards, so a tidied Card never covers it. `AreaRegion` draws it
 * at the same place, from `--w`, so it follows a live move or resize.
 */
export function areaJarRect(rect: Rect): Rect {
  return { x: rect.x + rect.w - AREA_JAR_INSET.right - AREA_JAR_SIZE.w, y: rect.y + AREA_JAR_INSET.top, ...AREA_JAR_SIZE }
}

/** Whether a dragged Card's center is over an Area Jar, with its forgiving margin. */
export function isOverAreaJar(jar: Rect, point: Point): boolean {
  return (
    point.x > jar.x - AREA_JAR_HIT &&
    point.x < jar.x + jar.w + AREA_JAR_HIT &&
    point.y > jar.y - AREA_JAR_HIT &&
    point.y < jar.y + jar.h + AREA_JAR_HIT
  )
}

/** The Jar a dragged Card is over: an Area's (`areaId`) or the Desk's (`areaId: null`). */
export interface JarTarget {
  areaId: string | null
}

/**
 * Which Jar a dragged Card's center is over, if any: an Area Jar first, only while
 * "Frasco por área" is on and the Desk is not in the far look (where Area Jars are
 * hidden), then the Desk Jar. The highlight and the drop both ask this, so they agree.
 */
export function jarTarget(
  areas: readonly Area[],
  point: Point,
  { areaJars, far }: { areaJars: boolean; far: boolean },
): JarTarget | null {
  if (areaJars && !far) {
    const area = areas.find((candidate) => isOverAreaJar(areaJarRect(candidate.rect), point))
    if (area) return { areaId: area.id }
  }
  const jar = jarRect(areas)
  return jar && isOverJar(jar, point) ? { areaId: null } : null
}

/** The mockup's jitter: a number in [-1, 1) that only depends on its inputs. */
function jitter(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

/**
 * One paper piece per color, oldest first, from the bottom of the glass up: 7 per row,
 * every other row shifted, with a jitter from the index so the Jar looks the same on
 * every render. Beyond `JAR_CAPACITY` the Jar looks full and no more pieces are placed.
 */
export function jarPieces(colors: readonly AreaColor[]): JarPiece[] {
  return colors.slice(0, JAR_CAPACITY).map((color, i) => {
    const row = Math.floor(i / PER_ROW)
    const column = i % PER_ROW
    return {
      x: 50 + column * 23 + (row % 2 ? 11 : 0) + jitter(i, 1) * 5,
      y: 268 - row * 16 + jitter(i, 2) * 4,
      rotate: jitter(i, 3) * 38,
      color,
    }
  })
}
