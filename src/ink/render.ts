import { getStroke, type StrokeOptions } from 'perfect-freehand'
import type { Ink } from '../types'

// Handwriting outlines (#47, design D8). perfect-freehand turns a stroke's
// [x, y, pressure] points into the outline of a line that is thicker where the pen
// pressed harder; MTF fills that outline as an SVG <path> with `currentColor`, so the
// ink follows the theme. Outlines are cached by stroke array: strokes are never
// mutated once committed, so a Desk full of handwriting computes each one once.

/** The feel of the ink, in box units (the box is 1000 wide). Tuned on real devices (task 7.1). */
export const INK_STROKE_OPTIONS: StrokeOptions = {
  size: 7,
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.4,
  // Our pressure is real (a pen) or a flat 50 (mouse, finger): never simulated from speed.
  simulatePressure: false,
}

const cache = new WeakMap<readonly number[], string>()

/** A closed SVG path through an outline, smoothed with quadratic curves between midpoints. */
function outlinePath(outline: number[][]): string {
  if (outline.length === 0) return ''
  const n = outline.length
  const round = (value: number) => Math.round(value * 10) / 10
  const parts = [`M${round(outline[0][0])},${round(outline[0][1])}Q`]
  for (let i = 0; i < n; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % n]
    parts.push(`${round(x0)},${round(y0)} ${round((x0 + x1) / 2)},${round((y0 + y1) / 2)} `)
  }
  parts.push('Z')
  return parts.join('')
}

/** The SVG `d` of one stroke (flat `[x, y, p, …]`, p 0–100). `last` is false for the stroke still being drawn. */
export function strokePath(stroke: readonly number[], last = true): string {
  const points: number[][] = []
  for (let i = 0; i < stroke.length; i += 3) points.push([stroke[i], stroke[i + 1], stroke[i + 2] / 100])
  return outlinePath(getStroke(points, { ...INK_STROKE_OPTIONS, last }))
}

/** One `d` string per stroke, each computed once per stroke array. */
export function inkPaths(ink: Ink): string[] {
  return ink.strokes.map((stroke) => {
    let d = cache.get(stroke)
    if (d === undefined) {
      d = strokePath(stroke)
      cache.set(stroke, d)
    }
    return d
  })
}
