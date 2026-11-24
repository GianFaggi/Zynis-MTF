# Stroke styles as an optional list parallel to strokes

Amends [ADR 0013](0013-handwriting-as-optional-ink.md): "the color is not stored" no longer holds for pens other than Tinta.

Handwriting gets pens (#51). Each stroke keeps the color and width it was drawn with, so `Card.ink` gains one optional field:

```ts
interface InkStyle {
  color: string | null   // lowercase '#rrggbb'; null = Tinta, which follows the theme
  size: number           // perfect-freehand size in box units, an integer: Fino 4, Medio 7, Grueso 12
}
interface Ink {
  height: number
  strokes: number[][]
  styles?: InkStyle[]    // styles[i] belongs to strokes[i]
}
```

- **Tinta is `null`.** Its color is still not stored: a path with no `fill` inherits `currentColor` from the ink token, so it follows the theme as before. A hex color is drawn as the path's `fill` and is the same in both themes. MTF never adjusts it.
- **Left out when all default.** Every write goes through `withStyles`, which drops `styles` when every stroke is Tinta Medio (`{ color: null, size: 7 }`). Handwriting written only with Tinta Medio stays byte for byte in ADR 0013's shape, so old Backups, older deploys and the earlier tests see nothing new.
- **Read through a length check.** Every reader goes through `strokeStyles(ink)`. When `styles` is missing, or its length differs from `strokes`, every stroke reads as Tinta Medio.
- **Widths are numbers.** A stroke stores the size it was drawn with, not a preset name, so retuning the presets never changes what is written. The Backup check accepts any integer from 1 to 40, so a retune never makes an older Backup damaged.
- **The pens themselves are a device setting** (`mtf_pens`), like the theme: not in `mtf_data`, a Backup or sync.

**Why the length check is enough.** `Ink` carries no version, and sync records carry none ([ADR 0012](0012-session-sync-of-opaque-records.md)), so a device on an older deploy can edit a Card with styles at any time until its PWA updates. It edits handwriting in exactly three ways, and each one breaks the alignment in a way this version can detect:

- an **erase** writes `{ ...ink, strokes }`: `styles` survives, but with more entries than strokes;
- a **new stroke** writes `{ height, strokes }`: `styles` is gone;
- a **clear** writes an empty `Ink`: neither is left.

Its undo restores whole earlier values, which were aligned. So a mismatch always means "edited by a version without pens", and no case leaves the lengths equal while the pairs are wrong. The safe reading is all Tinta: the colors are lost, but a color never lands on the wrong stroke.

**No `SCHEMA_VERSION` bump**, for the same reasons as ADR 0013: sync records carry no version, the field is optional, and a bump would make an older MTF refuse a new Backup as "newer" for no gain.

## Considered Options

- **The style inside each stroke** (a header triple, or an out-of-range pressure as a marker): rejected. An older deploy would draw the header as a real point (a line off to `y = 16 777 215`) or at a giant width.
- **Strokes as objects** (`{ points, color, size }`) under a new field name, as ADR 0013 requires for a new encoding: rejected. Two fields read side by side forever, a migration of every handwritten Card, and an older deploy would lose the handwriting entirely instead of only its colors.
- **A map keyed by stroke position or first point**: rejected. It is fragile under erase, and gains nothing over the length check.
- **Theme tokens instead of hex** (like the Area colors): rejected. The user chose a free color wheel, and hex is what the browser's `<input type="color">` gives.

## Consequences

- **An older deploy that edits colored handwriting turns all of that Card's strokes back to Tinta Medio.** The window is short (the PWA updates on its next launch). As ADR 0013 already says, a rollback should go together with a Backup.
- `styles` is now part of `ink`'s encoding. A later change to it follows ADR 0013's rule: a new field name, read alongside the old one.
- A styled stroke adds about 30 bytes. Within the 12 000-point cap a Card stays well under sync's 512 KB chunks.
- A chosen color can read poorly in the other theme. That is accepted: the pen's dot shows the real color on both papers, and the user changes it.
