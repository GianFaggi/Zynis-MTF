# Design

## Context

Change 1 left a base paper screen ([src/App.tsx](../../../src/App.tsx)) with a floating wordmark, a settings pill and a welcome line. It also left a Zustand store holding `data` and `language` ([src/store/appStore.ts](../../../src/store/appStore.ts)), saved whole through `src/lib/storage.ts` on every `data` change. The v1 types already have everything the Desk needs: `Area.rect`, `Card.position {x, y, tilt, z}`, `Card.items`, `Card.pinned`, `Card.jarredAt` ([src/types/index.ts](../../../src/types/index.ts)). The UI kit has `Button`, `IconButton`, `Segmented` and `Sheet`.

The approved mockup ([design/mtf-mockup-desk.html](../../../design/mtf-mockup-desk.html)) is a working vanilla JS reference for every Desk number used below: Area rects, card width 236, hold 320 ms, the 9 px and 4 px thresholds, far zoom below 0.55, zoom limits [0.08, 1.8], fly-to padding, and the tidy layout. [KB/frontend/desk.md](../../../KB/frontend/desk.md) lists the gestures, and [ADR 0003](../../../docs/adr/0003-dom-desk-with-use-gesture.md) fixes the approach: a DOM world div moved with a CSS transform, with gestures from `@use-gesture/react`.

The user agreed that the three default Areas stay fixed in this change, but no Desk code may assume three: custom Areas come next as their own ticket.

## Goals / Non-Goals

**Goals:**
- Pan, zoom and drag that stay smooth on a mid-range phone: no React re-render of the Desk per gesture frame.
- Every rule that can be pure is pure and unit-tested: coordinates, fit/fly math, the Area for a point, tidy layout, search matching, gesture intent.
- Every list of Areas is read from `data.areas`. Areas are named through one helper, so a custom `name` already works.

**Non-Goals:**
- No win events, finished-Card look, Jar or wins counter (change 3). Checking an Item only flips `done`.
- No schema change and no migration.
- No remembered pan/zoom between launches.
- No keyboard pan/zoom shortcuts. Keyboard users navigate with the Dock, See all and search, and move Cards with Place.

## Decisions

### 1. Feature folder `src/desk/`
The Desk lives in `src/desk/`. Pure modules (`geometry.ts`, `areas.ts`, `tidy.ts`, `search.ts`, `cardText.ts`, `intent.ts`) sit next to the components (`Desk.tsx`, `AreaRegion.tsx`, `DeskCard.tsx`, `Dock.tsx`, `SearchBox.tsx`, `CardEditor.tsx`, `FirstRunHint.tsx`) and `deskStore.ts`. Each module has a co-located test. `src/components/ui/` stays the generic closed-API kit, and `App.tsx` composes the Desk with the floating UI and the sheets.
*Alternative*: split into `src/lib/desk/` and `src/components/desk/`. That puts files that change together in separate places.

### 2. Two stores: persisted data vs Desk UI state
- `appStore` (existing) keeps `data` + `language` and gains the data actions in decision 6. Only this store is saved.
- New `deskStore` (Zustand, never saved) holds the view `{ x, y, s }`, `flying`, `editingId`, `newCardId`, `searchOpen` and `query`. The Dock, the `+` button and search sit outside the Desk component but need to fly the view or open the editor, so this state is shared rather than local to `Desk`.
- **No re-render per frame**: the world div does not read `x, y, s` through a React selector. `Desk` subscribes to `deskStore` with `subscribe()` and writes `transform`, the grain's `background-position/size` and a `data-far` attribute straight to the DOM. Cards switch to their far look with a CSS `group-data-[far]` variant, so the far zoom flip does not re-render React either.
*Alternative*: view in React state of `Desk`. Every pan frame would re-render the Desk and every Card, unless all of it is memoized perfectly.

### 3. Gestures: one controller on the Desk, with a pure intent function
`Desk` binds `useGesture` from `@use-gesture/react` to the Desk element (`touch-action: none`, no text selection, no long-press callout, `contextmenu` prevented). It uses three handlers:
- **onDrag** (pointer captured) follows the mockup's state machine. On the first event it looks at the target. A press inside `button, input, textarea, select` is ignored, so a checkbox never starts a drag. A press on `[data-card-id]` becomes `pending`, and a press anywhere else becomes `pan`. Each later move goes through the pure `nextIntent()` in `intent.ts`, which takes `{ intent, pointerType, distance, held }`:
  - mouse/pen + `pending` + distance > 4 px → `drag`
  - touch + `pending` + distance > 9 px before the hold → `pan` (the swipe pans)
  - touch + `pending` + hold timer fired (320 ms, started on the first event) → `drag`, plus `navigator.vibrate?.(12)`
  - release while `pending` with distance < 9 px → `tap` (open the editor)
  - release while `pan` with distance < 6 px on an Area label → fly to that Area
- **onPinch** handles a two-finger pinch on touch, `Ctrl` + wheel and the trackpad pinch (Chrome sends it as `ctrlKey` wheel, Safari as `gesture*` events, and use-gesture handles both). Zoom is applied around the gesture origin with `zoomAt()`. If a card drag is running when a pinch starts, the drag is cancelled and the Card returns to where it started.
- **onWheel**, only without `Ctrl`/`Cmd`, pans by `-deltaX, -deltaY`.
- **Double-click** on empty paper (a plain `onDoubleClick`, target not a Card or label) creates a Card there.

*Why not use-gesture's `delay` for the hold*: `delay` starts the drag early as soon as the pointer moves. MTF needs the opposite, where movement before the hold means pan. A timer plus `nextIntent()` keeps that rule explicit and testable.
*Alternative*: a separate `useDrag` per Card. Handing a gesture from a Card over to the Desk pan in the middle of a touch is awkward, and the mockup's single controller is proven.

### 4. Dragging writes the DOM, the store is written once on drop
While dragging, `DeskCard`'s element is moved by writing its `transform` directly (a ref, plus a `lifted` attribute for the raised look: no tilt, scale 1.04, `shadow-lift`). Its `--b` color variable switches to the Area it would join (`areaForPoint`). On release, one store action `dropCard(id, position)` sets the position, the Area, a new random tilt, `z = max(z) + 1` and `updatedAt`. That is one save per drag, so the "debounce writes while dragging" planned in ADR 0004 and storage.md is not needed, and those docs are corrected. Typing in the editor saves on each change. Writing the whole document is cheap at notepad size (ADR 0004).

### 5. Area for a point: inside first, otherwise nearest edge
`areaForPoint(areas, point)` returns the Area whose rect contains the point. When the point is in no Area, it returns the Area with the smallest distance from the point to its rect, with ties going to the first in the list. The point is the Card's center (`x + 118`, `y + height / 2`, with the height measured from the element). For the default row of Areas this gives the same result as the mockup's "nearest horizontal center". It also stays right for any layout custom Areas may use later, where a horizontal-only rule would not. desk.md and GLOSSARY.md are updated to match.

### 6. Store actions (appStore)
All of them replace `data` immutably and set `updatedAt` on what they touch:
`ensureDefaultAreas()` (runs at store creation), `createCard(point)`, `updateCard(id, { title?, body? })`, `addItem(cardId, text)`, `updateItem(cardId, itemId, text)`, `toggleItem(cardId, itemId)`, `removeItem(cardId, itemId)`, `togglePin(id)`, `dropCard(id, position)`, `placeCard(id, areaId)`, `tidyUp(heights)`, `deleteCard(id)` and `closeCard(id)`. `closeCard` drops blank Items and removes the Card if it is empty. Card and Item ids come from `newId()`. The random tilt (±2.2°) and spot use an injectable `random` in the pure helpers, so tests stay deterministic.

### 7. Default Areas: written into the data once
`defaultAreas(now)` in `areas.ts` returns Trabajo / Vida / Recordar (`key: work | life | remember`, colors sage / sand / sky) as a row of 980 × 1000 rects starting at (80, 120) with an 80 px gap (the mockup's numbers). `ensureDefaultAreas` adds them only when `data.areas` is empty, so they get real uuids and timestamps like any Area and sync later like data. The space below the middle Area stays free for the Jar (change 3). Names are always read through `areaName(area, t)` = `area.name ?? t(area.key)`.
*Alternative*: hard-coded Areas that are not stored. Cards would point at ids that exist nowhere, and custom Areas would need a migration.

### 8. View math (`geometry.ts`)
- `toWorld` / `toScreen` / `zoomAt(view, origin, factor)`, with scale clamped to [0.08, 1.8].
- `fitRect(rect, viewport, { maxScale })` uses the mockup's padding: 70 px top, 90 px bottom (Dock), 60/40 px margins.
- `areaView(area, viewport)`: on viewports narrower than 640 px it uses the readable phone view (scale `clamp(vw / 560, 0.62, 1)`, aligned to the Area's top-left), otherwise `fitRect`.
- `deskBounds(areas, cards, heights)` is the union of every Area and every Card on the Desk. See all fits it.
- `initialView`: `deskBounds` if its fit scale is ≥ 0.34, else `areaView(areas[0])`.
- Flying sets `flying` in `deskStore`, which adds a 0.55 s transform transition to the world div. The transition is skipped when `prefers-reduced-motion` is on (the global CSS rule already removes transitions).

### 9. Tidy up (`tidy.ts`)
`tidyLayout(areas, cards, heights, random)` is pure. For each Area it takes its Cards on the Desk, sorted pinned first, then `createdAt` newest first, and places them in a masonry: `cols = max(1, floor((w + 52) / (236 + 52)))` columns, centered in the Area, starting 140 px below its top, each Card into the shortest column with ±14 px / −8…+10 px jitter and a new tilt. The gap is 40 px vertically. Heights come from a `Map<cardId, height>` measured from the rendered Cards (160 if one is missing). It returns positions only and never changes `areaId`. The Desk animates by putting a `tidying` attribute on the world for 560 ms, which enables a transform transition on Cards.

### 10. Card editor uses `Sheet`, extended
`Sheet` gains three optional props: `tint?: AreaColor` (panel fill mixed with the Area color), `actions?: ReactNode` (rendered in the header before the close button, used for Pin), and `hideTitle?: boolean` (the `h2` stays for screen readers but is visually hidden). The editor title is "Tarjeta" / "Card". The kit stays closed: still no `className`.
The editor reads its Card from `appStore` by `editingId`. It holds a borderless title input (focused when `newCardId` matches), an auto-growing textarea, the Item rows (check, text input, remove), and an "Añadir elemento" row. Changed during apply after testing on a phone, where a separate draft field lost its text when the user tapped Save without confirming it: the row now calls `addItem(cardId)`, which creates an empty Item, and focuses its input, so what is typed is the Item, saved as typed. The store update is flushed with `flushSync` so the focus happens inside the tap, which iOS needs to open the keyboard. Each Item input sits in its own small form: `Enter` or the phone keyboard's confirm key (`enterKeyHint="done"`) submits it, which blurs the input and puts the keyboard away. A form rather than an Enter key handler, because phone keyboards often report Enter as "Unidentified" while composing a word. An Item left without text is removed on blur. The footer has the Place `<select>` listing `data.areas` through `areaName`, Delete (a second tap confirms, held as local state) and Guardar (Save; renamed from the mockup's "Listo" during apply, so it never reads as finishing the Card). Closing it in any way (`Esc`, scrim, close, Guardar) runs `closeCard`.

### 11. Card on the Desk
`DeskCard` (memoized) is an `article` with `tabIndex=0` and `data-card-id`, labelled by its title or display title. `Enter` opens the editor. It is absolutely placed with `transform: translate(x, y) rotate(tilt)`, `z-index` from `position.z`, and is 236 px wide. It shows the title, the body clamped to 7 lines, up to 5 Items with check buttons (`aria-pressed`, labelled by the Item text, accent fill when checked: checks are wins), "+N más", the `done/total` footer and a pin icon. Far look (`group-data-[far]`): only `displayTitle(card)` in 34 px Literata, clamped to 3 lines. Search state comes from `deskStore.query`: matches get a 3 px **ink** ring, and the rest drop to 18% opacity. The mockup's accent ring is not used, because the accent is reserved for wins.

### 12. Paint: a few Tailwind `@utility` rules in `index.css`
The Area radial gradient, the Card tint (`color-mix(in oklab, var(--b) var(--card-tint), var(--color-sheet))` with 8% light / 11% dark) and the SVG paper grain are hard to read as arbitrary-value utilities. They become named utilities (`@utility area-tint`, `@utility card-tint`, `@utility paper-grain`) next to the tokens. `--card-tint` and `--area-tint` join the light/dark token blocks. Components still use only utilities, and the Area color reaches them through the `--b` custom property set from data.

### 13. Search (`search.ts`)
`normalize(text)` = lowercase + NFD with combining marks removed. `matchesQuery(card, query)` checks title, body and Item texts. An empty query matches nothing and dims nothing. `Enter` flies to the first match in Desk order (by `z`, top first), using `fitRect` around the Card. `Esc`, or the search button again, closes the search and clears it. When a sheet is open, `Esc` belongs to the sheet.

### 14. First-run hint and its key
The hint sits above the Dock in ink and paper ("Arrastrá las tarjetas a donde quieras. En el celu, mantené apretada una tarjeta para moverla." with the button "Entendido"). `storage.ts` gains `loadHintSeen()` / `saveHintSeen()` on the key `mtf_hint_seen` (already reserved in storage.md). It is a device setting like `mtf_language`, so it is not part of `mtf_data` or the Backup.

### 15. Floating UI and i18n
- The welcome line and its key are removed.
- The tools pill gets a search `IconButton` before settings. The wins counter joins it in change 3.
- The bottom Dock (scrolls sideways when narrow) holds one button per Area (color dot + name), a separator, Ver todo and Ordenar.
- The `+` FAB sits bottom-right.
- New ES/EN keys follow the mockup's texts: desk, Area keys, newCard, more(n), title, body, addItem, removeItem, pin/pinned, place, delete/deleteConfirm, save, card, seeAll, tidyUp, search/searchField, hint/hintOk.

### 16. Testing
- **Vitest**: `geometry`, `areas` (default Areas, `areaForPoint` inside / gap / outside / 4 Areas, `areaName`), `tidy` (order, columns per width, no overlap, Area unchanged), `search` (case, accents, Items), `cardText`, `intent` (every transition above), the appStore actions (incl. `ensureDefaultAreas` runs once and `closeCard` discards an empty Card), `Sheet` new props, and `CardEditor` / `Dock` / `App` with Testing Library (a 4-Area data set proves the Dock and Place are generic).
- **Playwright** (`e2e/desk.spec.ts`; data seeded by writing `mtf_data` with `page.evaluate` and reloading):
  - mouse drag to another Area: color, counts, and kept after reload
  - pan by dragging paper
  - `Ctrl` + wheel zoom and far zoom titles
  - phone: hold-then-drag and quick-swipe-pans, through CDP `Input.dispatchTouchEvent` (Playwright has no touch-drag API; both projects are Chromium)
  - phone: two-finger pinch through CDP
  - Tidy up
  - search `Enter` flies to the match
  - create, edit and delete a Card through the UI
  - `base-screen.spec.ts` drops the welcome line.

### Glossary and ADRs
- GLOSSARY.md: **Area** sharpened (default Areas on first launch, and a Card released outside every Area joins the nearest one). New term **Place** (the editor's way to change a Card's Area without dragging).
- No new ADR: there is no schema change and no new library choice (`@use-gesture/react` is ADR 0003), and every decision above is local to `src/desk/`. ADR 0004's consequence about debouncing writes during a drag gets a short "Updated in change 2" note pointing to decision 4.

## Risks / Trade-offs

- [iOS Safari gestures (pinch via `gesture*` events, long-press callout, double-tap zoom) cannot run in Playwright, which is Chromium only] → `touch-action: none`, `-webkit-touch-callout: none` and use-gesture's Safari handling. The final task is a manual check on an iPhone and an Android phone.
- [The hold timer and pointer capture can leave a stuck state if `pointercancel` arrives] → the drag handler treats `canceled` / `pointercancel` as a cancelled drag: the Card returns to its start and the state resets. Covered by the "Cancelled drag" spec.
- [Card heights for drop, tidy and See all come from the DOM and depend on fonts] → measured at the moment of use, not cached. Tidy up is a user action, by which time fonts are loaded.
- [Saving the whole document per keystroke] → fine at notepad size (ADR 0004). If profiling ever shows jank, add a trailing debounce inside `appStore`'s subscriber, which is one place and changes no component.
- [Many Cards make the Desk heavy] → memoized `DeskCard` and direct DOM writes per frame. ADR 0003 already plans to virtualize off-screen Cards if a Desk ever holds thousands.
- [A Card dropped far away from every Area still belongs to one] → intended (every Card has an Area). The Area label count and the Card's color make it visible.

## Migration Plan

There is no data migration. A browser that already has a v1 `mtf_data` with `areas: []` (from change 1) gets the three default Areas on its next launch, the same as a fresh install. Rolling back to change 1 is safe: that build never reads `areas` or `cards`, and the document stays valid v1.
