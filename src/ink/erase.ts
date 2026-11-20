import { INK_ERASER_RADIUS } from './constants'
import { segmentDistance } from './geometry'

// The eraser removes whole strokes (#47, design D6): a stroke goes when the eraser's
// path passes within `INK_ERASER_RADIUS` of its polyline. Pure, so it is unit-tested;
// the box runs it for each segment of the eraser's path while the pointer moves.

/** Whether segments a–b and c–d cross. */
function crosses(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px)
  const d1 = side(cx, cy, dx, dy, ax, ay)
  const d2 = side(cx, cy, dx, dy, bx, by)
  const d3 = side(ax, ay, bx, by, cx, cy)
  const d4 = side(ax, ay, bx, by, dx, dy)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

/** Shortest distance between segments a–b and c–d. */
function segmentsDistance(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): number {
  if (crosses(ax, ay, bx, by, cx, cy, dx, dy)) return 0
  return Math.min(
    segmentDistance(ax, ay, cx, cy, dx, dy),
    segmentDistance(bx, by, cx, cy, dx, dy),
    segmentDistance(cx, cy, ax, ay, bx, by),
    segmentDistance(dx, dy, ax, ay, bx, by),
  )
}

/** Whether the eraser segment a–b passes within `radius` of a stroke. A one-point stroke is a dot. */
export function strokeHit(stroke: readonly number[], ax: number, ay: number, bx: number, by: number, radius = INK_ERASER_RADIUS): boolean {
  if (stroke.length === 3) return segmentDistance(stroke[0], stroke[1], ax, ay, bx, by) < radius
  for (let i = 3; i < stroke.length; i += 3) {
    if (segmentsDistance(ax, ay, bx, by, stroke[i - 3], stroke[i - 2], stroke[i], stroke[i + 1]) < radius) return true
  }
  return false
}

/** `strokes` without those the eraser segment a–b touches; the same array when it touches none. */
export function eraseSegment(strokes: number[][], ax: number, ay: number, bx: number, by: number, radius = INK_ERASER_RADIUS): number[][] {
  const kept = strokes.filter((stroke) => !strokeHit(stroke, ax, ay, bx, by, radius))
  return kept.length === strokes.length ? strokes : kept
}

/** `strokes` without those an eraser path (flat `[x, y, x, y, …]`) touches. A one-point path erases around that point. */
export function eraseAlong(strokes: number[][], path: readonly number[], radius = INK_ERASER_RADIUS): number[][] {
  if (path.length === 2) return eraseSegment(strokes, path[0], path[1], path[0], path[1], radius)
  let kept = strokes
  for (let i = 2; i < path.length; i += 2) kept = eraseSegment(kept, path[i - 2], path[i - 1], path[i], path[i + 1], radius)
  return kept
}
