import type { Ink, InkStyle } from '../types'
import {
  INK_FLAT_PRESSURE,
  INK_GROW_MARGIN,
  INK_GROW_STEP,
  INK_MAX_HEIGHT,
  INK_MAX_POINTS,
  INK_MIN_STEP,
  INK_SIMPLIFY_TOLERANCE,
  INK_WIDTH,
} from './constants'
import { strokeStyles, withStyles } from './style'

// Handwriting geometry (#47, design D3 and D7; ADR 0013). Points live in box
// coordinates: x 0–INK_WIDTH, y 0–height, integers, plus a pressure 0–100. A stroke
// is a flat list [x, y, p, x, y, p, …]. Everything here is pure, so it is unit-tested;
// the handwriting box (`InkBox.tsx`) feeds it from Pointer Events.

/** Where the box is on screen, in CSS px: what `getBoundingClientRect()` gives. */
export interface BoxRect {
  left: number
  top: number
  width: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * A screen point as a box point: scaled so the box is `INK_WIDTH` wide, rounded, and
 * clamped to the box, so a stroke that leaves the box keeps drawing along its edge.
 */
export function toBoxPoint(clientX: number, clientY: number, rect: BoxRect, height: number): { x: number; y: number } {
  const scale = INK_WIDTH / rect.width
  return {
    x: clamp(Math.round((clientX - rect.left) * scale), 0, INK_WIDTH),
    y: clamp(Math.round((clientY - rect.top) * scale), 0, height),
  }
}

/**
 * The pressure kept for a point, 0–100. Only a pen reports a real one; the mouse and the
 * finger, and a pen that reports 0, get `INK_FLAT_PRESSURE`, so their strokes are even.
 */
export function inkPressure(pointerType: string, pressure: number): number {
  if (pointerType !== 'pen' || !(pressure > 0)) return INK_FLAT_PRESSURE
  return clamp(Math.round(pressure * 100), 1, 100)
}

/**
 * Appends a point to a stroke being drawn, unless it is closer than `INK_MIN_STEP` to
 * the last kept point. Returns whether it was kept. Mutates `stroke`: it lives in a ref
 * while the pointer moves, and only a finished stroke reaches the store.
 */
export function appendPoint(stroke: number[], x: number, y: number, p: number): boolean {
  const n = stroke.length
  if (n >= 3 && Math.hypot(x - stroke[n - 3], y - stroke[n - 2]) < INK_MIN_STEP) return false
  stroke.push(x, y, p)
  return true
}

/** Distance from point `p` to the segment `a`–`b`. */
export function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Ramer–Douglas–Peucker on x/y: drops the points that lie within `tolerance` of the line
 * through their neighbours. The first and last points, and the pressure of every point
 * kept, stay as they were.
 */
export function simplifyStroke(stroke: readonly number[], tolerance = INK_SIMPLIFY_TOLERANCE): number[] {
  const count = stroke.length / 3
  if (count <= 2) return [...stroke]
  const keep = new Uint8Array(count)
  keep[0] = 1
  keep[count - 1] = 1
  const stack: [number, number][] = [[0, count - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let farthest = -1
    let distance = tolerance
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(stroke[i * 3], stroke[i * 3 + 1], stroke[first * 3], stroke[first * 3 + 1], stroke[last * 3], stroke[last * 3 + 1])
      if (d > distance) {
        distance = d
        farthest = i
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1
      stack.push([first, farthest], [farthest, last])
    }
  }
  const out: number[] = []
  for (let i = 0; i < count; i++) if (keep[i]) out.push(stroke[i * 3], stroke[i * 3 + 1], stroke[i * 3 + 2])
  return out
}

/**
 * The box height after a stroke: `INK_GROW_STEP` taller when the stroke has a point below
 * `height - INK_GROW_MARGIN`, never past `INK_MAX_HEIGHT`. Growing only adds room below,
 * so no point already drawn moves.
 */
export function grownHeight(height: number, stroke: readonly number[]): number {
  for (let i = 1; i < stroke.length; i += 3) {
    if (stroke[i] > height - INK_GROW_MARGIN) return Math.min(INK_MAX_HEIGHT, height + INK_GROW_STEP)
  }
  return height
}

/** Every point of every stroke. */
export function pointCount(ink: Ink): number {
  return ink.strokes.reduce((total, stroke) => total + stroke.length / 3, 0)
}

/**
 * The handwriting with a finished stroke added in `style` (#51): simplified, then grown if it
 * ends near the bottom. `null` when it would pass `INK_MAX_POINTS`: the stroke is not kept.
 */
export function addStroke(ink: Ink, raw: readonly number[], style: InkStyle): Ink | null {
  const stroke = simplifyStroke(raw)
  if (stroke.length === 0) return ink
  if (pointCount(ink) + stroke.length / 3 > INK_MAX_POINTS) return null
  return withStyles(grownHeight(ink.height, stroke), [...ink.strokes, stroke], [...strokeStyles(ink), style])
}
