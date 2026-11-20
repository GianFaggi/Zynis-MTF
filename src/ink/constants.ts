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
