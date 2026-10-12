# Design

## Context

- **Areas are already data-driven.** `data.areas` feeds the regions (`AreaRegion`), the Dock, the Place selector, `tidyLayout`, `areaForPoint`, `deskBounds` / See all, `initialView` and the Jar's place (`jarRect`, derived, never stored). Change 2 deliberately wrote nothing that assumes three Areas, so a new, moved or resized Area flows through all of them with no new rule.
- **The `Area` shape already fits.** It has an optional `key` (default Areas, translated), an optional `name` (custom, overrides `key`), a `color` and a `rect`, plus `id` / `createdAt` / `updatedAt`. `areaName(area, t)` = `name ?? t(key)`.
- **One gesture controller.** `Desk.tsx` runs one `useGesture` for drag, pinch and wheel. `beginPress` sorts each press by what it started on: an Area label (pan, or a tap that flies), the Jar, a control (ignored) or a Card (`pending`). `nextIntent` / `releaseOutcome` in `intent.ts` are pure and tested. During a Card drag, only the DOM moves (`style.translate`, `data-lifted`); the store is written once, on drop. A refused Jar drop slides back with `data-returning` (a 0.35 s `translate` transition).
- **Cards are placed with CSS variables**: `transform: translate(var(--x), var(--y)) rotate(var(--tilt))`. A drag adds the separate `translate` property on top, so it never touches a style React owns.
- **The Card editor** is the model for a sheet tied to one entity: `deskStore.editingId` / `newCardId`, `Sheet` with `tint`, and a two-step delete button.
- **Settings** is a `Sheet` in `App.tsx` with local `settingsOpen` state, built from sections (`BackupSection`, `InstallSection`).
- **Accent is reserved for wins**, and every color comes from Paper tokens in `src/index.css` (`@theme static`, with a dark block). Area colors are picked at runtime as `var(--color-${area.color})`.

## Goals / Non-Goals

**Goals:**
- Every Area rule (free slot, overlap, minimum size, nearest Area, next color, name rules) is a pure function in `src/desk/areas.ts`, unit-tested with no DOM.
- An Area move or resize follows the same discipline as a Card drag: DOM-only while the pointer moves, one store write on release, cancelled by `pointercancel` or a pinch.
- No schema bump and no migration.
- The store's actions write the Area and the Cards they touch in **one** `data` replacement, as Card actions already do.

**Non-Goals:**
- No keyboard way to move or resize an Area. The Area editor covers create, rename, recolor and delete without a gesture. Moving and resizing are layout, and a keyboard user can still reach every Card (Place selector, Dock, search).
- No change to Win events. `WinEvent.areaId` is a snapshot and stays as written, even when its Area is deleted. Nothing reads it today.
- No animation library: the slide back is a CSS transition, as for the Jar.

## Decisions

### 1. Pure Area rules in `areas.ts`
New exports, next to `defaultAreas`, `areaForPoint` and `spotIn`:

| Function | Rule |
|---|---|
| `AREA_COLORS` | `['sage', 'sand', 'sky', 'plum', 'rose', 'teal', 'olive', 'slate'] as const`. `AreaColor` in `src/types` becomes `(typeof AREA_COLORS)[number]`'s union, written out. `validate.ts` builds its set from this list instead of its own copy |
| `nextColor(areas)` | The first color in `AREA_COLORS` no Area uses; `AREA_COLORS[0]` when all are used |
| `freeSlot(areas)` | The default row continued as a grid: origin (80, 120), 3 columns, step `980 + 80` across and `1000 + 160` down. The first slot, row by row, whose rect grown by 40 px on each side overlaps no Area. So the 80 px gap holds against Areas the user moved, too. The row step is 160 rather than 80, so a second row's label is clearly apart from the first row's Cards. It gives up after 1,000 rows, which no real Desk reaches |
| `overlaps(a, b)` / `overlapsAny(areas, id, rect)` | Strict rect intersection (shared edges allowed), ignoring the Area `id` itself |
| `MIN_AREA_SIZE` | `520`: about two Card columns (`2 × 236 + 52`) plus margins |
| `resizedRect(rect, dx, dy)` | `w` / `h` grown by the drag, top-left fixed, floored at `MIN_AREA_SIZE`, rounded |
| `nearestArea(areas, area)` | The other Area with the smallest rect-to-rect gap (0 when touching), ties to the first in the list. The delete confirmation's default destination |
| `cleanName(area, typed)` | Trimmed; empty → `undefined` for a default Area (back to its key), the current `name` for a custom one. Max length 40 (also `maxLength` on the input) |

*Alternative*: place a new Area at the right end of the row. Rejected (and discussed with the user): with five or more Areas, See all no longer fits a phone at 8%.

### 2. Store actions in `appStore`
- `createArea(name): string` builds `{ id: newId(), name, color: nextColor, rect: freeSlot, createdAt, updatedAt }` and appends it. The provisional name comes from the caller (`t('newAreaName')`), because the store knows no strings.
- `renameArea(id, typed)` applies `cleanName` and removes `name` when it is `undefined`.
- `recolorArea(id, color)` changes the color only. Cards and the Jar read the color through their `areaId`, so they need no write.
- `moveArea(id, dx, dy)` shifts the `rect` and every Card with that `areaId` and `jarredAt === null` by the same rounded amount, with `updatedAt` on each. `z` and tilt stay. A zero move writes nothing.
- `resizeArea(id, rect)` writes the new `rect` as given; the Desk has already checked the minimum size and overlap.
- `deleteArea(id, destinationId)` refuses (writes nothing) when it is the last Area, when the destination is the Area itself, or when the destination is missing. Otherwise it removes the Area. Desk Cards get the destination's `areaId`, a `spotIn(destination)` position and fresh `z` values on top, in their current stacking order. Cards in the Jar get only the new `areaId`. Every touched Card gets `updatedAt`. Events are untouched, so every Win stays.
- `moveArea` and `resizeArea` do not check overlap themselves. The Desk decides before calling them, the same way it calls `jarVerdict` before `jarCard`. Keeping the check in the Desk avoids two sources for one rule.

*Alternative for delete*: keep the deleted Area's Cards where they are and let `areaForPoint` pick their new Area. Rejected by the user in favor of choosing the destination explicitly.

### 3. One element per Area, moved as a block
`AreaRegion` becomes one absolutely placed wrapper `div[data-area-id]` at `(rect.x, rect.y)`, with CSS variables `--w` / `--h`. Its children are placed relative to it: the tint (`-60 / -40`, `calc(var(--w) + 120px)` × `calc(var(--h) + 80px)`), the label row (label button + edit button) and the resize handle at `(var(--w), var(--h))`. Then:
- a **move** writes one `style.translate` on the wrapper, plus the same `translate` on each Card element of that Area, the exact property a Card drag uses;
- a **resize** writes `--w` / `--h` on the wrapper, and the tint and handle follow by CSS.

React's own styles stay untouched, as with Cards. `settle` clears what was written, and React's render from the store takes over.

### 4. Gestures: labels become `pending`, the handle starts a resize at once
`beginPress` learns two targets, checked before `CONTROLS` like the label and the Jar:
- `[data-area-label]` → `intent: 'pending'`, with `press.area = { id, wrapper, cards: HTMLElement[], offset }`. The Card elements of that Area (from the store, `jarredAt === null`) are looked up by `[data-card-id]` once, at lift.
- `[data-area-resize]` → `intent: 'resize'` straight away (no hold on touch: the handle exists only to be dragged, and a swipe there is never meant as a pan).

`nextIntent` already turns `pending` into `drag` (mouse > 4 px, touch hold 320 ms) or `pan` (touch > 9 px before the hold), so moving an Area reuses the Card rules unchanged. `Intent` gains `'resize'`, which `nextIntent` passes through. `releaseOutcome` gains one rule: `pending` + released within the tap limit + `onLabel` → `'label'` (fly). It used to come from a short `pan`; it now comes from a short `pending`. A pending touch released after the hold with no movement is a `drag` of 0 px, which `moveArea` ignores.

While moving, each frame computes the candidate rect and toggles `data-blocked` on the wrapper when `overlapsAny` says so. While blocked, the tint gets a dashed `pencil` outline, the label is at 50% opacity and no accent is used. On release:
- **free** → `moveArea` / `resizeArea`, then `settle`;
- **blocked** → `data-returning` on the wrapper and the carried Cards, which turns on the same 0.35 s `translate` transition (for a resize, a `--w` / `--h` transition on the tint). The written values are cleared, so everything slides back. `settle` runs after 380 ms (at once under reduced motion), along with the toast "Ahí hay otra área" / "There's another Area there".

A pinch or `pointercancel` during a move or resize goes through `settle`, the same path a Card drag takes.

The lifted look for an Area is light: `data-lifted` raises the tint strength and sets `cursor: grabbing`. No tilt and no scale, because an Area is paper, not a Card.

### 5. Tools shown only at the near zoom
The edit button (`IconButton`-like, pencil, `aria-label` "Editar área Vida") and the resize handle use `group-data-far:hidden`, the far-zoom switch Cards already use, so the flip re-renders no React. The handle is 56 Desk px square, at least 31 screen px at the far-zoom threshold (0.55) and 56 px at 100%. It shows a quiet corner mark in `pencil`. The edit button sits inside `CONTROLS`, so a press on it never pans or drags.

*Alternative*: a long-press menu on the label. Rejected: press-and-hold already means "move", as it does for Cards.

### 6. Area editor and Settings section
- `deskStore` gains `areaEditor: { id: string; isNew: boolean } | null`, with `openAreaEditor(id, { isNew })` and `closeAreaEditor()`. `resetAfterImport` clears it too.
- `src/desk/AreaEditor.tsx`: a `Sheet` tinted with the Area color. It holds:
  - **Name**: an input with a local draft. Each non-empty change calls `renameArea`, so the label updates live. On close, an empty draft goes through `renameArea` and its empty rule. A new Area's editor selects the whole name on open.
  - **Color**: a `role="radiogroup"` of 12 swatches (native radios), each with an `aria-label` (translated color name) and a ring in `ink` when selected.
  - **Delete**: "Borrar área" opens an inline confirmation inside the sheet. It says "Sus N tarjetas pasan a" with a `<select>` of the other Areas, `nearestArea` chosen first, plus "Borrar" (danger) and "Cancelar". With no Cards it just asks "¿Borrar el área?". With one Area left, the button is disabled and a line explains why. After deleting: close, then the toast "Área borrada" with "N tarjetas pasaron a Trabajo" when Cards moved.
  - The body is keyed by Area id, like `EditorBody`, so a confirmation never carries over to another Area.
- `src/desk/AreasSection.tsx`, in Settings, after Theme: one row per Area (color dot + name, a button that opens the editor) and "Nueva área". `App` passes `onOpenArea(id)` / `onCreated(id)`, which close Settings first. Two sheets are never open at once, because `Sheet` is modal and its focus return assumes one.
- **New Area flow**: `createArea(t('newAreaName'))`, then close Settings, then `flyTo(areaView(area, viewport()))`, then `openAreaEditor(id, { isNew: true })`.

### 7. Twelve stronger Paper colors
The plan was 3 new calm tones (teal, olive, slate). After seeing the first implementation, the user asked for **more colors, and a bit stronger**. So the palette has 12 Area colors, every one more saturated than before (the original five included), added to `@theme static` and the dark block:

| Token | Light | Dark |
|---|---|---|
| sage | `#5F9460` | `#8FC289` |
| sand | `#C29236` | `#E2B55A` |
| sky | `#4C84C2` | `#7DB0E6` |
| plum | `#8F5CAB` | `#BB88D6` |
| rose | `#C45A82` | `#EC88A8` |
| teal | `#2F8F86` | `#5CC3B7` |
| olive | `#858C32` | `#BFC866` |
| slate | `#5D7193` | `#92A8CC` |
| indigo | `#5B62C7` | `#979CF2` |
| turquoise | `#2595B3` | `#5BC6E2` |
| pine | `#34875A` | `#6CC690` |
| berry | `#AD4688` | `#E477BD` |

Indigo, turquoise, pine and berry fill the empty parts of the hue wheel. None is orange: the accent (`#B85A3A`, a warm terracotta) stays apart, and rose and berry lean pink and magenta. The Area and Card tints are a little stronger too (`--area-tint` 17% / 14%, `--card-tint` 10% / 14%, light / dark). Checked on a Desk with 12 Areas in both themes (tint, label, Card, Jar piece, swatch). The values live only in CSS, never in TypeScript.

### 8. ADR and glossary
- **ADR 0007, "Areas the user shapes"**: Areas become user-edited regions that can move and be resized. Their Desk Cards travel with a moved Area, and Areas never overlap. It refines ADR 0001 without contradicting it. MTF still never decides where a Card goes: the user moves the Area, and its Cards come along as a group. It is hard to reverse because users will lay out their Desk around it.
- **GLOSSARY**: **Area** sharpened (user-created, renamed, recolored, moved with its Cards, resized, deleted with a chosen destination, never overlapping). New term: **Area editor** (ES "editor del área").

## Risks / Trade-offs

- [The label press changes from `pan` to `pending`] → On touch a press that moves > 9 px before the hold still pans, so swiping across a big label is unchanged. On a mouse, a drag on a label now moves the Area instead of panning. Panning by dragging empty paper and two-finger scroll stay. Covered by unit tests on `releaseOutcome` and an e2e swipe test.
- [Carried Cards pile up in the destination after a delete (`spotIn` is random)] → The same trade-off the Place selector already makes. Tidy up is one tap away. The toast says where they went.
- [Labels wider than a small Area] → A 40-character name at 68 px is wider than 520 px. Labels are never clipped (Areas don't clip), so it overflows onto the paper. Acceptable for a personal notepad, and noted in the KB.
- [A Card of another Area left inside a moved or resized Area] → Areas are not containers: a Card's Area is decided when *the Card* is dropped. The Card keeps its own color, which shows it belongs elsewhere. Moving it once fixes it.
- [A Backup with a new color is refused by an older MTF] → Backups move data between devices running the same deployed app. The refusal is the existing "damaged" message, with no data change.
- [Many Cards in a moved Area] → Writing `translate` to N elements per frame. N is notepad-sized (tens), and Card drags already write per frame. Measured in the phone check task.

## Migration Plan

None: no schema change. Existing documents keep their Areas. The first edit writes a normal `updatedAt`. Rollback is a plain revert. An older build still loads the document, because `loadData()` checks only the outer shape, but an Area in one of the three new colors would have no paint. Acceptable, since rollback is not a planned path.
