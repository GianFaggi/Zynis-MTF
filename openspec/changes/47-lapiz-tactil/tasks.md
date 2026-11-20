# Tasks

Groups 1–2 build the data and the pure ink rules, group 3 the box in the editor, group 4 the Desk side, group 5 the end-to-end flows. Group 7 needs the user: checks with a real Apple Pencil and graphics tablet. Read CLAUDE.md and the KB of each area first (`storage.md`, `desk.md`, `architecture.md`, `design-system.md`, `testing.md`). `command npm test` stays green throughout. `api/` is not touched.

## 1. Data, setting and dependency

- [x] 1.1 Add `Ink` and the optional `Card.ink` to `src/types/index.ts`, with `INK_WIDTH` 1000, initial height 400, `INK_MAX_HEIGHT` 2500 and `INK_MAX_POINTS` 12 000 as named constants in `src/ink/constants.ts` (design D2, D3, D7); verify `command npm run build` type-checks
- [x] 1.2 Add `hasInk(card)` to `src/desk/cardText.ts` and count handwriting in `isEmptyCard` (design D4); verify `cardText.test.ts`: a Card with only one stroke is not empty, a Card with `ink.strokes` empty or no `ink` and no text is empty, `displayTitle` of a handwriting-only Card is still `''`
- [x] 1.3 Add `setInk(id, ink | null)` to `appStore` (one `data` replacement, `updatedAt` bumped, `null` removes the field) and make `closeCard` remove an `ink` with no strokes and keep a handwriting-only Card (recording its `note` when new) (design D4); verify `appStore.test.ts`: setting, replacing and removing ink; closing with an empty box leaves no `ink`; a new handwriting-only Card is kept with one `note` event; the Card's other fields are untouched
- [x] 1.4 Add the device key `mtf_handwriting` (`loadHandwriting`, `saveHandwriting`) to `src/lib/storage.ts` and `handwriting` / `setHandwriting` to `appStore`, like `mtf_area_jars` (design D9); verify `storage.test.ts`: missing, `'0'` and any other value read as off, `'1'` as on, a refused read is off and never throws
- [x] 1.5 Accept an optional, well-formed `ink` on Cards in `src/backup/validate.ts` (design D10); verify `validate.test.ts` and `backup.test.ts`: a Card with valid ink passes; a Card with no `ink` passes; `height` missing, non-integer or above the maximum, `strokes` not an array, a stroke whose length is not a multiple of 3, or a non-finite number makes the file damaged; an export → import round trip with ink is equal field by field
- [x] 1.6 Install `perfect-freehand` with `command npm install perfect-freehand` (design D8); verify it is in `dependencies` of `package.json` and in `package-lock.json`, and that `command npm ci` succeeds
- [x] 1.7 Write ADR 0013 "Handwriting as optional ink on the Card" (the format, box coordinates, why no schema bump, the older-deploy risk, why not PNG), add **Handwriting** to `GLOSSARY.md`, and update `KB/frontend/storage.md` (the `ink` field in the entity shapes, the `mtf_handwriting` key row, the storage API rows, "Handwriting (#47) needs no schema bump") and `KB/frontend/stack.md` (perfect-freehand row and its justification); verify `command npm test` passes and every new link resolves

## 2. Pure ink rules (`src/ink/`)

- [x] 2.1 Write `src/ink/geometry.ts`: screen point → box point (scale to `INK_WIDTH`, round, clamp to the box), pressure normalization (no real pressure or 0 → 50, else 0–100), the 2-unit point skip, RDP simplification, the growth rule (`height + 250` when a stroke ends below `height - 120`, capped) and the point count against `INK_MAX_POINTS` (design D3, D7); verify `geometry.test.ts` for each rule, including a point outside the box clamped to its edge, growth never moving existing points, and a stroke past the limit reported as not fitting
- [x] 2.2 Write `src/ink/input.ts` with the pointer decision of design D5 (`shouldDraw({ pointerType, penSeen })`, pen during a live touch stroke → discard it, eraser end from `buttons & 32`); verify `input.test.ts` covers every cell of the D5 table and the palm-first case
- [x] 2.3 Write `src/ink/erase.ts` (strokes hit by an eraser path, point-to-segment distance under the radius, design D6); verify `erase.test.ts`: a path crossing one stroke removes only that one, a path near but not touching removes nothing, a single-point stroke can be erased
- [x] 2.4 Write `src/ink/render.ts` (`inkPaths(ink)` with perfect-freehand and the `WeakMap` cache, design D8); verify `render.test.ts`: one `d` string per stroke, the same stroke array returns the cached string, a one-point stroke still renders a dot

## 3. The handwriting box in the editor

- [x] 3.1 Write `src/ink/InkView.tsx` (read-only SVG, `viewBox="0 0 1000 {height}"`, `fill: currentColor` on the ink token, optional `maxHeight` with a bottom fade, design D8); verify a component test renders one path per stroke and keeps the aspect ratio
- [x] 3.2 Write `src/ink/InkBox.tsx`: Pointer Events with capture and coalesced points, the live stroke in a `requestAnimationFrame`, commit on `pointerup` through `setInk`, `pointercancel` drops the stroke, `penSeen` per mount, the eraser mode and pen eraser end, the undo stack (max 50), "Borrar todo" with second tap, the "Esta escritura está completa" line, growth, `touch-action: none` and no selection or callout, an accessible name (design D4–D7); verify `InkBox.test.ts` with stubbed `setPointerCapture`: a mouse stroke commits once on `pointerup`; touch draws until a pen `pointerdown`, then is ignored; a pen during a touch stroke discards it; undo takes back a stroke, an erase and a clear; "Borrar todo" needs two taps; a stroke past the limit is not kept and the message shows; nothing uses the accent class
- [x] 3.3 Put the box in `EditorBody` between the text area and the Items, and "A mano" beside "Añadir elemento" (shown only while `handwriting` is on and the Card has no `ink`; adds an empty box), with the Card's existing ink always shown whatever the setting (design D1); verify `CardEditor.test.tsx`: setting off and no ink → no offer and no box; setting on → "A mano" adds the box and disappears; setting off with ink → the box and tools show; closing with an empty box leaves no ink; "Llevar al frasco" is enabled for a handwriting-only Card
- [x] 3.4 Add the "Escritura a mano" No / Sí `Segmented` row to Settings after Tema in `App.tsx`, and every new string in `es.ts` / `en.ts` (setting, "A mano", Deshacer, Borrador, Borrar todo, its confirmation, the full message, the box name, "Escritura a mano" as a Card name); verify `App.test.tsx`: the row shows No on a fresh device, switching it is remembered after a re-render from storage, and `i18n.test.ts` finds every key in both languages
- [x] 3.5 Update `KB/frontend/design-system.md` (the ink token use, the box and its tool row, no accent) and `KB/frontend/architecture.md` (`src/ink/`, `setInk`, `appStore.handwriting`); verify `command npm test` and `command npm run lint` pass

## 4. Handwriting on the Desk

- [x] 4.1 Render `InkView` in `DeskCard` after the text (max 180 px with the fade), and in the far look when `displayTitle` is empty and the Card has ink; use "Escritura a mano" as the accessible-name fallback for a handwriting-only Card in `DeskCard` and in the `MisLogros` Jar list (design D8); verify `DeskCard.test.tsx` and the Mis logros test: title, text, handwriting and Items in that order; far look shows the handwriting only when there is no title, text or Item; the names fall back as specified
- [x] 4.2 Check that search ignores handwriting and that Tidy up places taller handwritten Cards without overlap; verify `search.test.ts` gets a handwriting-only Card that matches nothing, and a `tidy.test.ts` case with a taller measured height
- [x] 4.3 Check sync with a large handwritten Card: a Card over 60 KB makes the leave send use ordinary pushes, and a fetched Card with `ink` for the open editor waits in `held` (design D10); verify with `syncApi.test.ts` / `engine.test.ts` cases, and update `KB/frontend/desk.md` (handwriting on the Card, far look, the pen on the Desk still acts like the mouse); verify `command npm test` passes

## 5. End-to-end

- [x] 5.1 Write `e2e/handwriting.spec.ts`: turn the setting on, open a Card, add a box, draw with the mouse, close, reload, see the handwriting on the Card and in the editor; undo and "Borrar todo"; a handwriting-only Card survives closing the editor and goes to the Jar from the editor; verify `command npm run test:e2e` passes
- [x] 5.2 In the same spec, draw with touch (Playwright touch context) and then with a pen simulated through CDP `Input.dispatchMouseEvent` (`pointerType: 'pen'`, with pressure), and check that touch stops drawing after the pen; a stroke that ends outside the box does not close the editor; verify `command npm run test:e2e` passes
- [x] 5.3 Re-run the Desk gesture specs (`drag.spec.ts`, `desk.spec.ts`, `editor.spec.ts`, the Jar flows) with the setting on and a handwritten Card on the Desk, and add a check that dragging that Card and pinching the Desk behave as before; verify `command npm run test:e2e` passes
- [x] 5.4 Update `KB/frontend/testing.md` (the new specs, the CDP pen helper, why jsdom tests stub pointer capture); verify the documented commands run as written

## 6. Integration and docs

- [x] 6.1 Write the note `aprendizaje/escritura-a-mano.md` in Spanish (Pointer Events with `pointerType`, `pressure` and coalesced events, pointer capture, `touch-action`, palm rejection, what perfect-freehand does, why it is SVG and not an image, why MTF does not recognize text), linked from `aprendizaje/index.md`
- [x] 6.2 Update `KB/roadmap.md` (#47 with a summary) and `KB/developers/active.md` (modified files); verify every link in the edited KBs resolves
- [x] 6.3 Run `command npm test`, `command npm run lint`, `command npm run build` and `command npm run test:e2e`; verify all pass and `openspec validate 47-lapiz-tactil --strict` is valid

## 7. On real devices (user)

- [ ] 7.1 iPad with Apple Pencil (Safari and installed): turn the setting on, write a few lines, check thicker lines with more pressure, rest the palm while writing (no marks), undo, eraser, "Borrar todo"; check that Scribble still turns Pencil writing into text in the title and text fields; tune the feel constants of design D8 if needed
- [ ] 7.2 PC with a graphics tablet (Windows; macOS if available): write, check pressure, use the pen's eraser end; record in `KB/developers/active.md` whether the tablet arrives as `pen` or `mouse` on each OS and browser
- [ ] 7.3 Phone: write with a finger; then on the Desk, check that moving Cards, panning and pinching work as before with a handwritten Card present
- [ ] 7.4 Signed in on two devices: write on the iPad, leave, open the PC and see the same handwriting; export a Backup with handwriting and import it on another browser; record the results in `KB/developers/active.md`

## Workflow follow-up

- Group 7 can run on the dev server over the LAN or on the Vercel preview of the PR. The sync half of 7.4 needs an origin the API's CORS accepts. If the preview is refused, run that half after the merge on `mtf.zynis.com.ar` and archive in a follow-up PR, as #36 and #37 did. Otherwise `/opsx:archive` runs on the ticket branch, so the archive reaches `main` in the same PR.
- After the merge, on an up-to-date `main`: `/close-ticket`.
