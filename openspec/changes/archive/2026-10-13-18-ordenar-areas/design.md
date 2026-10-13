# Design

## Context

See [proposal.md](proposal.md) for why, and the delta specs for the behavior ([areas](specs/areas/spec.md), [jar](specs/jar/spec.md)).

What already exists and shapes the approach:

- **Areas are stored rects** (`Area.rect`, Desk coordinates). The default row is built by `defaultAreas` from `ROW_ORIGIN` (80, 120), 980 × 1000, `AREA_GAP` 80; new Areas go to `freeSlot`, a grid of 3 per row with `ROW_GAP` 160 between rows (`src/desk/areas.ts`).
- **Moving an Area moves its Desk Cards** in the same `data` replacement (`moveArea` in `src/store/appStore.ts`, [ADR 0007](../../../docs/adr/0007-areas-the-user-shapes.md)). The Desk checks overlap before calling it; the store trusts the caller.
- **The Jar is derived, never stored**: `jarRect(areas)` centers it 50 px below the Areas' bounding box (`src/wins/jarLayout.ts`). `deskBounds` includes it, so See all and the initial view follow it.
- **Tidy up animates through one flag**: `deskStore.animateTidy()` sets `tidying` for 560 ms, the Desk writes `data-tidying` on the world `div`, and Cards transition their `transform` under `group-data-tidying`. Reduced motion drops every transition in global CSS.
- **Device settings** (language, theme, hint seen) are separate localStorage keys behind `src/lib/storage.ts`, outside `mtf_data` and outside the Backup.
- **In-place confirmation** already exists: "Borrar área" in `AreaEditor.tsx` swaps its button for a question with Cancelar / Borrar.
- Spanish "Ordenar" is already Tidy up (`tidyUp`), so the new action is named "Acomodar".

## Goals / Non-Goals

**Goals:**

- Every arrangement is a pure function from the Areas (and the saved arrangement) to target rects, unit-tested for "no overlap, sizes kept" with Areas of mixed sizes.
- One store write per arrangement, reusing the "Cards travel with their Area" rule instead of re-implementing it.
- The Jar rule stays derived: no stored Jar place, no knowledge of which arrangement was last chosen.

**Non-Goals:**

- No new gesture and no change to the Desk's gesture controller.
- No schema bump, no Backup change, no migration.
- No change to `freeSlot` for new Areas: it keeps its 3-per-row grid.

## Decisions

### 1. A pure `arrange.ts` returns target rects

`src/desk/arrange.ts` exports, each returning `Map<AreaId, Rect>` (every Area's target rect, sizes kept, integers):

- `rowArrangement(areas)`: tops at `ROW_ORIGIN.y`, x accumulating each width plus `AREA_GAP`, in list order. For the three default Areas this returns exactly their `defaultAreas` rects, which a test pins down.
- `gridArrangement(areas)`: `cols = ceil(sqrt(n))`, filled row by row in list order. Each column is as wide as its widest Area and each row as tall as its tallest, separated by `AREA_GAP` across and `ROW_GAP` down, from `ROW_ORIGIN`. Areas sit at the top-left of their cell.
- `starArrangement(areas)`: one Area → `rowArrangement`. Otherwise each Area's center goes on a ring at angle `-90° + k · 360° / n` (two Areas: 180° and 0°, so left and right), radius `R`. `R` grows from 0 in 20 px steps until (a) no two Areas are closer than `AREA_GAP` and (b) the centered Jar block (see decision 2), grown by its 50 px gap, overlaps no Area. The result is then shifted so its bounding box starts at `ROW_ORIGIN`. Condition (b) checks the same function `jarRect` uses, so the hole is exactly where the Jar will go. Since the ring is not symmetric for odd `n`, the hole is at the bounding-box center, not the ring center.
- `savedArrangement(areas, saved)`: Areas in `saved` get their saved rect; the rest, in list order, get `freeSlot` against the rects placed so far.
- `isRecoverable(areas, saved)`: true when every Area's current rect equals its rect in `saved`, or in `rowArrangement`, `gridArrangement` or `starArrangement`. It drives the confirmation.

`ROW_ORIGIN`, `AREA_GAP` and `ROW_GAP` are exported from `areas.ts` so both modules share one source.

*Why ceil(sqrt(n)) columns for Tabla, not `freeSlot`'s 3?* With 3 columns, Tabla would equal Fila for the default Desk and for any Desk of up to 3 Areas, so the choice would look broken. A square-ish grid differs from the row from 3 Areas on and fits a phone screen better.

*Why a radius search instead of a closed formula for Estrella?* Areas have different sizes since #7; a formula that guarantees no overlap for mixed sizes and an odd ring is fragile. The search is bounded (`R` only grows, and every condition is met once `R` is large enough), deterministic and cheap for at most a few dozen Areas.

### 2. The Jar goes to the center when it fits

`jarRect(areas)` first tries the Jar block (the Jar plus its caption, i.e. `jarBounds`) centered on the Areas' bounding box. If that block, grown by the existing 50 px `JAR_GAP`, overlaps no Area, the Jar goes there; otherwise it goes centered below, as today.

- For the default row, Fila and Tabla, an Area or a gap narrower than the Jar is at the center, so nothing changes for existing Desks in those shapes (tests pin the default (1500, 1170)).
- *Alternative considered:* store the Jar's place, or the last arrangement chosen. Rejected: a stored place must be kept in sync with every Area move, resize and Backup, and "last arrangement" would be wrong after any hand move. A derived rule follows every Desk for free.

### 3. One store action, `arrangeAreas(targets)`

`arrangeAreas(targets: ReadonlyMap<AreaId, Rect>)` writes, in one `data` replacement, every Area whose rect changed (new rect, `updatedAt`) and every Desk Card of those Areas shifted by its Area's top-left delta (`updatedAt`; tilt, `z` and Area kept). Cards in the Jar are untouched. No change → the same `data` (no save).

`moveArea` and `arrangeAreas` share one helper that shifts an Area's Desk Cards, so the rule from ADR 0007 lives in one place. Like `moveArea`, the store does not check overlap: the targets come from `arrange.ts`, whose tests guarantee it.

### 4. "Mi disposición" is a device key, `mtf_arrangement`

`{ rects: Record<AreaId, Rect>, savedAt: number }`, behind `loadArrangement()` / `saveArrangement()` in `src/lib/storage.ts`. `loadArrangement` returns `null` for anything that is not an object of finite-number rects, so a damaged key just means "nothing saved". The app store holds it as `arrangement` (loaded on create, like `theme`) with `saveArrangement()` taking the current rects; Import (`replaceData`) leaves it alone.

- Chosen by the user during exploration: no schema bump, no Backup format change ([ADR 0006](../../../docs/adr/0006-backup-file-format.md)), and an older MTF still reads a newer Backup.
- It is not a `mtf_data` entity, so the "uuid + createdAt / updatedAt" rule does not apply; it is a device setting like the theme.
- "Mi disposición" is available when `arrangement` has a rect for at least one current Area. After an Import with other Area ids, it is simply unavailable.

### 5. The Settings group and its confirmation

`AreasSection` gains, under the Area list and "Nueva área", an "Acomodar áreas" group: four `Button`s (Fila, Tabla, Estrella, Mi disposición, wrapping on narrow screens) and "Guardar esta disposición". `Segmented` is not used: it shows a current value, and an arrangement is an action with none.

Choosing one computes the targets. If `isRecoverable` is false, the group swaps its buttons for the question "Tu disposición actual no está guardada. ¿Acomodar igual?" with Cancelar / Acomodar, the way "Borrar área" does; local state, reset when Settings closes. Then `onArranged(targets)` goes up to `App`, which closes Settings, calls `animateTidy()`, `arrangeAreas(targets)` and `showWholeDesk()`. "Guardar esta disposición" saves and shows the toast "Disposición guardada"; Settings stays open.

### 6. Animation reuses Tidy up's flag

The Cards already transition `transform` under `group-data-tidying`. The Area wrapper (`AreaRegion`, placed by `left` / `top`) gains a `left` / `top` transition under the same world attribute, with Tidy up's 0.5 s easing. Both slide together while See all flies. Under reduced motion the global CSS drops the transitions, so Areas and Cards are there at once, as the spec asks, with no extra code. The flag keeps its name: it means "the Desk is rearranging things", which now covers both.

### 7. No new ADR

Nothing here is hard to reverse: the device key can be dropped or moved into `mtf_data` later with a normal migration, the Jar rule is derived, and ADR 0007 still holds (the user arranges the Desk; an arrangement is one more way to move Areas, as a group, and it never locks them). The design records the decisions; `GLOSSARY.md` gets **Arrange**, **Arrangement** and **My arrangement**, and the **Jar** entry's "centered below the Areas" is sharpened.

## Risks / Trade-offs

- [A hand-made Desk with an empty middle now gets the Jar in the middle] → It is the same rule that makes Estrella work, the Jar never overlaps an Area, and See all still includes it. Covered by a test with Areas in a square around an empty center.
- [Cards of another Area may end up inside a region an arrangement moved an Area onto] → Same rule as a hand move (ADR 0007): Cards never change Area by being under one. They stay reachable through the Dock, search and the Place selector.
- [Estrella with many large Areas makes a very wide Desk; on a phone See all may hit the 8% floor] → Same limit as any large Desk; See all already shows the middle at 8%. Not worth a special case.
- [Jar jumps when a hand move opens or closes the center] → It moves only on release (the rect is written on drop), like it already does when a new Area adds a row.
- [`isRecoverable` compares exact rects] → All targets and moves are rounded integers, so equality is reliable; a test covers a Desk moved by 1 px.

## Migration Plan

None. No `mtf_arrangement` key means nothing saved; existing Desks keep their rects, and the Jar stays where it is for the default row, Fila and Tabla. Rollback is a plain revert: the extra key is ignored by older code.
