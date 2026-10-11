# Tasks

## 1. Gesture library

- [x] 1.1 Install `@use-gesture/react` with `command npm install @use-gesture/react`; verify it appears in `package.json` dependencies, `package-lock.json` changed and no `pnpm-lock.yaml` was created
- [x] 1.2 Record its version in [KB/frontend/stack.md](../../../KB/frontend/stack.md) (replace "installed in change 2" with the pinned row) and fill "Cómo va a aparecer en MTF" in `aprendizaje/use-gesture.md`: one controller on the Desk, `useGesture` with drag + pinch + wheel, and why the hold uses a timer and not `delay` (correct the note's current claim); verify the version in the KB matches `package-lock.json`

## 2. Pure Desk helpers (`src/desk/`)

- [x] 2.1 Write `geometry.ts` (`toWorld`, `toScreen`, `clampScale` [0.08, 1.8], `zoomAt`, `fitRect` with 70/90 px top/bottom padding, `areaView` with the < 640 px phone view, `deskBounds`, `initialView` with the 0.34 rule); verify with `geometry.test.ts`: world ↔ screen round trip, `zoomAt` keeps the origin point fixed, clamping at both limits, `fitRect` centers the rect, `initialView` picks all vs first Area for a 1440×900 and a 412×915 viewport
- [x] 2.2 Write `areas.ts` (`defaultAreas(now)` with the mockup rects, `areaForPoint` = containing Area else nearest by distance to rect, ties to the first, `areaName(area, t)`, `spotIn(area, random)`); verify with `areas.test.ts`: three default Areas with keys/colors/uuid-shaped ids, point inside / in the gap / far outside, a 4-Area list, `name` overrides `key`
- [x] 2.3 Write `tidy.ts` (`tidyLayout(areas, cards, heights, random)`, pinned first then newest, columns from Area width, shortest-column masonry, jitter, new tilt, missing height → 160); verify with `tidy.test.ts` using a fixed `random`: order, column count for 980 px and 500 px wide Areas, no two Cards overlap, no `areaId` changes, jarred Cards ignored
- [x] 2.4 Write `search.ts` (`normalize`, `matchesQuery`) and `cardText.ts` (`displayTitle`, `isEmptyCard`, `usableItems`); verify with tests: case and accent insensitive ("cancion" matches "Canción"), matches inside Items, empty query matches nothing, display title falls back to the first text line then the joined Items
- [x] 2.5 Write `intent.ts` (`nextIntent({ intent, pointerType, distance, held })` and the release outcome); verify with `intent.test.ts` covering every transition in design decision 3: mouse > 4 px → drag, touch > 9 px before hold → pan, hold → drag, short release → tap, small release on paper → label tap
- [x] 2.6 Update [KB/frontend/desk.md](../../../KB/frontend/desk.md): "Area for a point" rule (inside first, else nearest edge; replaces "nearest horizontal center"), file map of `src/desk/`, tidy rules with numbers; verify each function named in the KB exists

## 3. Data: store actions, default Areas, hint key

- [x] 3.1 Add `loadHintSeen()` / `saveHintSeen()` (`mtf_hint_seen`) to `src/lib/storage.ts`; verify in `storage.test.ts`: unset → false, saved → true, a throwing `localStorage` does not throw
- [x] 3.2 Add to `appStore` `ensureDefaultAreas` (run on create) and the Card actions from design decision 6 (`createCard`, `updateCard`, `addItem`, `updateItem`, `toggleItem`, `removeItem`, `togglePin`, `dropCard`, `placeCard`, `tidyUp`, `deleteCard`, `closeCard`), each setting `updatedAt`; verify in `appStore.test.ts`: default Areas added once and not again on a second store over the same storage, existing Areas untouched, `dropCard` sets the Area from the point and raises `z` above all, `placeCard` moves inside the target Area, `closeCard` removes an empty Card and drops blank Items, every change writes `mtf_data`
- [x] 3.3 Update [KB/frontend/storage.md](../../../KB/frontend/storage.md) (`mtf_hint_seen` live; "a drag writes once, on drop" replaces the debounce line), [KB/frontend/architecture.md](../../../KB/frontend/architecture.md) (two stores: saved `appStore` vs unsaved `deskStore`, the new actions, direct DOM writes for the view) and add the "Updated in change 2" note to ADR 0004's debounce consequence; verify the KB action list matches `appStore.ts`

## 4. UI kit and paint

- [x] 4.1 Extend `Sheet` with `tint?: AreaColor`, `actions?: ReactNode` and `hideTitle?: boolean`; verify in `Sheet.test.tsx`: actions render in the header, a hidden title still names the dialog, existing tests stay green
- [x] 4.2 Add `--card-tint` / `--area-tint` (light + dark) and the `area-tint`, `card-tint` and `paper-grain` `@utility` rules to `src/index.css`; verify `command npm run build` passes and the utilities appear in the built CSS
- [x] 4.3 Update [KB/frontend/design-system.md](../../../KB/frontend/design-system.md) (new utilities and tint variables, `Sheet`'s new props, search outline uses ink not accent); verify the token table still matches `src/index.css`

## 5. Desk surface: pan, zoom, Areas

- [x] 5.1 Write `deskStore.ts` (view, `flying`, `editingId`, `newCardId`, `searchOpen`, `query`, `flyTo`) and `Desk.tsx` (world div moved by a `subscribe` that writes `transform`, grain position/size and `data-far`; `AreaRegion` with tinted region and label + count; `useGesture` pan/pinch/wheel with `touch-action: none`; initial view after `document.fonts.ready`); verify by running `command npm run dev` and panning/zooming with the mouse and DevTools touch emulation
- [x] 5.2 Replace the welcome line in `App.tsx` with the Desk and add the new ES/EN keys (remove `welcome`); update `App.test.tsx` (Desk labelled "Escritorio", three Area labels, English switches Area names) and `e2e/base-screen.spec.ts` (no welcome line; no page scroll); verify `command npm test` passes and the i18n key-parity test is green
- [x] 5.3 Write `e2e/desk.spec.ts` (with a small `e2e/helpers.ts` that seeds `mtf_data` and reloads): pan by dragging paper moves an Area label by the drag distance; `Ctrl` + wheel zooms around the cursor; zooming below 55% shows titles only; on the phone project a CDP two-finger pinch zooms; verify `command npm run test:e2e` passes on both projects

## 6. Cards on the Desk: render, check, create, drag

- [x] 6.1 Write `DeskCard.tsx` (memoized; title, clamped body, 5 Items + "+N más", `done/total`, pin mark, Area tint via `--b`, far title via `group-data-[far]`, `tabIndex=0`, `Enter` opens); Item check buttons call `toggleItem`; verify with `DeskCard.test.tsx`: 7 Items show 5 + "+2 más" + "2/7", checking an Item does not open the editor
- [x] 6.2 Create Cards with the `+` FAB (center of view) and double-click on empty paper; verify in Vitest that the FAB creates a Card in the Area at the view center and sets `newCardId`
- [x] 6.3 Implement card drag in `Desk` (intent machine, 320 ms hold timer + vibrate, lifted look, direct DOM transform, color preview from `areaForPoint`, `dropCard` on release, cancel on `pointercancel` or a pinch start returns the Card); verify in e2e: mouse drag from Trabajo to Vida changes the Card's color and both counts and survives a reload; phone hold-then-drag moves the Card; phone quick swipe on a Card pans and leaves it in place; a dropped Card is drawn above an overlapped one after reload

## 7. Card editor

- [x] 7.1 Write `CardEditor.tsx` on `Sheet` (`tint`, Pin in `actions`, hidden "Tarjeta" title; title input focused for a new Card; auto-growing body; Item rows with check / text / remove; add Item on `Enter`; Place `<select>` from `data.areas` via `areaName`; Delete with second-tap confirm; Listo; every close runs `closeCard`); verify with `CardEditor.test.tsx`: edits reach the store as typed, Enter adds Items in order, Place lists 4 Areas for a 4-Area data set and moves the Card, one Delete tap then close keeps the Card, two taps remove it, closing an empty new Card discards it
- [x] 7.2 Add e2e: create a Card with `+`, type a title and an Item, close, check the Item on the Desk, reload and see both; open it, pick another Area in Place and see the color change; delete it with two taps; verify `command npm run test:e2e` passes

## 8. Dock, See all, Tidy up, search, first-run hint

- [x] 8.1 Write `Dock.tsx` (one button per Area with color dot + name, separator, Ver todo, Ordenar; scrolls sideways when narrow) wiring `areaView`, `deskBounds` and `tidyUp` (heights measured from the rendered Cards, `tidying` animation unless reduced motion); verify with `Dock.test.tsx` (4-Area data set → 4 Area buttons) and an e2e: Tidy up leaves no two Cards overlapping and keeps every Card's Area, also after reload; Area label tap flies to it
- [x] 8.2 Write `SearchBox.tsx` and the search button in the tools pill (dim non-matches to 18%, ink ring on matches, `Enter` flies to the first match, `Esc` / button closes and clears); verify with a Vitest test (matches outlined, others dimmed, close restores) and an e2e (`Enter` brings a far-away matching Card into the viewport)
- [x] 8.3 Write `FirstRunHint.tsx` above the Dock using `loadHintSeen` / `saveHintSeen`; verify with a Vitest test (shown on first launch, gone after "Entendido" and on a new render) and that e2e helpers mark it seen so it never covers gesture tests

## 9. Integration

- [x] 9.1 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass with no warnings left to fix
- [x] 9.2 Update [KB/frontend/testing.md](../../../KB/frontend/testing.md) (CDP touch helpers for hold and pinch, `mtf_data` seeding in e2e), the source layout in [KB/frontend/architecture.md](../../../KB/frontend/architecture.md), tick change 2 in [KB/roadmap.md](../../../KB/roadmap.md) and fill Technical Context / Modified Files in `KB/developers/active.md`; verify every path named in the KBs exists
- [x] 9.3 Clean-code pass over `src/desk/` and the store (consistent naming with change 1, no dead code, comments only where the why is not obvious); verify lint and tests still pass
- [x] 9.4 Check by hand in the dev server at phone and desktop width, light and dark, ES and EN: pan, pinch/`Ctrl` + wheel, far zoom, drag, hold-to-drag, Place, Tidy up, search, hint; verify it matches the mockup's look, and the accent appears only on checked Items
- [x] 9.5 (User) On a real Android phone and an iPhone (via `vite --host` or a Vercel preview): pinch, one-finger pan, hold-to-drag, quick swipe over a Card pans, no text-selection or callout on long press, no page zoom on double tap; verify each works

## Workflow follow-up

- After review and merge: `/opsx:archive` to merge the `desk`, `cards`, `app-shell` and `i18n` deltas into `openspec/specs/`, then `/close-ticket`.
- Next ticket after this one: "Áreas propias" ([#7](https://github.com/GianFaggi/Zynis-MTF/issues/7)).
