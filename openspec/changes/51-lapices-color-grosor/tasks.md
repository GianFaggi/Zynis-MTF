# Tasks

Group 1 builds the data, the pure style rules and the device key. Group 2 draws per-stroke styles everywhere handwriting shows. Group 3 adds the tray and the pen editor. Group 4 covers the end-to-end flows. Group 5 needs the user, on real devices. Read CLAUDE.md and the KB of each area first (`storage.md`, `design-system.md`, `architecture.md`, `desk.md`, `testing.md`). `command npm test` stays green throughout. `api/` is not touched.

## 1. Data, style rules and pens

- [x] 1.1 Add `InkStyle` and the optional `Ink.styles` to `src/types/index.ts`, and `INK_SIZES` (Fino 4, Medio 7, Grueso 12), `DEFAULT_STYLE` (`{ color: null, size: 7 }`) and the size bounds 1–40 to `src/ink/constants.ts` (design D1, D2). Verify that `command npm run build` type-checks.
- [x] 1.2 Write `src/ink/style.ts`, with `strokeStyles(ink)` (effective styles: all default when `styles` is missing or its length differs from `strokes`) and `withStyles(height, strokes, styles)` (leaves out `styles` when all are default), and make `addStroke(ink, raw, style)` in `geometry.ts` append the style (design D1, D3). Verify `style.test.ts` and `geometry.test.ts`:
  - no `styles` gives all default;
  - a length mismatch gives all default;
  - an all-default result has no `styles` key;
  - adding a red stroke to Tinta-only ink gives aligned `styles`;
  - adding a Tinta stroke to Tinta-only ink keeps the #47 shape;
  - the point limit and growth behave as before.
- [x] 1.3 Accept an optional, well-formed `styles` in `isInk` (`src/backup/validate.ts`): `color` null or `#rrggbb` in either case, `size` an integer 1–40, a length different from `strokes` accepted (design D7). Verify `validate.test.ts` and `backup.test.ts`:
  - ink with valid styles passes;
  - ink without styles passes;
  - styles of the wrong length pass;
  - a bad color (`'red'`, `'#12345'`), a non-integer or out-of-range size, or `styles` that is not an array makes the file damaged;
  - an export → import round trip with styles is equal field by field.
- [x] 1.4 Add the device key `mtf_pens` (`loadPens` / `savePens`, JSON, defaults on anything malformed, pen 0 always `color: null`) to `src/lib/storage.ts`, and `pens`, `choosePen(index)` and `editPen(index, patch)` to `appStore` (design D5). Verify `storage.test.ts` (missing, unparseable, wrong length, bad color, `chosen` out of range and a refused read all give the defaults without throwing; a stored Tinta color is ignored) and `appStore.test.ts` (choose and edit are saved; `replaceData` leaves `pens` as it was).
- [x] 1.5 Write ADR 0014 "Stroke styles as an optional list parallel to strokes" (the shape, Tinta as `null`, left out when all default, the length check against older deploys, the alternatives rejected in design D1, hex rather than tokens) and add an "Amended by ADR 0014" line to ADR 0013. Update `KB/frontend/storage.md` (the `styles` field in the entity shapes, the `mtf_pens` key row, the storage API rows, a "Pens (#51) need no schema bump" note, `mtf_pens` in the list of device keys an Import leaves alone), and update `GLOSSARY.md` (new **Pen**, and **Handwriting** reworded, design D8). Verify that `command npm test` passes and every new link resolves.

## 2. Drawing styles per stroke

- [x] 2.1 Pass `size` through `strokePath` and change the cache to per-stroke-per-size, and make `inkPaths(ink)` return `{ d, color }[]` from `strokeStyles` (design D4). Verify `render.test.ts`:
  - a size-12 stroke's outline is wider than the same stroke at size 4;
  - the same stroke and size returns the cached string;
  - colors follow `styles`, and are `null` without them.
- [x] 2.2 Render `fill={color ?? undefined}` per path in `InkView` and `InkBox` (design D4). Verify `InkView.test.tsx`: a Tinta path has no `fill` attribute and a red path has `fill="#d0443a"`; ink from before pens renders with no `fill` attributes; a mismatched `styles` renders with no `fill` attributes.
- [x] 2.3 Make the box draw and commit with the chosen pen: the live path's `fill` and `size`, `addStroke(…, style)` on `pointerup`, and an erase that maps the kept strokes back to their styles (design D3). Verify `InkBox.test.tsx`:
  - a stroke with a red Lápiz 2 commits `styles` with that pen's style;
  - erasing the middle of three styled strokes keeps the other two with their own styles;
  - undo restores the erased stroke with its style;
  - "Borrar todo" leaves no `styles`;
  - a Tinta-only session commits ink with no `styles` key.
- [x] 2.4 Check the Desk side: a Card's `InkView` (near look and far look) shows the styles, and search and Tidy up are unaffected. Verify that `DeskCard.test.tsx` has a styled Card whose paths carry their fills, and that `command npm test` passes. Update `KB/frontend/desk.md` (handwriting on the Card keeps each stroke's color and width).

## 3. Tray and pen editor

- [x] 3.1 Write `PenTray` (four pen buttons, dot sized by width and colored by pen, ring and pencil badge on the chosen one, `aria-pressed`, a name with the width; a tap on another pen chooses it and turns the eraser off; a tap on the chosen pen opens the editor) and put it first in the `InkBox` tool row (design D6). Verify `PenTray.test.tsx` and `InkBox.test.tsx`:
  - Tinta is pressed on a fresh store;
  - tapping Lápiz 3 chooses it and saves it;
  - tapping it again opens the editor;
  - a tap while the eraser is on turns the eraser off and opens no editor;
  - nothing uses an accent class.
- [x] 3.2 Write `PenEditor`: `role="dialog"` with a name, a native `<input type="color">` (left out for Tinta), the width as `Segmented`, and "Listo"; changes apply live through `editPen`; it closes on Listo, on Esc (without closing the editor `Sheet`), on a press outside it, and when a stroke starts (design D6). Verify `PenEditor.test.tsx` / `InkBox.test.tsx`:
  - changing the color input to green updates the pen and the next stroke;
  - Tinta's editor has no color input;
  - "Grueso" sets size 12;
  - Esc closes the editor but not the Card editor;
  - a `pointerdown` in the box closes it and draws;
  - undo after editing a pen removes the stroke and keeps the pen's new color.
- [x] 3.3 Add every new string to `es.ts` / `en.ts`: Tinta / Ink, Lápiz 2–4 / Pen 2–4, Editar {pen} / Edit {pen}, Color, Grosor / Width, Fino / Fine, Medio / Medium, Grueso / Bold, Listo / Done, and the pen button name with its width. Verify that `i18n.test.ts` finds every key in both languages, and that a component test in English reads "Ink", "Fine", "Medium" and "Bold".
- [x] 3.4 Update `KB/frontend/design-system.md` (replace "one ink color and one width: no palette, no highlighter" with Tinta following the theme and pens keeping their colors; document the tray, the badge and the editor; the user's colors are never the accent rule's concern, and MTF's own UI still never uses the accent) and `KB/frontend/architecture.md` (`src/ink/style.ts`, `PenTray`, `PenEditor`, `appStore.pens`). Verify that `command npm test` and `command npm run lint` pass.

## 4. End-to-end

- [x] 4.1 Extend `e2e/handwriting.spec.ts`: turn the setting on, open a Card, choose Lápiz 2, edit its color to a known value with the color input and its width to Grueso, draw with the mouse, close, reload; the Card on the Desk and the editor show a path with that `fill`, and Lápiz 2 is still chosen with its new color; draw with Tinta and see a path without `fill`. Verify that `command npm run test:e2e` passes.
- [x] 4.2 In the same spec, choose Lápiz 3 and write with the CDP `Pen` (pressure) and with touch on the phone project, then turn the eraser on, tap a pen and check that the next stroke draws instead of erasing; export a Backup and import it in a fresh context, and check that the colored paths come back. Verify that `command npm run test:e2e` passes.
- [x] 4.3 Update `KB/frontend/testing.md` (the new handwriting cases, and how the spec sets an `<input type="color">` value). Verify that the documented commands run as written.

## 5. Integration, docs and real devices

- [x] 5.1 Add a section on `<input type="color">` (what it opens on each OS, why it needs no library, its `#rrggbb` value) and the parallel `styles` list to `aprendizaje/escritura-a-mano.md`, in Spanish.
- [x] 5.2 Update `KB/roadmap.md` (#51 with a summary) and `KB/developers/active.md` (modified files). Verify that every link in the edited KBs resolves.
- [x] 5.3 Run `command npm test`, `command npm run lint`, `command npm run build` and `command npm run test:e2e`. Verify that all pass and that `openspec validate 51-lapices-color-grosor --strict` is valid.
- [ ] 5.4 (user) Phone: choose and edit pens with the finger, drag the width slider, pick a color in the system picker, write, check the editor does not hide what is being written, reload, and switch to the dark theme. PC with the graphics tablet: pressure within each width, the eraser end on a Grueso stroke. Signed in on two devices: colored handwriting travels and the pens stay on each device. Record the results, and any tuning of the default colors or of the Fino / Grueso sizes, in `KB/developers/active.md`.

## 6. Width steps (added after the first merge)

The first part shipped in PR #52. This group runs on `feat/51-grosor-tramos`, and that PR also carries the archive.

- [x] 6.1 Add `INK_SIZE_SLIDER` (2–20, step 1) to `src/ink/constants.ts`. Make `widthLabel` name a preset only when the size is one, and its number otherwise ("Grosor 9" / "Width 9"). Add a native `<input type="range">` ("Grosor exacto" / "Exact width", `accent-color` ink) under the presets in `PenEditor`, with the current size beside the caption (design D2, D6). Verify `PenEditor.test.tsx`, `PenTray.test.tsx` and `i18n.test.ts`:
  - moving the slider to 9 sets size 9, and leaves no preset pressed;
  - "Grueso" moves the slider to 12;
  - a pen at size 9 is named "Lápiz 2, Grosor 9";
  - the slider reads "Exact width" in English.
- [x] 6.2 Extend `e2e/handwriting.spec.ts`: set a pen's slider to a step between presets, draw, reload, and check that the stored stroke has that size. Update `KB/frontend/design-system.md`, `KB/frontend/testing.md`, `KB/developers/active.md` and `aprendizaje/escritura-a-mano.md` (`<input type="range">`). Run `command npm test`, `command npm run lint`, `command npm run build` and `command npm run test:e2e`, and verify that `openspec validate 51-lapices-color-grosor --strict` is valid.

- [x] 6.3 Make Ctrl+Z / ⌘Z do "Deshacer" while the box is shown, except with the focus in a text field (asked for during the first device check). Verify `InkBox.test.tsx` (Ctrl+Z and ⌘Z take back the last stroke; in a text input or textarea, with Shift, or with nothing to undo, nothing happens to the ink; it works with the pen slider focused) and the `undo and "Borrar todo"` e2e case.

## Workflow follow-up

- Group 5.4 can run on the Vercel preview of the PR, except the sync half, which needs an origin the API's CORS accepts. If the preview is refused, run that half after the merge on `mtf.zynis.com.ar` and archive in a follow-up PR, as #47 did. Otherwise `/opsx:archive` runs on the ticket branch, so the archive reaches `main` in the same PR.
- After the merge, on an up-to-date `main`: `/close-ticket`.
