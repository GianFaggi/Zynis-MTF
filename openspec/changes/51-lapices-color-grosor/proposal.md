# Proposal

## Why

Handwriting (#47) has one ink color that follows the theme and one width. Once it was in daily use, the user asked for control over how it looks: different colors to tell notes apart and a thicker or thinner line for the pen in hand (#51). The explore settled on **pens**, defined once and editable, rather than a picker shown on every stroke, so writing stays one tap away. The approved mockup is `design/mtf-mockup-lapices.html` (variant A).

## What Changes

- **Four pens in the handwriting box.** The tool row gets a tray of four pens: **Tinta** (first, the default) and three of the user's own. Each pen has a color and a width. One tap chooses a pen, and the next strokes are drawn with it. Choosing a pen also leaves eraser mode.
- **Edited in place.** Tapping the chosen pen again opens its editor: a free color wheel (any color) and a width: Fino / Medio / Grueso (EN Fine / Medium / Bold), or any step in between on a slider from 2 to 20 (added after the first merge, once the user had tried the presets). Tinta keeps following the theme, so only its width can be changed. Pressure still makes the stroke thicker within the chosen width.
- **Pens are a device setting.** The pens and the chosen pen are remembered on the device across Cards and reloads, like the theme. They are not part of the data, a Backup or sync, and an Import leaves them as they were.
- **Each stroke keeps its own color and width.** A stroke is saved with the style it was drawn with. Editing a pen later does not change what is already written. The style is kept on reload, shown on the Card on the Desk, and travels in Export/Import and in sync, with the Card.
- **A chosen color is the same in both themes.** Only Tinta follows the theme. If a chosen color does not read well in one theme, the user changes it: MTF does not adjust it. Any color is allowed, the terracotta included: the accent rule applies to MTF's own interface, not to what the user draws.
- **Handwriting from before stays as it is.** Strokes saved without a style are Tinta at medium width, which is exactly how they look today. There is **no schema bump**: the style is a new optional part of `Card.ink`. The format, and what an older version does with it, goes into a new ADR that amends ADR 0013.
- **Reverses #47's "one color, one width"** in the `handwriting` spec, `design-system.md` and the glossary.

Out of scope:
- A highlighter (a wide, see-through line under the writing).
- Selecting, moving or restyling strokes already drawn.
- Adjusting colors to the theme, or a different color per theme.
- More or fewer than four pens, or adding and removing pens.
- Converting handwriting to text, and searching it (unchanged from #47).

Acceptance criteria of #51 → scope:

| Criterion | Where |
|---|---|
| Explore defines the scope | Done; recorded in `KB/developers/active.md`, here and in `design.md` |
| Four pens, Tinta first and the default; a tap chooses one and it stays chosen across Cards and reloads | `handwriting`: "Pens", "The pens stay on the device" |
| Tapping the chosen pen opens its editor: free color (not for Tinta) and Fino / Medio / Grueso; pressure still thickens | `handwriting`: "Editing a pen", "Writing in the box" |
| A chosen color looks the same in light and dark | `handwriting`: "Handwriting is kept as ink" |
| Each stroke keeps its color and width: editing a pen does not change it; kept on reload, on the Desk, in Export/Import and sync | `handwriting`: "Each stroke keeps its style" + `backup` (valid Backup) + `sync` (what travels) |
| Pens are a device setting, not in the Backup or sync | `handwriting`: "The pens stay on the device" + `sync` (what travels) |
| Handwriting from before looks as today | `handwriting`: "Handwriting from before pens" |
| Undo, Eraser and Clear all work with any style, with pen, tablet, mouse and finger, offline and with no account | `handwriting`: "Undo" (pen edits are not undone) + existing requirements, unchanged; tests in `tasks.md` |

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `handwriting`: adds the pens (the tray, choosing, editing, kept on the device), the style each stroke keeps, and how handwriting from before pens looks. Changes "Handwriting is kept as ink" (only Tinta follows the theme), "Writing in the box" (the chosen pen's color and width), "Undo" (editing a pen is not undone) and "Handwriting in both languages" (the new labels).
- `backup`: "What a valid Backup is" also checks the style of each stroke when present, and keeps accepting handwriting without styles.
- `sync`: "What travels" carries each stroke's style with the Card, and leaves the pens on each device.

## Impact

- **Data**: `Ink` gains an optional `styles` list, aligned with `strokes`. Each entry holds a color (`#rrggbb`, or none for Tinta) and a width. There is no `SCHEMA_VERSION` bump and no migration. A new ADR (0014) amends ADR 0013. Affected: `src/types`, `src/backup/validate.ts`, `src/ink/geometry.ts` (adding a stroke), `src/ink/erase.ts` callers (an erase keeps the styles of the strokes left), `src/ink/render.ts` (width per stroke).
- **Device setting**: a new key `mtf_pens` in `src/lib/storage.ts`, and `appStore.pens` with the chosen pen. It is not in `mtf_data`, the Backup or sync.
- **UI**: the pen tray and the pen editor in `src/ink/InkBox.tsx`. Strokes are colored per stroke in `InkBox` and `InkView` (the Card on the Desk). New `es` / `en` strings. The color wheel is the browser's own `<input type="color">`, so **no new dependency**.
- **Sync / backend**: no code change. Card records are opaque, and a style adds about 30 bytes per stroke, well inside the existing limits.
- **Docs**: ADR 0014, `GLOSSARY.md` (Handwriting, Pen), KBs `storage.md`, `design-system.md`, `architecture.md`, `desk.md`, `testing.md`, `roadmap.md`. The `aprendizaje/escritura-a-mano.md` note gets a section on `<input type="color">`.
