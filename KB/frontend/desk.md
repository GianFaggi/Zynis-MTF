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
| `cardText.ts` | `usableItems(card)`, `isEmptyCard(card)`, `displayTitle(card)` |
| `intent.ts` | `nextIntent({ intent, pointerType, distance, held })`, `releaseOutcome(...)`, `HOLD_MS` |

State and components:

| File | What |
|---|---|
| `deskStore.ts` | Unsaved Desk UI state ([architecture.md](architecture.md)): view, `flying`, `tidying`, `editingId`, `newCardId`, `searchOpen`, `query`; actions `setView`, `flyTo`, `animateTidy`, `openEditor`, `closeEditor`, `toggleSearch`, `setQuery` |
| `dom.ts` | `measureCardHeights()` and `viewport()` — the only place that reads sizes from the DOM |
| `Desk.tsx` | The surface: world `div`, grain, gestures, Card drag, double-click to create |
| `AreaRegion.tsx` | One Area: the soft tinted region and its label with the Card count |
| `DeskCard.tsx` | One Card on the Desk (memoized) |
| `ItemCheck.tsx` | An Item's box, shared by `DeskCard` and `CardEditor` |
| `CardEditor.tsx` | The editor sheet |
| `Dock.tsx` | Area buttons, See all, Tidy up |
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

- One `useGesture` controller on the Desk handles drag, pinch and wheel. A press inside `button, input, textarea, select` is ignored, so an Item's box never starts a drag. A press on a Card is `pending`; anywhere else it is `pan`. `nextIntent()` decides each move:
  - mouse/pen + `pending` + > 4 px → `drag`
  - touch + `pending` + > 9 px before the hold → `pan` (a quick swipe over a Card pans)
  - touch + `pending` + the 320 ms timer fired → `drag`, plus `navigator.vibrate(12)` where supported
- The hold is a timer started on the press, **not** use-gesture's `delay`: `delay` starts the drag as soon as the pointer moves, and MTF needs movement before the hold to mean pan.
- While lifted: no tilt, scale 1.04, `shadow-lift`, drawn above everything. The Card is moved by writing its `transform` straight to the DOM; the store is written once, on drop (`dropCard`), which sets the position, the Area, a new tilt and `z = max(z) + 1` so the last moved Card stays on top after a reload.
- A drag interrupted by the system (`pointercancel`) or by a second finger (a pinch starts) is cancelled: the Card goes back to where it started and keeps its Area.
- The Desk has `touch-action: none`, no text selection, no iOS long-press callout, and no context menu.

## Areas

- Regions of the Desk read from `data.areas`, whatever their number. On a first launch with no Areas, `ensureDefaultAreas` stores Trabajo, Vida and Recordar (sage, sand, sky) as a row of 980 × 1000 rects from (80, 120), 80 px apart. The space below the middle Area stays free for the Jar (change 3).
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
- **See all** fits `deskBounds`: every Area and every Card on the Desk. The 8% zoom floor wins: on a phone, a Desk wider than ~5,000 px (a Card dropped very far out) cannot fit entirely, and See all shows its middle at 8%.
- **Tidy up** (`tidyLayout`), per Area: its Cards on the Desk sorted pinned first, then `createdAt` newest first; `cols = max(1, floor((w + 52) / (236 + 52)))` columns, centered in the Area, starting 140 px below its top; each Card goes into the shortest column with x jitter ±14 px, y jitter −8…+10 px and a new tilt (±2.2°); 40 px between Cards in a column. Positions only: no Card changes Area. Animated for 560 ms unless reduced motion.
- **Search**: matches (`matchesQuery`: title, text and Items, ignoring case and accents) get a 3 px **ink** ring and the rest drop to 18% opacity. `Enter` flies to the first match in Desk order (highest `z` first) with `cardView`. `Esc` or the search button closes and clears it. An empty query dims nothing.
- **Initial view** (`initialView`), after `document.fonts.ready`: the whole Desk if it fits at `s ≥ 0.34`, otherwise the first Area with `areaView`.
- `Esc` closes the open sheet first.

## The Jar (change 3)

- Lives on the Desk below the middle Area; tapping it opens Mis logros.
- Dropping a Card whose center lands on the Jar:
  - **has unchecked Items** → refused: the Card slides back to where the drag started, toast "Todavía no · Te faltan N elementos".
  - **finished, or has no Items** → accepted: the Card shrinks into the Jar, a paper piece in the Area color drops in, sparks, toast, the wins counter bumps.
- Jarred Cards leave the Desk but are kept; Mis logros lists them with **Devolver** (take back out to their Area).

## Accessibility

- Cards are focusable `article`s; `Enter` opens the editor. The editor's **Place** selector moves a Card to another Area without dragging; this is the non-gesture path and must always exist. Keyboard users navigate with the Dock, See all and search.
- `prefers-reduced-motion` disables fly-to and Tidy up animations (and, from change 3, sparks and drops).
