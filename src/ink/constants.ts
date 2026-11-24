import type { InkStyle, Pens } from '../types'

// Handwriting box geometry and limits (#47, design D2, D3, D7; ADR 0013).
// Points live in box coordinates: x in 0–INK_WIDTH, y in 0–height, so the same
// handwriting fits every editor and Card width.

/** The box is always this many ink units wide; it renders at 100% of the space it gets. */
export const INK_WIDTH = 1000

/** A new box: 2.5 : 1. */
export const INK_INITIAL_HEIGHT = 400

/** The box never grows past this height. */
export const INK_MAX_HEIGHT = 2500

/** How much the box grows when a stroke ends near its bottom. */
export const INK_GROW_STEP = 250

/** A stroke ending with a point below `height - INK_GROW_MARGIN` makes the box grow. */
export const INK_GROW_MARGIN = 120

/** Every point of every stroke of one Card, at most: keeps one Card from eating the shared storage. */
export const INK_MAX_POINTS = 12_000

/** The pressure (0–100) given to a pointer that reports none: an even stroke. */
export const INK_FLAT_PRESSURE = 50

/** A move closer than this to the last kept point is skipped. */
export const INK_MIN_STEP = 2

/** Ramer–Douglas–Peucker tolerance on x/y when a stroke ends. */
export const INK_SIMPLIFY_TOLERANCE = 0.8

/** How close (ink units) the eraser path must pass to a stroke to remove it. */
export const INK_ERASER_RADIUS = 14

/** At most this many undo steps per editor session. */
export const INK_UNDO_LIMIT = 50

/** The pen widths (#51, design D2), as perfect-freehand sizes. Medio is #47's single width. */
export const INK_SIZES = { fine: 4, medium: 7, bold: 12 } as const

/** How a stroke without a style looks: Tinta, which follows the theme, at Medio. */
export const DEFAULT_STYLE: InkStyle = { color: null, size: INK_SIZES.medium }

/** A stored stroke width outside 1–40 makes a Backup damaged; any integer inside is kept, so a retune never breaks one. */
export const INK_MIN_SIZE = 1
export const INK_MAX_SIZE = 40

/** The editor's width slider (#51, design D2): steps of 1 between the presets, which sit on it at 4, 7 and 12. */
export const INK_SIZE_SLIDER = { min: 2, max: 20, step: 1 } as const

/**
 * The pens on a new device (#51, design D5): Tinta, then a blue, a red and a green, all Medio.
 * Mid-lightness colors that read on both papers; tunable after trying them on a device.
 */
export const DEFAULT_PENS: Pens = {
  chosen: 0,
  pens: [
    DEFAULT_STYLE,
    { color: '#3a78c2', size: INK_SIZES.medium },
    { color: '#d0443a', size: INK_SIZES.medium },
    { color: '#2f9a5e', size: INK_SIZES.medium },
  ],
}
