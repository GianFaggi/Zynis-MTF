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
| `geometry.ts` | View math: `toWorld`, `toScreen`, `clampScale`, `zoomAt`, `fitScale`, `fitRect`, `areaView`, `cardRect`, `cardView`, `deskBounds`, `initialView`; `randomTilt`, `between`; constants `MIN_SCALE`, `MAX_SCALE`, `FAR_SCALE`, `CARD_WIDTH`, `FALLBACK_CARD_HEIGHT` |
| `areas.ts` | `defaultAreas(now)`, `areaForPoint(areas, point)`, `areaName(area, t)`, `spotIn(area, random)` |
| `tidy.ts` | `tidyLayout(areas, cards, heights, random)`, `columnCount(width)` |
| `search.ts` | `normalize(text)`, `matchesQuery(card, query)` |
| `cardText.ts` | `usableItems(card)`, `isEmptyCard(card)`, `isFinished(card)`, `pendingItems(card)`, `displayTitle(card)` |
| `intent.ts` | `nextIntent({ intent, pointerType, distance, held })`, `releaseOutcome({ intent, distance, onLabel, onJar })`, `HOLD_MS` |

State and components:

| File | What |
|---|---|
| `deskStore.ts` | Unsaved Desk UI state ([architecture.md](architecture.md)): view, `flying`, `tidying`, `editingId`, `newCardId`, `searchOpen`, `query`, `toast`, `winsOpen`, `winsBump`; actions `setView`, `flyTo`, `animateTidy`, `openEditor`, `closeEditor`, `toggleSearch`, `setQuery`, `showToast`, `openWins`, `closeWins`, `bumpWins` |
| `dom.ts` | `measureCardHeights()`, `viewport()` and `prefersReducedMotion()` — the only place that reads sizes and media settings from the DOM |
| `Desk.tsx` | The surface: world `div`, grain, gestures, Card drag, the Jar drop, double-click to create |
| `AreaRegion.tsx` | One Area: the soft tinted region and its label with the Card count |
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
| Fly to an Area | tap its label (< 6 px) | click its label |
| Put a Card in the Jar | press and hold, drag it onto the Jar | drag it onto the Jar |
| Open Mis logros | tap the Jar (< 6 px) | click the Jar; `Enter` on the focused Jar |

- One `useGesture` controller on the Desk handles drag, pinch and wheel. A press inside `button, input, textarea, select` is ignored, so an Item's box never starts a drag. A press on a Card is `pending`; anywhere else it is `pan`. `nextIntent()` decides each move:
  - mouse/pen + `pending` + > 4 px → `drag`
  - touch + `pending` + > 9 px before the hold → `pan` (a quick swipe over a Card pans)
  - touch + `pending` + the 320 ms timer fired → `drag`, plus `navigator.vibrate(12)` where supported
- The hold is a timer started on the press, **not** use-gesture's `delay`: `delay` starts the drag as soon as the pointer moves, and MTF needs movement before the hold to mean pan.
- While lifted: no tilt, scale 1.04, `shadow-lift`, drawn above everything. The Card is moved by writing its `transform` straight to the DOM; the store is written once, on drop (`dropCard`), which sets the position, the Area, a new tilt and `z = max(z) + 1` so the last moved Card stays on top after a reload.
- A drag interrupted by the system (`pointercancel`) or by a second finger (a pinch starts) is cancelled: the Card goes back to where it started and keeps its Area.
- The Desk has `touch-action: none`, no text selection, no iOS long-press callout, and no context menu.

## Areas

- Regions of the Desk read from `data.areas`, whatever their number. On a first launch with no Areas, `ensureDefaultAreas` stores Trabajo, Vida and Recordar (sage, sand, sky) as a row of 980 × 1000 rects from (80, 120), 80 px apart. The Jar sits centered below them ([The Jar](#the-jar)).
- Drawn as a soft radial tint (`area-tint`, 60 px wider and 40 px taller than the rect on each side) with a large italic label and the Card count. Not containers: no borders, no clipping, no layout.
- Names always go through `areaName(area, t)` = `area.name ?? t(area.key)`.
- **Area for a point** (`areaForPoint`): the Area whose rect contains the point; otherwise the Area with the smallest distance from the point to its rect; ties go to the first Area in the list. On drop, the point is the Card's center (`x + 118`, `y + height / 2`). This replaces the mockup's "nearest horizontal center": it gives the same answer for the default row and stays right for any layout custom Areas may use.
- While dragging, the Card already shows the color of the Area it would join.
- Tapping an Area label flies the view to that Area.

## Far zoom (semantic zoom)

- Below `s < 0.55` Cards collapse to their **title only** (34 px Literata, at most 3 lines), so a zoomed-out Desk reads like a map.
- A Card without a title shows `displayTitle(card)`: its first text line, or its Items joined.
- The Desk writes `data-far` on the world `div`; Cards switch look with `group-data-[far]:` utilities, so the flip re-renders no React.

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

- **Place, derived, never stored** (`jarRect(areas)`): 260 × 300, centered under the horizontal middle of the Areas' bounding box, 50 px below the lowest Area. For the default row that is (1500, 1170), the mockup's place. No Areas → `null`, no Jar. It follows custom Areas (#7) for free. `captionRect` puts "Tu frasco" + "N esta semana · tocalo para ver más" (360 px wide, 14 px below); `jarBounds` is the Jar plus its caption, and `deskBounds` includes it, so See all and the initial view show the Jar. On a 1440 × 900 window the fit stays width-limited (3100 px wide either way), so the Jar costs no zoom; on Playwright's 1280 × 720 it becomes height-limited (≈ 0.375 instead of 0.405), still above the 34% floor.
- **Drawn** by `Jar.tsx` in the world `div`, after the Areas and before the Cards: a `<button data-jar>` with `aria-label` "Frasco: N tarjetas. Abrir Mis logros", the mockup's SVG (lid in `color-mix(accent 70%, ink)`, glass and neck in `--color-glass`, a shine, a label with "Logros" and the count in `accent-ink` Literata), and the caption as a `pointer-events: none` paragraph.
- **Fill** (`jarPieces(colors)`): one 21 × 13 paper piece per jarred Card, in its Area color, oldest at the bottom: 7 per row, every other row shifted 11 px, with the mockup's deterministic jitter from the index (±5 px x, ±4 px y, ±38°), clipped to the glass. `JAR_CAPACITY` = 77 (11 rows); beyond it the Jar looks full and the label still counts every Card. A piece whose Card is new since the previous render gets `animate-drop` (tracked in state with React's "previous render" pattern; nothing drops on the first render).
- **Press rule**: `beginPress` recognizes `[data-jar]` like an Area label, **before** the control rule, so a press on the Jar can still pan. `releaseOutcome` returns `'jar'` for a pan that moved < 6 px from the Jar, which opens Mis logros. The button's own `onClick` only handles the keyboard (`event.detail === 0`), so `Enter`/`Space` open Mis logros too.
- **While dragging**: the point is the Card's center (the same point `areaForPoint` uses). `isOverJar` grows the Jar by 50 px left and right, 60 px on top and 30 px at the bottom. Over it, the Jar gets `data-over` (glass stroke in `accent`, 4 px, SVG scaled 1.05) and the Card drops its `--b-preview`, so it shows no other Area's color.
- **Drop over the Jar** (`dropOnJar` in `Desk.tsx`), decided by `jarVerdict(card)` before anything moves:
  - **Refused** (unchecked Items): `data-returning` on the Card (0.35 s `translate` transition), `style.translate` cleared so it slides back to its stored place, `settle` after 380 ms, toast "Todavía no" + "Te falta(n) N elemento(s)". Nothing is written.
  - **Accepted** (finished, or no Items): `data-into-jar` (pointer events off, 0.45 s to the Jar's center with `rotate(24deg) scale(.12)` and `opacity: 0`). After 460 ms: `jarCard(id)`, `settle`, then `useWinFeedback().jarred()` (sparks over the Jar, counter bump, toast "¡Al frasco!" with the week's count). React unmounts the Card once `jarredAt` is set.
  - Under reduced motion both waits are 0: the outcome comes at once and only the toast shows.
  - Elsewhere: `dropCard`, as before. A drag cancelled by `pointercancel` or a pinch goes through `settle` and never reaches the Jar.
  - The store is written 460 ms after an accepted drop; a reload in that window leaves the Card on the Desk, which is harmless.
- **Dock "Frasco"** (`JarIcon`, after the Area buttons, before See all) flies to `fitRect(jarBounds` + 200 px sideways / 60 px vertical`, { maxScale: 1 })`.
- **Editor "Llevar al frasco"** is the non-drag way, with the same accept / refuse rules (refused → toast, the editor stays open; accepted → `closeCard`, `closeEditor`, `jarCard`, `jarred()`). Disabled while the Card is empty.
- Cards in the Jar leave the Desk (not drawn, not counted in their Area, not searched, not tidied) but are kept. Mis logros lists them newest first with **Devolver** → `returnCard`: back inside their Area (`spotIn`), on top.

### Files (`src/wins/`)

| File | What |
|---|---|
| `rules.ts` (pure) | `jarVerdict`, `hasCardWin`, `itemToggled`, `syncCardWin`, `itemsRemoved`, `cardDeleted`, `cardJarred`, `noteWritten` ([architecture.md](architecture.md#wins-as-events)) |
| `stats.ts` (pure) | `winStats(events, now)`, `dayStart`, `daysAgo` |
| `jarLayout.ts` (pure) | `jarRect`, `captionRect`, `jarBounds`, `isOverJar`, `jarPieces`, `JAR_CAPACITY`. Not `jar.ts`: next to `Jar.tsx`, `./Jar` would resolve to it on case-insensitive file systems |
| `useWinStats.ts` | `useWinStats()`: `winStats` over the stored events, for a "now" taken once and refreshed at each local midnight |
| `feedback.ts` | `useWinFeedback()`: `itemToggled(outcome, element)`, `jarred()`, `refused(pending)` → toast, sparks, bump |
| `sparks.ts` | `burst(rect)`: 16 sparks; the only DOM side effect, skipped under reduced motion |
| `Jar.tsx`, `JarIcon.ts` | The Jar on the Desk; the jar icon made with lucide's `createLucideIcon` |
| `WinsCounter.tsx`, `MisLogros.tsx`, `WinsChart.tsx` | The counter in the tools pill, the Mis logros sheet, its 7-day bar chart |

## Accessibility

- Cards are focusable `article`s; `Enter` opens the editor. The editor's **Place** selector moves a Card to another Area without dragging; this is the non-gesture path and must always exist. Its **Llevar al frasco** button is the non-gesture way to the Jar; the Jar itself is a button (`Enter` opens Mis logros). Keyboard users navigate with the Dock, See all and search.
- `prefers-reduced-motion` turns off fly-to and Tidy up, and every Win animation: sparks, a finished Card's pop and seal stamp, a Card shrinking into the Jar or sliding back from it, a piece dropping in, the counter bump. CSS drops them (`animation: none`, `transition: none`); the JS-timed parts (`burst`, `data-celebrate`, the Jar drop waits) check `prefersReducedMotion()`. The result of each action is the same.
