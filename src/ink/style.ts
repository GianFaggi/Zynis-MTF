import type { Ink, InkStyle } from '../types'
import { DEFAULT_STYLE } from './constants'

// Stroke styles (#51, design D1 and D3; ADR 0014). `Ink.styles` is a list parallel to
// `strokes`, left out when every stroke is Tinta Medio. A version of MTF without pens
// keeps, shortens or drops `styles` when it edits handwriting, but never in a way that
// leaves the lengths equal and the pairs wrong: so a length that differs from `strokes`
// reads as all Tinta Medio, and nothing ever shows a color on the wrong stroke. Every
// reader goes through `strokeStyles`, every writer through `withStyles`.

const isDefault = (style: InkStyle) => style.color === DEFAULT_STYLE.color && style.size === DEFAULT_STYLE.size

/** One style per stroke: all `DEFAULT_STYLE` when `styles` is missing or does not line up with `strokes`. */
export function strokeStyles(ink: Ink): InkStyle[] {
  const { styles, strokes } = ink
  if (styles && styles.length === strokes.length) return styles
  return strokes.map(() => DEFAULT_STYLE)
}

/** An `Ink` with `styles[i]` for `strokes[i]`; `styles` is left out when they are all Tinta Medio, so it keeps #47's shape. */
export function withStyles(height: number, strokes: number[][], styles: readonly InkStyle[]): Ink {
  if (styles.every(isDefault)) return { height, strokes }
  return { height, strokes, styles: [...styles] }
}
