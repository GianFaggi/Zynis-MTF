# Design

## Context

See `proposal.md` for the why. Handwriting today (#47, ADR 0013):

- `Card.ink` is `{ height, strokes: number[][] }`. Each stroke is a flat `[x, y, p, …]` list with no room for anything else. Strokes are drawn as SVG paths filled with `currentColor` on the `ink` token, so the color is not stored, and every stroke has the same perfect-freehand `size` (7 box units, `INK_STROKE_OPTIONS` in `src/ink/render.ts`).
- `Ink` carries **no version of its own**, and sync records carry no schema version (ADR 0012). A device on an older deploy can read and write any Card at any time until its PWA updates. What it does with a field it does not know is the main constraint here. It copies the Card with `{ ...card }` and the Backup check keeps unknown fields (ADR 0006), so an unknown part of `ink` survives as long as the older device does not edit the handwriting. When it does edit, `InkBox` writes `{ ...ink, strokes }` for an erase (the unknown part kept, the strokes shorter), `{ height, strokes }` from `addStroke` for a new stroke (the unknown part dropped), and `EMPTY_INK` for a clear.
- The box's tools (`InkBox`) keep undo snapshots of whole `Ink` values. The eraser filters stroke arrays by identity (`eraseSegment` returns the same array when nothing is hit). Paths are cached per stroke array in a `WeakMap`.
- Device settings are one localStorage key each in `src/lib/storage.ts` (`mtf_handwriting`, `mtf_area_jars`), mirrored in `appStore` and left alone by an Import.

## Goals / Non-Goals

**Goals:**
- A style per stroke that an older deploy can never pair with the wrong stroke.
- Handwriting written only in Tinta at medium width stays byte-for-byte in #47's format, so older deploys and old Backups see nothing new.
- No new dependency, no schema bump, no change to sync or the API.

**Non-Goals:**
- Recoloring existing strokes, per-theme colors, a palette of tokens (all ruled out in the explore).
- Retuning the stroke feel (`thinning`, `smoothing`, `streamline` stay as tuned in #47).

## Decisions

### D1. Styles are an optional list parallel to `strokes`

```ts
interface InkStyle {
  color: string | null   // '#rrggbb' lowercase; null = Tinta, follows the theme
  size: number           // perfect-freehand size in box units (integer)
}
interface Ink {
  height: number
  strokes: number[][]
  styles?: InkStyle[]    // styles[i] belongs to strokes[i]
}
```

- **Effective styles.** A pure `strokeStyles(ink)` gives one style per stroke. When `styles` is missing, **or its length differs from `strokes.length`**, every stroke is `DEFAULT_STYLE` (`{ color: null, size: 7 }`, Tinta at medium width). Everything that reads styles goes through it: render, erase, add.
- **Why the length check is enough.** The three ways an older deploy edits handwriting all break the alignment in a way it can detect. An erase keeps `styles` with fewer strokes, so the lengths differ. A new stroke drops `styles`. A clear writes an `Ink` with neither. Its undo restores whole earlier values, which were aligned. So a mismatch always means "edited by a version without pens", and the safe reading is all Tinta (spec "Handwriting from before pens"). No case leaves the lengths equal while the pairs are wrong.
- **Omitted when all default.** Every write normalizes: when every effective style equals `DEFAULT_STYLE`, `styles` is left out. Tinta-only handwriting stays exactly the #47 shape, so old Backups, older deploys and the ADR 0013 tests see nothing new.
- **Alternatives.**
  - *Style inside each stroke* (a header triple, or an out-of-range pressure as a marker): rejected. An older deploy would draw the header as a real point (a line to `y = 16 777 215`) or a giant width.
  - *Strokes as objects* (`{ points, color, size }`) under a new field name, as ADR 0013 requires for a new encoding: rejected. Two fields read side by side forever, a migration of every handwritten Card, and older deploys would lose the handwriting entirely instead of only its colors.
  - *A map keyed by stroke position or first point*: rejected. It is fragile under erase, and gains nothing over the length check.
  - *Theme tokens instead of hex* (Area colors): the user chose a free color wheel in the explore. Hex is what `<input type="color">` gives.
- **Recorded as ADR 0014**, which amends ADR 0013 ("the color is not stored" no longer holds for pens other than Tinta).

### D2. Widths are numbers; three presets

`size` is stored as the perfect-freehand size, not as a preset name: **Fino 4, Medio 7, Grueso 12** (constants `INK_SIZES` in `src/ink/constants.ts`). Medio is #47's 7, so a stroke without a style is Medio. Storing the number keeps a stroke exactly as drawn if the presets are retuned later, and lets the renderer use it without a lookup. `thinning` stays relative to `size`, so pressure keeps thickening within each width (spec "Writing in the box"). The validator accepts any integer from 1 to 40, not just the three presets, so a retune never makes an older Backup invalid.

### D3. Pure helpers own the alignment (`src/ink/style.ts`)

- `strokeStyles(ink)`: the effective styles (D1).
- `withStyles(height, strokes, styles)`: builds an `Ink`, leaving out `styles` when all are default.
- `addStroke(ink, raw, style)` in `geometry.ts` gains the style: it appends `style` to the effective styles and returns a normalized `Ink`. The point limit, simplification and growth are unchanged.
- **Erase keeps the styles of the strokes left.** `eraseSegment` keeps working on stroke arrays. The box builds a `Map<stroke, InkStyle>` from the effective styles when an erase starts (stroke arrays are unique and never mutated), and on commit maps the kept strokes back to their styles. `erase.ts` itself does not change.
- Undo is untouched: snapshots are whole `Ink` values, styles included. "Borrar todo" writes `EMPTY_INK`.

### D4. Rendering per stroke

- `strokePath(stroke, last, size)` passes `size` into `getStroke`. The cache becomes `WeakMap<stroke, Map<size, d>>`, so the same stroke array at the same size is still computed once.
- `inkPaths(ink)` returns `{ d, color }[]`, with colors from `strokeStyles`. `InkView` and `InkBox` render `<path d={d} fill={color ?? undefined}>`. A path with no `fill` inherits `currentColor` from the SVG's `fill-current text-ink`, so Tinta still follows the theme with no stored color. A hex `fill` attribute overrides it and stays the same in both themes (spec "Handwriting is kept as ink").
- The live stroke uses the chosen pen: the box sets the live path's `fill` and passes its `size`.

### D5. Pens are a device key

```ts
interface Pens { chosen: 0 | 1 | 2 | 3; pens: [InkStyle, InkStyle, InkStyle, InkStyle] }
```

- One key, **`mtf_pens`**, holds JSON. `loadPens()` returns the defaults when the key is missing, unparseable or malformed in any part (wrong length, a bad color or size, `chosen` out of range), and never throws. Pen 0 (Tinta) is always read with `color: null`, whatever is stored.
- Defaults: Tinta Medio, then `#3a78c2` (blue), `#d0443a` (red) and `#2f9a5e` (green), all Medio. These are mid-lightness colors that read on both papers. The mockup's navy was there on purpose, to show the dark-theme trade-off. These defaults are tunable and are not in the spec.
- `appStore.pens`, `choosePen(index)` and `editPen(index, patch)` write the key on each change, like `setHandwriting`. `replaceData` (Import) and sync never touch it (spec "The pens stay on the device"). The pens are styles only, not entities, so they need no `id` or timestamps: they never sync.
- **Why not per Card or per editor session:** the explore asked for pens "defined once and editable", not chosen on each visit.

### D6. The tray and the pen editor (variant A of the mockup)

- **Tray** (`PenTray` in `src/ink/`): four round 40 px buttons in a `hover`-filled pill, first in the tool row before Deshacer. Each button shows a dot in the pen's color (`currentColor`/`text-ink` for Tinta), sized by its width. The chosen pen has an ink ring and a small pencil badge, which is the hint that tapping it again edits it. Each button has `aria-pressed` and an accessible name with the pen and its width ("Lápiz 2, Fino"). While the eraser is on, no pen shows as pressed.
- **Tap logic:** a tap on another pen chooses it and turns the eraser off. A tap on the chosen pen (eraser off) opens the editor. Enter and Space do the same, since they are buttons.
- **Editor** (`PenEditor`): a small panel anchored above the tray, inside the box's wrapper (`sheet` fill, `shadow-lift`, `rounded-2xl`). It holds a title ("Editar Lápiz 2"), a native `<input type="color">` labelled "Color" (left out for Tinta), the width as the kit `Segmented` (Fino / Medio / Grueso), and "Listo" as a `primary` `Button`. It has `role="dialog"` and a name, and focus moves into it. Changes apply on `input`, live. It closes on Listo, on Esc (with `stopPropagation`, so the editor `Sheet` stays open), on a `pointerdown` outside it, and when a stroke starts in the box.
- **Why the native color input:** it is the full system picker on iOS (since 14), Android, Windows and macOS, works offline, and is not a library (KB/frontend/stack.md: no new dependency). Its value is always lowercase `#rrggbb`, the stored format.
- **No accent anywhere:** pens, ring, badge and editor are ink and paper. The user's colors appear only as the pen dots and the strokes.

### D7. Backup check

`isInk` in `src/backup/validate.ts` accepts an optional `styles`: an array whose entries each have `color` either `null` or `/^#[0-9a-f]{6}$/i`, and `size` an integer from 1 to 40. A `styles` whose length differs from `strokes` is **accepted**: it is what an older deploy leaves behind, and it renders as Tinta (D1). Refusing it would make a real Desk impossible to restore. A wrong entry refuses the file as damaged (spec "What a valid Backup is").

### D8. Glossary

**Pen** (ES **Lápiz**) is a new term: one of the four styles of the handwriting box, a color and a width, kept on the device. The **Handwriting** entry drops "in one ink color that follows the theme" and says that Tinta follows the theme and other pens keep their color. _Avoid_: brush, marker, color picker (in UI copy).

## Risks / Trade-offs

- [A chosen color can be unreadable in the other theme] → Accepted by the user in the explore. The pen dot shows the real color on both papers, so the problem is visible before writing.
- [An older deploy loses a Card's colors when it edits that handwriting (all strokes back to Tinta)] → No wrong pairing is possible (D1). The window is short, since the PWA updates on its next launch. Recorded in ADR 0014. A rollback should go with a Backup, as ADR 0013 already says.
- [The native color picker looks different on every OS, and on some it opens a separate window] → Acceptable for a personal app. It is checked on the phone, the iPad if available, and Windows in group 7.
- [A Grueso stroke (size 12) is harder to miss with the eraser, a Fino one easier] → `INK_ERASER_RADIUS` (14) measures from the stroke's center line and is already wider than half of Grueso. It is tuned on a device only if it feels off.
- [`styles` adds bytes] → About 30 bytes per styled stroke. Within the 12 000-point cap a Card has at most a few hundred strokes, so it stays well under sync's 512 KB chunks. The 60 KB leave-send fallback already exists.
- [The editor floating over the box on a small phone could cover the writing] → It is anchored to the tray and closes on any stroke. It is checked on the phone in group 7.

## Migration Plan

- No data migration and no `SCHEMA_VERSION` bump. Existing handwriting has no `styles` and reads as Tinta Medio (D1).
- Deploy as usual through the PR. Devices pick up the new version on their next launch.
- Rollback: the older deploy ignores `styles`, shows every stroke in Tinta, and keeps `styles` until it edits that handwriting (D1). Roll back together with a Backup (ADR 0013).

## Open Questions

- The default colors of Lápiz 2–4 and the exact Fino / Grueso sizes may be tuned after trying them on a device. This changes constants only, not specs or tasks.
