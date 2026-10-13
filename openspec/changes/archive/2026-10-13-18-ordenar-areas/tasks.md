# Tasks

## 1. Arrangement rules (pure)

- [x] 1.1 Export `ROW_ORIGIN`, `AREA_GAP` and `ROW_GAP` from `src/desk/areas.ts` and use them in a new `src/desk/arrange.ts` with `rowArrangement` and `gridArrangement` (design.md §1); verify in `arrange.test.ts`: Fila of the three default Areas returns exactly their `defaultAreas` rects; Fila of four Areas is one row in list order with tops aligned and 80 px gaps; Tabla gives 2 columns for 3 and 4 Areas and 3 columns for 5 (3 + 2); a column is as wide as its widest Area and a row as tall as its tallest; sizes are kept and every value is an integer
- [x] 1.2 Change `jarRect` in `src/wins/jarLayout.ts` to try the Jar block (`jarBounds`) centered on the Areas' bounding box first, kept when, grown by `JAR_GAP`, it overlaps no Area, and to fall back to centered below (design.md §2); verify in `jarLayout.test.ts`: the default row still gives (1500, 1170); a row of 4 and a 2 × 2 Tabla keep the Jar below; four Areas in a square around an empty center get the Jar in the middle, overlapping no Area
- [x] 1.3 Add `starArrangement` to `arrange.ts`: one Area → Fila; otherwise a ring from the top, clockwise (two Areas: left and right), radius grown in 20 px steps until no two Areas are closer than `AREA_GAP` and the centered Jar block fits, then shifted to start at `ROW_ORIGIN` (design.md §1); verify in `arrange.test.ts` for 2, 3, 5 and 12 Areas, with equal sizes and with one Area twice as big: no overlap, sizes kept, the first Area is the topmost (left one for 2), and `jarRect` of the result is the centered one, overlapping no Area
- [x] 1.4 Add `savedArrangement(areas, saved)` and `isRecoverable(areas, saved)` to `arrange.ts`; verify in `arrange.test.ts`: saved Areas get their saved rect; an Area missing from `saved` takes `freeSlot` against the placed rects, without overlap; saved ids no longer present are ignored; `isRecoverable` is true for the default Desk with nothing saved, for any Desk equal to Fila, Tabla, Estrella or the saved rects, and false after a 1 px hand move

## 2. Store and device storage

- [x] 2.1 Add `loadArrangement()` / `saveArrangement(arrangement)` for the device key `mtf_arrangement` (`{ rects, savedAt }`) to `src/lib/storage.ts`, returning `null` for a missing or malformed value (design.md §4); verify in `storage.test.ts`: a saved value reads back, and invalid JSON, a non-object, or a rect with a non-finite number give `null` without throwing
- [x] 2.2 Add `arrangeAreas(targets)` to `appStore`, sharing with `moveArea` one helper that shifts an Area's Desk Cards (design.md §3); verify in `appStore.test.ts`: changed Areas get the target rect and `updatedAt`; their Desk Cards shift by the Area's delta keeping Area, tilt and `z`; Jar Cards and Cards of unmoved Areas are untouched; identical targets leave `data` the same object; the existing `moveArea` tests still pass
- [x] 2.3 Add `arrangement` (loaded on create) and `saveArrangement()` (the current rects, `savedAt` now) to `appStore`; leave it untouched in `replaceData`; verify in `appStore.test.ts`: saving stores every Area's rect and persists the key, saving again replaces it, and an Import keeps the saved arrangement
- [x] 2.4 Update [KB/frontend/storage.md](../../../KB/frontend/storage.md) (the `mtf_arrangement` device key, not in the Backup, no schema bump) and [KB/frontend/architecture.md](../../../KB/frontend/architecture.md) (`arrangeAreas` in one `data` replacement, the shared Card-shift helper, `arrangement` / `saveArrangement`); verify every name written exists in the code

## 3. Settings: "Acomodar áreas"

- [x] 3.1 Add the ES/EN strings: Acomodar áreas / Arrange areas, Fila / Row, Tabla / Grid, Estrella / Star, Mi disposición / My arrangement, Guardar esta disposición / Save this arrangement, Disposición guardada / Arrangement saved, the confirmation "Tu disposición actual no está guardada. ¿Acomodar igual?" / "Your current arrangement isn't saved. Arrange anyway?", Acomodar / Arrange; verify the i18n test that both dictionaries share every key passes
- [x] 3.2 Add the "Acomodar áreas" group to `AreasSection.tsx`: four `Button`s that wrap on narrow screens, "Mi disposición" disabled while no saved rect matches a current Area, "Guardar esta disposición" (toast, Settings stays open), and the in-place confirmation when `isRecoverable` is false (design.md §5); reports the targets through a new `onArranged` prop; verify in a new `AreasSection.test.tsx`: Fila on the default Desk reports targets without asking; after a hand move it asks, Cancelar reports nothing and Acomodar reports the targets; "Mi disposición" is disabled until a save; no element uses the accent class
- [x] 3.3 In `App.tsx`, handle `onArranged`: close Settings, `animateTidy()`, `arrangeAreas(targets)`, `showWholeDesk()`; verify in `App.test.tsx`: choosing Tabla with four Areas closes Settings and stores the 2 × 2 rects, and the Dock still lists every Area

## 4. Desk animation

- [x] 4.1 Give the `AreaRegion` wrapper a `left` / `top` transition under the world's `data-tidying`, with Tidy up's duration and easing, dropped under reduced motion (design.md §6); verify the existing Area move and slide-back e2e tests still pass and, in the dev server, Areas and their Cards slide together on Tabla and appear at once with reduced motion emulated
- [x] 4.2 Write `e2e/arrange.spec.ts`: on the default Desk create two Areas, choose Tabla in Settings → the Areas are in a 2-column grid with their Cards inside them and no overlap; choose Estrella → the Jar is in the middle of the ring and can still receive a finished Card; move an Area by hand, choose Fila → the confirmation appears, Cancelar changes nothing, Acomodar arranges; save an arrangement, choose Estrella, choose Mi disposición → back to the saved places; reload → the arrangement and "Mi disposición" survive; verify `command npm run test:e2e` passes on both projects (desktop and phone)
- [x] 4.3 Update [KB/frontend/desk.md](../../../KB/frontend/desk.md): files table (`arrange.ts`), a new "Arranging the Areas" subsection (Fila, Tabla, Estrella, Mi disposición, the confirmation, the animation through `data-tidying`) and The Jar's "Place" bullet (center when free, otherwise below); verify every function named exists

## 5. Docs and integration

- [x] 5.1 Update [GLOSSARY.md](../../../GLOSSARY.md): add **Arrange** (ES "Acomodar"), **Arrangement** (ES "disposición") and **My arrangement** (ES "Mi disposición"), add "Arrange" to Tidy up's _Avoid_ list, and sharpen the **Jar** entry's place; tick #18 in [KB/roadmap.md](../../../KB/roadmap.md) under Small tickets; verify the terms match the UI copy
- [x] 5.2 Clean-code pass over the new code (one Card-shift rule shared by `moveArea` and `arrangeAreas`, layout constants from `areas.ts` only, names consistent with Tidy up and the Area editor, comments only where the why is not obvious); verify lint and tests still pass
- [x] 5.3 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass with no warnings, and fill Technical Context / Modified Files in `KB/developers/active.md`
- [x] 5.4 Check by hand in the dev server at phone and desktop width, in light and dark: Fila, Tabla and Estrella with 1, 2, 3, 5 and 8 Areas of mixed sizes, the Jar in the middle of the star, the confirmation, save and return, See all after each arrangement; verify nothing overlaps and the Desk fits sensibly
- [x] 5.5 (User) On a real Android phone and an iPhone, installed: arrange as Tabla and Estrella, save and return to "Mi disposición", move an Area by hand afterwards, drop a finished Card on the centered Jar; verify each works and the slide stays smooth with ~20 Cards

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (merges the `areas` and `jar` deltas into `openspec/specs/`), then the user commits, pushes and opens the PR.
- After the merge, on an up-to-date `main`: `/close-ticket`.
