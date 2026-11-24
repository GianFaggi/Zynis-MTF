import { getStroke, type StrokeOptions } from 'perfect-freehand'
import type { Ink } from '../types'
import { DEFAULT_STYLE } from './constants'
import { strokeStyles } from './style'

// Handwriting outlines (#47, design D8; #51, design D4). perfect-freehand turns a stroke's
// [x, y, pressure] points into the outline of a line that is thicker where the pen
// pressed harder, at the stroke's width; MTF fills that outline as an SVG <path>. A Tinta
// path has no `fill` and inherits `currentColor`, so it follows the theme; a pen's color
// is the path's own `fill`. Outlines are cached by stroke array and width: strokes are
// never mutated once committed, so a Desk full of handwriting computes each one once.

/** The feel of the ink. The width (`size`) comes from each stroke's style. Tuned on real devices (#47 task 7.1). */
export const INK_STROKE_OPTIONS: StrokeOptions = {
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.4,
  // Our pressure is real (a pen) or a flat 50 (mouse, finger): never simulated from speed.
  simulatePressure: false,
}

/** One stroke as drawn: its SVG `d`, and its color (`null`: Tinta, `currentColor`). */
export interface InkPath {
  d: string
  color: string | null
}

const cache = new WeakMap<readonly number[], Map<number, string>>()

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

/**
 * The SVG `d` of one stroke (flat `[x, y, p, …]`, p 0–100) at width `size`. `last` is false for
 * the stroke still being drawn.
 */
export function strokePath(stroke: readonly number[], last = true, size = DEFAULT_STYLE.size): string {
  const points: number[][] = []
  for (let i = 0; i < stroke.length; i += 3) points.push([stroke[i], stroke[i + 1], stroke[i + 2] / 100])
  return outlinePath(getStroke(points, { ...INK_STROKE_OPTIONS, size, last }))
}

/** The `d` of a committed stroke at `size`, computed once per stroke array and width. */
function cachedPath(stroke: readonly number[], size: number): string {
  let bySize = cache.get(stroke)
  if (!bySize) {
    bySize = new Map()
    cache.set(stroke, bySize)
  }
  let d = bySize.get(size)
  if (d === undefined) {
    d = strokePath(stroke, true, size)
    bySize.set(size, d)
  }
  return d
}

/** One path per stroke, with the width and color of its style (`strokeStyles`). */
export function inkPaths(ink: Ink): InkPath[] {
  const styles = strokeStyles(ink)
  return ink.strokes.map((stroke, index) => ({ d: cachedPath(stroke, styles[index].size), color: styles[index].color }))
}
