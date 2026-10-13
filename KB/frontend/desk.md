---
area: desk
description: Desk mechanics for Zynis MTF — coordinates, pan/zoom, drag, press-and-hold, Areas, far zoom, Tidy up and the Jar
---

# Desk

Reference implementation: [design/mtf-mockup-desk.html](../../design/mtf-mockup-desk.html) (vanilla JS mockup; the React version uses `@use-gesture/react` instead of hand-written pointer code). Why a DOM desk → [ADR 0003](../../docs/adr/0003-dom-desk-with-use-gesture.md). Built in change 2.

## Files (`src/desk/`)

Pure modules (no React, no DOM; each has a co-located `*.test.ts`):

| File | What |
|---|---|
| `geometry.ts` | View math: `toWorld`, `toScreen`, `clampScale`, `zoomAt`, `fitScale`, `fitRect`, `areaView`, `cardRect`, `cardView`, `deskBounds`, `boundingBox`, `initialView`; `randomTilt`, `between`; constants `MIN_SCALE`, `MAX_SCALE`, `FAR_SCALE`, `CARD_WIDTH`, `FALLBACK_CARD_HEIGHT` |
| `areas.ts` | `defaultAreas(now)`, `areaForPoint(areas, point)`, `areaName(area, t)`, `spotIn(area, random)`; the Area rules of #7: `AREA_COLORS`, `nextColor`, `freeSlot`, `overlaps`, `overlapsAny`, `grown`, `sameRect`, `resizedRect`, `nearestArea`, `cleanName`, `MIN_AREA_SIZE`, `AREA_NAME_MAX`; the layout constants `ROW_ORIGIN`, `AREA_GAP`, `ROW_GAP` ([Areas](#areas)) |
| `arrange.ts` | Arranging the Areas (#18): `rowArrangement`, `gridArrangement`, `starArrangement`, `savedArrangement(areas, rects)`, `canRestore(areas, saved)`, `isRecoverable(areas, saved)`; type `Arrangement` ([Arranging the Areas](#arranging-the-areas-18)) |
| `tidy.ts` | `tidyLayout(areas, cards, heights, random)`, `columnCount(width)` |
| `search.ts` | `normalize(text)`, `matchesQuery(card, query)` |
| `cardText.ts` | `usableItems(card)`, `isEmptyCard(card)`, `isFinished(card)`, `pendingItems(card)`, `displayTitle(card)` |
| `intent.ts` | `nextIntent({ intent, pointerType, distance, held })`, `releaseOutcome({ intent, distance, onLabel, onJar })`, `HOLD_MS`. Intents: `pending`, `pan`, `drag`, `resize` |

State and components:

| File | What |
|---|---|
| `deskStore.ts` | Unsaved Desk UI state ([architecture.md](architecture.md)): view, `flying`, `tidying`, `editingId`, `newCardId`, `areaEditor`, `searchOpen`, `query`, `toast`, `winsOpen`, `winsAreaId`, `winsBump`; actions `setView`, `flyTo`, `animateTidy`, `openEditor`, `closeEditor`, `openAreaEditor`, `closeAreaEditor`, `toggleSearch`, `setQuery`, `showToast`, `openWins(areaId?)`, `setWinsArea`, `closeWins`, `bumpWins`, `resetAfterImport` |
| `dom.ts` | `measureCardHeights()`, `viewport()` and `prefersReducedMotion()` — the only place that reads sizes and media settings from the DOM — and `jarElement(areaId?)` / `highlightJar(target)`, the only `data-jar` lookups ([Area Jars](#area-jars-19)) |
| `Desk.tsx` | The surface: world `div`, grain, gestures, Card drag, the Jar drop, Area move and resize, double-click to create |
| `AreaRegion.tsx` | One Area, in one wrapper at its rect's top-left: the soft tinted region, its label with the Card count, the edit button, the resize handle and, while "Frasco por área" is on, its Area Jar ([Area Jars](#area-jars-19)) |
| `AreaEditor.tsx` | The Area editor sheet: name, 12 color swatches, Borrar área with the destination of its Cards |
| `AreasSection.tsx` | The Areas group of Settings: one row per Area (opens its editor), Nueva área, Acomodar áreas with its in-place confirmation, and the "Frasco por área" No / Sí option (#19) |
| `DeskCard.tsx` | One Card on the Desk (memoized); a finished Card wears `card-won`, the filled "Llevala al frasco" chip and a ✓ seal, and plays a one-time pop + stamp when `data-celebrate` is set ([design-system.md](design-system.md)) |
| `ItemCheck.tsx` | An Item's box, shared by `DeskCard` and `CardEditor`; `onToggle` gets the box element so sparks start from it |
| `CardEditor.tsx` | The editor sheet, with "Llevar al frasco" |
| `Dock.tsx` | Area buttons, Frasco, See all, Tidy up |
| `SearchBox.tsx` | The search field |
| `FirstRunHint.tsx` | The one-time hint above the Dock |

Functions that random numbers feed (`spotIn`, `tidyLayout`, `randomTilt`) take a `random: () => number`, so tests pass a fixed sequence.

## Coordinates

- **Desk coordinates** (world): where Cards, Areas and the Jar live. Stored in data. Independent of zoom and screen size.
- **Screen coordinates**: pixels on the device.
- View transform: `screen = world * s + (x, y)`; `world = (screen - (x, y)) / s`.
- The world `div` gets `transform: translate(x, y) scale(s)` with `transform-origin: 0 0`.
- Zoom range: `s` in `[0.08, 1.8]`. Zooming keeps the point under the cursor or the fingers' midpoint fixed (`zoomAt`).
- Cards are 236 px wide. Their height is whatever their content needs; when a rule needs it (drop, Tidy up, See all) it is measured from the DOM at that moment, in the near look, and 160 px is used if a Card is not rendered.

## Gestures

| Action | Touch | Mouse / trackpad |
|---|---|---|
| Pan the Desk | one finger on empty paper | drag empty paper; two-finger scroll or wheel without modifier |
| Zoom | pinch (around the fingers' midpoint) | `Ctrl`/`Cmd` + wheel, trackpad pinch (around the cursor) |
| Move a Card | **press and hold 320 ms**, then drag | drag after moving > 4 px |
| Open a Card | tap (< 9 px) | click; `Enter` on a focused Card |
| Check an Item | tap its box (never starts a drag) | click |
| New Card | `+` button (center of view) | `+` button, or double-click empty paper |
| Fly to an Area | tap its label (< 9 px) | click its label |
| Move an Area (with its Cards) | **press and hold its label 320 ms**, then drag | drag its label after moving > 4 px |
| Resize an Area | drag the handle in its bottom-right corner (no hold) | drag the handle |
| Edit an Area (name, color, delete) | the pencil next to its label, or its row in Settings → Áreas | the same |
| Put a Card in the Jar | press and hold, drag it onto the Jar or an Area Jar | drag it onto the Jar or an Area Jar |
| Open Mis logros | tap the Jar (< 6 px), or an Area Jar for that Area | click the Jar or an Area Jar; `Enter` on the focused Jar |

- One `useGesture` controller on the Desk handles drag, pinch and wheel. `beginPress` sorts each press by what it started on, in this order: an Area's resize handle (`resize`), an Area label (`pending`), a Jar, the Desk's or an Area's (`pan`, a tap opens Mis logros; `jarAreaId` records which), a control inside `button, input, textarea, select, a` (ignored, so an Item's box or the Area edit button never starts a drag), a Card (`pending`), empty paper (`pan`). `nextIntent()` decides each move of a `pending` press, the same for a Card and an Area label:
  - mouse/pen + `pending` + > 4 px → `drag`
  - touch + `pending` + > 9 px before the hold → `pan` (a quick swipe over a Card pans)
  - touch + `pending` + the 320 ms timer fired → `drag`, plus `navigator.vibrate(12)` where supported
- The hold is a timer started on the press, **not** use-gesture's `delay`: `delay` starts the drag as soon as the pointer moves, and MTF needs movement before the hold to mean pan.
- While lifted: no tilt, scale 1.04, `shadow-lift`, drawn above everything. The Card is moved by writing its `transform` straight to the DOM; the store is written once, on drop (`dropCard`), which sets the position, the Area, a new tilt and `z = max(z) + 1` so the last moved Card stays on top after a reload.
- A drag interrupted by the system (`pointercancel`) or by a second finger (a pinch starts) is cancelled: the Card goes back to where it started and keeps its Area. The same goes for an Area move or resize.
- `releaseOutcome()`: a released `drag` drops (a Card or an Area), a `resize` ends the resize, a `pending` press that moved < 9 px opens the Card or, on a label, flies to the Area.
- The Desk has `touch-action: none`, no text selection, no iOS long-press callout, and no context menu.

## Areas

- Regions of the Desk read from `data.areas`, whatever their number. On a first launch with no Areas, `ensureDefaultAreas` stores Trabajo, Vida and Recordar (sage, sand, sky) as a row of 980 × 1000 rects from (80, 120), 80 px apart. The Jar sits centered below them ([The Jar](#the-jar)).
- Drawn as a soft radial tint (`area-tint`, 60 px wider and 40 px taller than the rect on each side) with a large italic label and the Card count. Not containers: no borders, no clipping, no layout.
- Names always go through `areaName(area, t)` = `area.name ?? t(area.key)`.
- **Area for a point** (`areaForPoint`): the Area whose rect contains the point; otherwise the Area with the smallest distance from the point to its rect; ties go to the first Area in the list. On drop, the point is the Card's center (`x + 118`, `y + height / 2`). This replaces the mockup's "nearest horizontal center": it gives the same answer for the default row and stays right for any layout custom Areas may use.
- While dragging, the Card already shows the color of the Area it would join.
- Tapping an Area label flies the view to that Area.

### Areas the user shapes (#7)

Why Areas became movable and resizable, and why their Cards travel with them → [ADR 0007](../../docs/adr/0007-areas-the-user-shapes.md). The rules are pure functions in `areas.ts`; the store actions are in [architecture.md](architecture.md#two-stores).

- **Area editor** (`AreaEditor.tsx`, `deskStore.areaEditor`): a sheet tinted with the Area color, opened from the pencil next to the label (near look only) or from the Area's row in **Settings → Áreas** (Settings closes first: two sheets are never open at once). It holds:
  - **Name**: a local draft. Each non-empty change calls `renameArea`, so the label updates live; `cleanName` trims it and cuts it at 40 characters (`maxLength` too). On close, an empty name brings a default Area back to its translated name, and a custom Area back to the name it had when the editor opened. A custom name reads the same in Spanish and English.
  - **Color**: 12 swatches (`AREA_COLORS`) as native radios in a `radiogroup`, each named by its translated color, the current one ringed in ink. The tint, label, Cards, Jar pieces and Dock dot follow at once, because they all read the color through the Area.
  - **Borrar área**: an inline confirmation. With Cards (on the Desk or in the Jar) it reads "Sus N tarjetas pasan a [Area]", a `<select>` with the nearest Area (`nearestArea`, edge to edge) listed first and chosen; without Cards just "¿Borrar el área?". Then Borrar or Cancelar. `deleteArea` puts the Desk Cards inside the destination with `spotIn`, on top, and gives the Jar Cards its `areaId`; no Win is touched. Toast "Área borrada" + "N tarjetas pasaron a X". With one Area left the button is disabled and a line says the Desk needs at least one Area.
- **Create** (Settings → **Nueva área**): `createArea(t('newAreaName'))` adds "Área nueva" in `nextColor` (the first color no Area uses; the first one when all 12 are taken), at `freeSlot`, then Settings closes, the view flies to it (`areaView`) and its editor opens with the name selected. `freeSlot` continues the default row as a grid of 3 per row (origin (80, 120), 980 × 1000, 80 px apart across, rows 1160 px apart, so a second row starts at y = 1280 and its label stands clear of the first row's Cards) and takes the first slot, row by row, with 40 px of paper free around it. A slot freed by a deleted Area is reused. The Jar follows by itself (`jarRect` is derived from the Areas).
- **Move**: drag the label (see the gestures above). The Desk lifts the Area (`data-lifted` on the wrapper: a stronger tint, `cursor: grabbing`, no tilt, no scale) and collects the elements of its Cards on the Desk once. Each frame writes the same `translate` on the wrapper and on those Cards, the property a Card drag uses. On release, `moveArea` shifts the rect and those Cards by the rounded distance, in one write. Cards of other Areas never move, even when the moved Area ends up under them: Areas are not containers.
- **Resize**: the handle is 56 Desk px (31 screen px at the far-zoom threshold, where it hides), centered on the bottom-right corner, with a quiet pencil corner mark. A press there is `resize` at once: no hold on touch, because the handle exists only to be dragged. Each frame writes `--live-w` / `--live-h` on the wrapper, which win over React's `--rect-w` / `--rect-h`; `resizedRect` keeps the top-left and floors at 520 × 520 (`MIN_AREA_SIZE`, about two Card columns). On release `resizeArea` writes the rect. No Card moves or changes Area.
- **No overlap**: while moving or resizing, `overlapsAny` (strict intersection; shared edges are fine) toggles `data-blocked` on the wrapper: a dashed `pencil` outline on the tint and the label at 50%. Released blocked: `data-returning` on the wrapper and the carried Cards (0.35 s `translate`, and `width` / `height` on the tint for a resize), the written values are cleared so everything slides back, `settle` runs after 380 ms (at once under reduced motion), nothing is written, and the toast says "Ahí hay otra área". The Desk checks overlap before calling `moveArea` / `resizeArea`, the way it calls `jarVerdict` before `jarCard`; the store does not repeat the check.
- Long names are never clipped: a 40-character label at 68 px is wider than a 520 px Area and simply runs onto the paper.

### Arranging the Areas (#18)

**Settings → Áreas → Acomodar áreas** lays every Area out in one tap. It is an action, not a mode: afterwards Areas move and resize by hand as before, and a new Area still takes `freeSlot`. Named "Acomodar" (Arrange) because "Ordenar" is already Tidy up, which arranges Cards, not Areas. Each choice is a pure function in `arrange.ts` returning a `Map` from Area id to its target rect: sizes kept, integers, no overlap (unit-tested with Areas of mixed sizes).

- **Fila** (`rowArrangement`): side by side in Settings order, tops at `ROW_ORIGIN.y`, `AREA_GAP` (80 px) apart. The three default Areas in their original places are already a Fila.
- **Tabla** (`gridArrangement`): `ceil(sqrt(n))` columns (2 for 2–4 Areas, 3 for 5–9), filled row by row in Settings order; a column is as wide as its widest Area and a row as tall as its tallest, `AREA_GAP` across and `ROW_GAP` (160 px) down, each Area at the top-left of its cell. Not `freeSlot`'s 3 per row: with 3 columns Tabla would equal Fila up to 3 Areas.
- **Estrella** (`starArrangement`): Area centers on a ring, the first at the top (−90°) and the rest clockwise, evenly spread; two Areas stand left and right; one Area is a Fila. The radius grows from 0 in 20 px steps until no two Areas are closer than `AREA_GAP` and `centeredJar` finds room for the Jar and its caption in the middle (the rule `jarRect` uses, so the hole is exactly where the Jar goes). Then the whole ring is shifted so its bounding box starts at `ROW_ORIGIN`. For an odd count the hole is at the bounding box's center, not the ring's.
- **Mi disposición** (`savedArrangement`): every Area in the saved arrangement (`appStore.arrangement`, device key `mtf_arrangement`, [storage.md](storage.md#keys)) goes back to its saved rect, size included; an Area created since takes `freeSlot` among the rects already placed; saved ids of deleted Areas are ignored. The button is disabled while `canRestore` is false (nothing saved, or no saved id is a current Area, e.g. after an Import). **Guardar esta disposición** saves every Area's rect (one slot, replaced by each save), shows the toast "Disposición guardada" and keeps Settings open.
- **Confirmation**: when `isRecoverable` is false (the current rects are not what Fila, Tabla, Estrella or Mi disposición would produce), the group swaps its buttons for "Tu disposición actual no está guardada. ¿Acomodar igual?" with Cancelar / Acomodar, the way "Borrar área" asks. The question is `AreasSection` state, gone when Settings closes. Rects are integers everywhere, so the exact comparison is reliable: a 1 px hand move makes it ask. A Desk with Areas created by Nueva área is also asked about unless `freeSlot` happens to match a shape (it does for 5–9 Areas of the default size: that is Tabla).
- **Applying** (`App.tsx`): Settings closes, `animateTidy()`, `arrangeAreas(targets)` (Areas and their Desk Cards in one write, [architecture.md](architecture.md#two-stores)), `showWholeDesk()`. While the world is `data-tidying` the Area wrapper transitions `left` / `top` and the Cards their `transform`, both 0.5 s on Tidy up's easing, so each Area slides with its Cards while the view flies to the whole Desk. Under reduced motion the global CSS drops both transitions and everything is in place at once. The Jar is not animated: it jumps to its new derived place.

## Far zoom (semantic zoom)

- Below `s < 0.55` Cards collapse to their **title only** (34 px Literata, at most 3 lines), so a zoomed-out Desk reads like a map.
- A Card without a title shows `displayTitle(card)`: its first text line, or its Items joined.
- The Desk writes `data-far` on the world `div`; Cards switch look with `group-data-[far]:` utilities, so the flip re-renders no React.
- The Area edit button, the resize handle and the Area Jars (#19) hide in the far look (`group-data-far:hidden`). The Desk Jar always shows.

## Navigation helpers

- **Fly**: `areaView(area)` on a viewport ≥ 640 px fits the Area (`fitRect`); narrower, it shows the Area's top-left corner at `clamp(vw / 560, 0.62, 1)`. Flying animates the world transform for 0.55 s, skipped with reduced motion.
- `fitRect(rect, viewport)` keeps 70 px free on top (wordmark, tools) and 90 px at the bottom (Dock), with 60 / 40 px margins, capped at 100%.
- **See all** fits `deskBounds`: every Area, every Card on the Desk and the Jar with its caption. The 8% zoom floor wins: on a phone, a Desk wider than ~5,000 px (a Card dropped very far out) cannot fit entirely, and See all shows its middle at 8%.
- **Tidy up** (`tidyLayout`), per Area: its Cards on the Desk sorted pinned first, then `createdAt` newest first; `cols = max(1, floor((w + 52) / (236 + 52)))` columns, centered in the Area, starting 140 px below its top; each Card goes into the shortest column with x jitter ±14 px, y jitter −8…+10 px and a new tilt (±2.2°); 40 px between Cards in a column. Positions only: no Card changes Area. Animated for 560 ms unless reduced motion.
- **Search**: matches (`matchesQuery`: title, text and Items, ignoring case and accents) get a 3 px **ink** ring and the rest drop to 18% opacity. `Enter` flies to the first match in Desk order (highest `z` first) with `cardView`. `Esc` or the search button closes and clears it. An empty query dims nothing.
- **Initial view** (`initialView`), after `document.fonts.ready`: the whole Desk if it fits at `s ≥ 0.34`, otherwise the first Area with `areaView`.
- `Esc` closes the open sheet first.

## The Jar

Built in change 3. Code in `src/wins/` ([files below](#files-srcwins)); the Win rules behind it → [architecture.md](architecture.md#wins-as-events).

- **Place, derived, never stored** (`jarRect(areas)`): 260 × 300. First `centeredJar(rects)` tries the Jar with its caption (`jarBounds`) centered on the Areas' bounding box; when that block, grown by `JAR_GAP` (50 px), overlaps no Area, the Jar sits there, in the middle of the Areas (Estrella, or any hand-made Desk with an empty middle, #18). Otherwise it is centered under the horizontal middle of the bounding box, 50 px below the lowest Area. For the default row, Fila and Tabla an Area or a too-narrow gap is at the center, so the Jar stays below: (1500, 1170) for the default row, the mockup's place. No Areas → `null`, no Jar. It follows custom Areas (#7) and arrangements for free, and moves only when an Area's rect is written (on release, not during a drag). `captionRect` puts "Tu frasco" + "N esta semana · tocalo para ver más" (360 px wide, 14 px below); `jarBounds` is the Jar plus its caption, and `deskBounds` includes it, so See all and the initial view show the Jar. On a 1440 × 900 window the fit stays width-limited (3100 px wide either way), so the Jar costs no zoom; on Playwright's 1280 × 720 it becomes height-limited (≈ 0.375 instead of 0.405), still above the 34% floor.
- **Drawn** by `Jar.tsx` in the world `div`, after the Areas and before the Cards: a `<button data-jar="">` with `aria-label` "Frasco: N tarjetas. Abrir Mis logros", the mockup's SVG, `JarGlass` (shared with the Area Jars; its `<clipPath>` id comes from `useId()`, so several Jars never collide) (lid in `color-mix(accent 70%, ink)`, glass and neck in `--color-glass`, a shine, a label with "Logros" and the count in `accent-ink` Literata), and the caption as a `pointer-events: none` paragraph.
- **Fill** (`jarPieces(colors)`): one 21 × 13 paper piece per jarred Card, in its Area color, oldest at the bottom: 7 per row, every other row shifted 11 px, with the mockup's deterministic jitter from the index (±5 px x, ±4 px y, ±38°), clipped to the glass. `JAR_CAPACITY` = 77 (11 rows); beyond it the Jar looks full and the label still counts every Card. A piece whose Card is new since the previous render gets `animate-drop` (tracked in state with React's "previous render" pattern; nothing drops on the first render).
- **Press rule**: `beginPress` recognizes `[data-jar]` (any Jar) like an Area label, **before** the control rule, so a press on the Jar can still pan. `releaseOutcome` returns `'jar'` for a pan that moved < 6 px from the Jar, which opens Mis logros. The button's own `onClick` only handles the keyboard (`event.detail === 0`), so `Enter`/`Space` open Mis logros too.
- **While dragging**: the point is the Card's center (the same point `areaForPoint` uses). `jarTarget` decides which Jar it is over ([Area Jars](#area-jars-19)); for the Desk Jar, `isOverJar` grows it by 50 px left and right, 60 px on top and 30 px at the bottom. Over it, the Jar gets `data-over` (`highlightJar`) (glass stroke in `accent`, 4 px, SVG scaled 1.05) and the Card drops its `--b-preview`, so it shows no other Area's color.
- **Drop over a Jar** (`dropOnJar` in `Desk.tsx`), decided by `jarVerdict(card)` before anything moves, whichever Jar it is:
  - **Refused** (unchecked Items), `slideBack`: `data-returning` on the Card (0.35 s `translate` transition), `style.translate` cleared so it slides back to its stored place, `settle` after 380 ms, toast "Todavía no" + "Te falta(n) N elemento(s)". Nothing is written.
  - **Accepted** (finished, or no Items) by the Desk Jar or its own Area's, `intoJar`: `data-into-jar` (pointer events off, 0.45 s to that Jar's center with `rotate(24deg) scale(.12)` and `opacity: 0`). After 460 ms: `jarCard(id)`, `settle`, then `useWinFeedback().jarred(areaId?)` (sparks over the Jar that took it, counter bump, toast "¡Al frasco!" with the week's count). React unmounts the Card once `jarredAt` is set.
  - Under reduced motion both waits are 0: the outcome comes at once and only the toast shows.
  - Elsewhere: `dropCard`, as before. A drag cancelled by `pointercancel` or a pinch goes through `settle` and never reaches the Jar.
  - The store is written 460 ms after an accepted drop; a reload in that window leaves the Card on the Desk, which is harmless.
- **Dock "Frasco"** (`JarIcon`, after the Area buttons, before See all) flies to `fitRect(jarBounds` + 200 px sideways / 60 px vertical`, { maxScale: 1 })`.
- **Editor "Llevar al frasco"** is the non-drag way, with the same accept / refuse rules (refused → toast, the editor stays open; accepted → `closeCard`, `closeEditor`, `jarCard`, `jarred()`). Disabled while the Card is empty.
- Cards in the Jar leave the Desk (not drawn, not counted in their Area, not searched, not tidied) but are kept. Mis logros lists them newest first with **Devolver** → `returnCard`: back inside their Area (`spotIn`), on top.

### Area Jars (#19)

**Settings → Áreas → Frasco por área** (No / Sí, off by default) gives each Area its own small Jar. A device setting (`appStore.areaJars`, key `mtf_area_jars`, [storage.md](storage.md#keys)), not part of the Backup. An Area Jar is a **view** of the same Jar, never a second store: it shows the Cards with `jarredAt !== null && areaId === area.id`, and the Desk Jar still holds every Card. The Dock's "Frasco" still flies to the Desk Jar.

- **Place** (`areaJarRect(rect)`): 104 × 120 (40% of the Desk Jar), 24 px from the Area's right edge and 16 px from its top. Top-right because the label and its pencil hold the top-left and the resize handle the bottom-right; it ends at 136 px, above the 140 px where Tidy up starts placing Cards, so a tidied Card never covers it.
- **Drawn** by `AreaJar.tsx` inside `AreaRegion`'s wrapper, at `left: calc(var(--w) - 128px)`, so it follows a live move (`translate`) and a live resize (`--live-w`) with no Desk code; `areaJarRect` uses the same numbers for the drop, which only runs when no Area is moving. A `<button data-jar={area.id}>` named "Frasco de Vida: 2 tarjetas. Abrir Mis logros", with `JarGlass` in its `compact` look: the count alone, larger, and thicker strokes ("Logros" would be about 4 Desk px). The Desk passes each Area its Jar Cards only while the option is on; without them no Area Jar is drawn. Hidden in the far look (`group-data-far:hidden`).
- **`data-jar` values**: `""` on the Desk Jar, the Area id on an Area Jar. Every DOM lookup goes by value through `jarElement(areaId?)` / `highlightJar(target)` in `dom.ts`: a bare `[data-jar]` would find the first Area Jar, since the Areas come before the Desk Jar in the DOM.
- **Which Jar** (`jarTarget(areas, point, { areaJars, far })`): an Area Jar first, only while the option is on and the view is not in the far look (`view.s < FAR_SCALE`), using `isOverAreaJar` (the Jar grown by 30 px on every side); then the Desk Jar. Returns `{ areaId }`, `{ areaId: null }` (Desk Jar) or `null`. `follow()` and `drop()` both call it (through `jarAt`), so the highlight and the drop always agree, and a hidden Area Jar never catches a Card: released there in the far look, the Card is just placed. Over an Area Jar the Card shows that Area's color (`areaForPoint`), a hint that it would change Area; over the Desk Jar, none.
- **Dropping on its own Area's Jar**: exactly the Desk Jar's rules and feedback (refused slides back with "Todavía no"; accepted shrinks into that Area Jar, then sparks burst from it). Both Jars play the piece's drop animation: the Card is in both views.
- **Dropping on another Area's Jar**: a refused Card is refused as above, with no question. Otherwise the Desk keeps the drop in React state (`asking: { press, card, areaId }`) and the Card waits where it was released, still `data-lifted` (with the other Area's color). `JarMoveSheet` asks "¿Pasarla a Vida y llevarla al frasco?", tinted in that Area's color, with **No** and **Sí** (`primary`). It is rendered outside the Desk's `<section>`, so its React events never reach the Desk's handlers, and its scrim blocks any other gesture meanwhile.
  - **Sí** → `intoJar` toward that Area Jar, then `jarCard(id, { areaId })`: the Card changes Area and goes into the Jar in one write ([architecture.md](architecture.md#two-stores)), and its Wins follow it in Mis logros.
  - **No**, `Esc`, the close button or the scrim → `slideBack` without a toast: back where the drag started, in its own Area, nothing written. A reload while asking also writes nothing.
- **Tapping an Area Jar** (or `Enter` on it) opens Mis logros already filtered to that Area (`openWins(areaId)`); the Desk Jar and the wins counter open it on "Todas". Mis logros shows its Area filter only while the option is on ([architecture.md](architecture.md#wins-as-events)).
- A long name in a narrow (520 px) Area can run under its Area Jar, which is drawn after the label and stays on top; the pencil is still reachable from Settings → Áreas.

### Files (`src/wins/`)

| File | What |
|---|---|
| `rules.ts` (pure) | `jarVerdict`, `hasCardWin`, `itemToggled`, `syncCardWin`, `itemsRemoved`, `cardDeleted`, `cardJarred`, `noteWritten` ([architecture.md](architecture.md#wins-as-events)) |
| `stats.ts` (pure) | `winStats(events, now)`, `eventsOfArea(events, cards, areaId)`, `totalDone`, `dayStart`, `daysAgo` |
| `jarLayout.ts` (pure) | `jarRect`, `centeredJar`, `captionRect`, `jarBounds`, `isOverJar`, `areaJarRect`, `isOverAreaJar`, `jarTarget`, `jarPieces`, `JAR_CAPACITY`. Not `jar.ts`: next to `Jar.tsx`, `./Jar` would resolve to it on case-insensitive file systems |
| `useWinStats.ts` | `useWinStats(areaId?)`: `winStats` over the stored events (one Area's with `eventsOfArea`), for a "now" taken once and refreshed at each local midnight |
| `feedback.ts` | `useWinFeedback()`: `itemToggled(outcome, element)`, `jarred(areaId?)`, `refused(pending)` → toast, sparks (from the Jar that took the Card), bump |
| `sparks.ts` | `burst(rect)`: 16 sparks; the only DOM side effect, skipped under reduced motion |
| `Jar.tsx`, `JarIcon.ts` | The Jar on the Desk; the jar icon made with lucide's `createLucideIcon` |
| `JarGlass.tsx` | The Jar's SVG (lid, glass, pieces, label), shared by `Jar` and `AreaJar`; `compact` for an Area Jar |
| `AreaJar.tsx`, `JarMoveSheet.tsx` | An Area's small Jar (#19); the "¿Pasarla a…?" question |
| `WinsCounter.tsx`, `MisLogros.tsx`, `WinsChart.tsx` | The counter in the tools pill, the Mis logros sheet (with its Area filter while "Frasco por área" is on), its 7-day bar chart |

## Accessibility

- Cards are focusable `article`s; `Enter` opens the editor. The editor's **Place** selector moves a Card to another Area without dragging; this is the non-gesture path and must always exist. Its **Llevar al frasco** button is the non-gesture way to the Jar; the Jar itself is a button (`Enter` opens Mis logros). Keyboard users navigate with the Dock, See all and search.
- The **Area editor** is the non-gesture path for Areas: it is reached from the label's edit button or from Settings → Áreas, and creates, renames, recolors and deletes without a drag. Moving and resizing an Area have **no keyboard path** on purpose: they only change the layout, and every Card stays reachable through the Place selector, the Dock and search. The resize handle is `aria-hidden`.
- `prefers-reduced-motion` turns off fly-to, Tidy up and arranging the Areas, an Area sliding back after a refused move or resize, and every Win animation: sparks, a finished Card's pop and seal stamp, a Card shrinking into the Jar or sliding back from it, a piece dropping in, the counter bump. CSS drops them (`animation: none`, `transition: none`); the JS-timed parts (`burst`, `data-celebrate`, the Jar drop waits) check `prefersReducedMotion()`. The result of each action is the same.
