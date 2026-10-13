# Proposal

## Why

Since #7 the user shapes the Desk by hand: Areas are created in the next free slot, moved by their label and resized from their corner. With several Areas, getting them back into a tidy shape means dragging each one, and there is no way to come back to a shape you liked. Issue #18 asks for a one-tap way to lay the Areas out (row, grid, star) and for one saved arrangement of the user's own to return to.

## What Changes

- **Arrange the Areas** (ES "Acomodar áreas", EN "Arrange areas"): a new group in Settings → Áreas with four choices: **Fila** (row), **Tabla** (grid), **Estrella** (star) and **Mi disposición** (my arrangement). Choosing one closes Settings, moves every Area to its new place with an animation and shows the whole Desk.
  - The label is "Acomodar", not "Ordenar": "Ordenar" is already the Spanish name of Tidy up, which arranges Cards, not Areas.
- **It is an action, not a mode.** Nothing stays locked: after arranging, Areas move and resize by hand as before ([ADR 0007](../../../docs/adr/0007-areas-the-user-shapes.md)), and a new Area still takes the first free slot.
- **Cards travel with their Area**, as in a hand move: every Card of an Area on the Desk shifts by the distance its Area moved. No Card changes Area. Cards in the Jar are untouched.
- **No overlap, whatever the sizes.** Each Area keeps its size; row, grid and star place Areas of different sizes without overlapping.
- **Star puts the Jar in the middle.** The Areas form a ring around an empty center, and the Jar's derived place gains one rule: it sits at the center of the Areas when that space is free of Areas, and below them, as today, otherwise. Row and grid keep the Jar below.
- **My arrangement**: "Guardar esta disposición" (Save this arrangement) stores where every Area is, in a single slot that each save replaces. Choosing "Mi disposición" brings the saved Areas back to their saved place and size, with their Cards; Areas created since go to the first free slot, deleted ones are ignored. It is unavailable until something is saved.
  - Stored **on the device**, like the theme and the language (`mtf_arrangement`): it does not travel in a Backup, and the stored document (`mtf_data`) and the Backup format do not change.
- **No arrangement is lost without asking.** When the current arrangement is neither the saved one nor what one of the three shapes would produce, choosing another one first asks for confirmation in place ("Tu disposición actual no está guardada. ¿Acomodar igual?" · Acomodar · Cancelar), the way "Borrar área" does.
- Works the same with touch and with mouse or keyboard: it is made of buttons in a sheet, with no gesture. With reduced motion the Areas and Cards jump to their places with no animation.

### Acceptance criteria → scope

| #18 criterion | Covered by |
|---|---|
| Settings → Áreas offers row, grid and star; Areas animate and take their Cards | Arrange the Areas; Cards travel with their Area |
| No arrangement overlaps Areas, whatever their sizes | No overlap, whatever the sizes |
| Areas can still be moved and resized by hand afterwards | An action, not a mode |
| One saved arrangement, replaced by each save; restoring it places new Areas in a free slot and ignores deleted ones | My arrangement |
| Star: the Jar in the center; below when an Area takes the center | Star puts the Jar in the middle |
| Touch and mouse; tests green (Vitest + Playwright) | Buttons only; unit, component and Playwright tests |

### Out of scope

- **More than one saved arrangement**, or named ones: a single slot was chosen during exploration.
- **Carrying "Mi disposición" in the Backup** or syncing it: it is a device setting. Syncing it, if ever wanted, belongs with V2 sync.
- **Arrangement as a lasting mode** that keeps Areas locked in a shape.
- **Moving the Jar by hand** or storing its place: it stays derived from the Areas.
- **One Jar per Area** (#19) and the **welcome Card** (#20): their own tickets.
- No change to Tidy up: it still arranges Cards inside their Areas and never moves an Area.

## Capabilities

### New Capabilities

None. Arranging Areas belongs to the existing `areas` capability, which owns how the user shapes the Desk's Areas.

### Modified Capabilities

- `areas`: adds arranging the Areas (row, grid, star), saving and restoring my arrangement, and the confirmation before an unsaved arrangement is lost.
- `jar`: "The Jar on the Desk" changes from "centered below the Areas" to "at the center of the Areas when that space is free, otherwise centered below them".

## Impact

- **Code**: a new pure module `src/desk/arrange.ts` (row, grid, star, restore, "is this arrangement recoverable"); `jarRect` in `src/wins/jarLayout.ts` (center rule); a new `arrangeAreas` store action in `src/store/appStore.ts` that writes every Area and their Desk Cards in one replacement; `src/lib/storage.ts` gains `loadArrangement` / `saveArrangement` for the device key `mtf_arrangement`; `AreasSection.tsx` gains the arrange group; `App.tsx` closes Settings and shows the Desk; the Area wrapper and Cards animate during an arrangement; i18n strings in ES and EN.
- **Data**: no schema change, no Backup change. One new device key, `mtf_arrangement`.
- **Docs**: KB `desk.md`, `storage.md`, `architecture.md` (new action), `GLOSSARY.md` (Arrange, Arrangement, My arrangement), `KB/roadmap.md`.
- **Tests**: unit tests for the layouts and the Jar rule, component tests for the Settings group and its confirmation, Playwright for arranging on desktop and phone projects.
- **Dependencies**: none.
