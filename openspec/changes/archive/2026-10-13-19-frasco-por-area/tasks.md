# Tasks

## 1. Rules (pure)

- [x] 1.1 Add `areaJarRect(rect)`, `isOverAreaJar(jar, point)` and `jarTarget(areas, point, { areaJars, far })` to `src/wins/jarLayout.ts` (design.md §1, §3); verify in `jarLayout.test.ts`: the default Vida rect gives a 104 × 120 Jar 24 px from its right edge and 16 px from its top, ending above 140 px; a point over an Area Jar returns that Area's id, over the Desk Jar `null` area, elsewhere `null`; with `areaJars: false` or `far: true` an Area Jar is never returned
- [x] 1.2 Add `eventsOfArea(events, cards, areaId)` to `src/wins/stats.ts` and an optional Area to `useWinStats` (design.md §6); verify in `stats.test.ts` / `useWinStats.test.ts`: an event counts in its Card's current Area, not its snapshot; an event with no Card falls back to its snapshot; the per-Area `done` counts add up to the global one; `useWinStats()` with no Area is unchanged

## 2. Store and device storage

- [x] 2.1 Add `loadAreaJars()` / `saveAreaJars(on)` for the device key `mtf_area_jars` to `src/lib/storage.ts`, and `areaJars` / `setAreaJars(on)` to `appStore`, left alone by `replaceData` (design.md §8); verify in `storage.test.ts` (`'1'` reads on; missing, `'0'`, junk or a refused read read off) and `appStore.test.ts` (setting persists the key; an Import keeps it; turning it on or off leaves `data` the same object)
- [x] 2.2 Give `jarCard(id, { areaId? })` an optional target Area that sets `areaId` and `jarredAt` in one replacement (design.md §5); verify in `appStore.test.ts`: with another Area the Card is jarred in it in one save, and a Card without Items gets its Card Win with the new `areaId`; a missing target or the Card's own Area behaves as today; a Card with unchecked Items is refused with nothing written, target or not
- [x] 2.3 Add `winsAreaId`, `openWins(areaId = null)` and `setWinsArea(id)` to `deskStore` (design.md §7); verify in `deskStore.test.ts`: `openWins()` opens on all, `openWins(id)` on that Area, `setWinsArea` switches it
- [x] 2.4 Update [KB/frontend/storage.md](../../../KB/frontend/storage.md) (the `mtf_area_jars` key, not in the Backup, no schema bump, the new storage functions) and [KB/frontend/architecture.md](../../../KB/frontend/architecture.md) (`areaJars` / `setAreaJars`, `jarCard` with a target, `winsAreaId`, Wins by Area at read time); verify every name written exists in the code

## 3. Area Jars on the Desk

- [x] 3.1 Extract `JarGlass` from `Jar.tsx` (compact variant with the count only, `useId` clip path) and keep the Desk Jar's look and `data-jar=""` (design.md §2); verify `Jar.test.tsx` still passes and a new case renders two Jars with distinct clip path ids
- [x] 3.2 Add `AreaJar` (`src/wins/AreaJar.tsx`): `data-jar={area.id}`, the Area's Cards in the Jar, `areaJarName` as accessible name, keyboard `onClick` → `openWins(area.id)`, hidden under `group-data-far`; render it inside `AreaRegion`'s wrapper at `left: calc(var(--w) - 128px)` when `appStore.areaJars` is on, with the per-Area Jar Cards passed from `Desk`; add the ES/EN strings (design.md §9); verify in a new `AreaJar.test.tsx`: count and accessible name, `Enter` opens Mis logros on that Area, no Area Jar is rendered with the option off; the i18n key-parity test passes
- [x] 3.3 In `Desk.tsx`, use `jarTarget` in `follow()` and `drop()`: `data-over` on the targeted Jar only, cleared from all in `settle()`; accept / refuse toward the target's center; `beginPress` records `jarAreaId` and the tap outcome calls `openWins(jarAreaId)`; `jarElement` and `feedback.jarred(areaId?)` select `[data-jar="…"]` (design.md §3); verify the existing `jar.spec.ts` still passes and, in the dev server, a drop on the own Area Jar is accepted and a refused one slides back
- [x] 3.4 Add `JarMoveSheet` (`src/wins/`, tinted `Sheet` with the question, Sí `primary` and No) and the Desk's `asking` state: the Card waits lifted; Sí → shrink to that Area Jar, `jarCard(id, { areaId })`, `jarred(areaId)`; No / `Esc` / scrim → slide back, nothing written; a refused Card never asks (design.md §4); verify in a new `JarMoveSheet.test.tsx` (question names the Area; Sí, No and `Esc` call the right handler) and in the dev server
- [x] 3.5 Write `e2e/area-jars.spec.ts`: with the option off no Area Jar shows; turn it on in Settings → every Area shows its Jar; mouse-drop a finished Card on its own Area Jar → accepted, both Jars count it; drop a Card with unchecked Items → refused, no question; drop a finished Card on another Area's Jar → the question, No → back in place and Area, Sí → in the Jar under the new Area (Mis logros list), survives a reload; zoom out to the far look → no Area Jar, a drop there places the Card; tap an Area Jar → Mis logros filtered; phone project: hold and drag onto an Area Jar with `Touch.drag`; verify `command npm run test:e2e` passes on both projects
- [x] 3.6 Update [KB/frontend/desk.md](../../../KB/frontend/desk.md) (files table, gestures table, "The Jar": Area Jars, `jarTarget`, the question, `data-jar` values, far look) and [KB/frontend/testing.md](../../../KB/frontend/testing.md) (the Area Jars e2e notes); verify every function named exists

## 4. Settings and Mis logros

- [x] 4.1 Add the "Frasco por área" No / Sí `Segmented` to `AreasSection` after "Acomodar áreas" (design.md §8); verify in `AreasSection.test.tsx`: it shows No by default, Sí calls `setAreaJars(true)` and Settings stays open, and it uses no accent class
- [x] 4.2 Extend `Segmented` with optional `dot?: AreaColor` per option and wrapping (design.md §7); verify in `Segmented.test.tsx`: a dot renders only when given, `aria-pressed` is unchanged, and the Language and Theme groups in `App.test.tsx` still pass; update the `Segmented` row in [KB/frontend/design-system.md](../../../KB/frontend/design-system.md)
- [x] 4.3 Add the Area filter to `MisLogros`: shown only while `areaJars` is on, "Todas" plus every Area with its dot, the effective Area falling back to all for an unknown id, every number and the Jar list filtered (design.md §6, §7); verify in `MisLogros.test.tsx`: no filter with the option off; with Trabajo 3 and Vida 2 things done, Vida shows 2 and only Vida's Jar Cards, "Todas" shows 5; a quiet Area reads "Los días tranquilos también cuentan."; the wins counter stays global

## 5. Docs and integration

- [x] 5.1 Update [GLOSSARY.md](../../../GLOSSARY.md): add **Area Jar** (ES "frasco del área") and the "Frasco por área" option, sharpen **Jar** (the Desk's Jar holds every Card) and **Mis logros** (the Area filter, Wins in their Card's current Area); tick #19 in [KB/roadmap.md](../../../KB/roadmap.md) under Small tickets; verify the terms match the UI copy
- [x] 5.2 Clean-code pass over the new code (one drop path for both Jars, one `jarTarget` for highlight and drop, `data-jar` lookups in one helper, names consistent with the Desk Jar, comments only where the why is not obvious); verify lint and tests still pass
- [x] 5.3 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass with no warnings, and fill Technical Context / Modified Files in `KB/developers/active.md`
- [x] 5.4 Check by hand in the dev server at phone and desktop width, in light and dark, with the option on: Area Jars in the default row, Tabla and Estrella, a narrow 520 px Area with a long name, the question and both answers, the far look, the Mis logros filter with 12 Areas on a phone; verify nothing overlaps badly and no accent appears outside the Jars
- [x] 5.5 (User) On a real Android phone and an iPhone, installed: turn the option on, drop a finished Card on its Area Jar while zoomed in on a list, drop one on another Area's Jar and answer Sí and No, open Mis logros from an Area Jar; verify each works with press and hold

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (merges the `jar` and `wins` deltas into `openspec/specs/`), then the user commits, pushes and opens the PR.
- After the merge, on an up-to-date `main`: `/close-ticket`.
