import type { Point, Rect } from '../desk/geometry'
import type { Area, AreaColor } from '../types'

// The Jar's place and fill (KB/frontend/desk.md). Its place is derived from the Areas,
// never stored: it sits centered under them, so it follows custom Areas (#7) for free.
// The numbers come from the approved mockup (design/mtf-mockup-desk.html).

const JAR_SIZE = { w: 260, h: 300 }
/** Space between the lowest Area and the Jar. */
const JAR_GAP = 50
/** "Tu frasco" and the week line under the Jar. */
const CAPTION = { w: 360, h: 90, gap: 14 }
/** The hit area is forgiving: the Jar grown by these margins. */
const HIT = { side: 50, top: 60, bottom: 30 }

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

/** Centered under the Areas, 50 px below the lowest one; `null` without Areas (no Jar is drawn). */
export function jarRect(areas: readonly Area[]): Rect | null {
  if (areas.length === 0) return null
  const left = Math.min(...areas.map((area) => area.rect.x))
  const right = Math.max(...areas.map((area) => area.rect.x + area.rect.w))
  const bottom = Math.max(...areas.map((area) => area.rect.y + area.rect.h))
  return { x: Math.round((left + right) / 2 - JAR_SIZE.w / 2), y: bottom + JAR_GAP, ...JAR_SIZE }
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
