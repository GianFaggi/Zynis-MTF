# Design

## Context

Change 2 left a working Desk. Here is what change 3 builds on:

- **Data is ready.** `MtfData` v1 already has `events: WinEvent[]` (`id`, `type: 'item' | 'card' | 'note'`, `at`, optional `cardId`, `itemId`, `title`, `areaId`) and `Card.jarredAt: number | null` ([src/types/index.ts](../../../src/types/index.ts)). Nothing writes them yet. The Desk already hides Cards with `jarredAt !== null`, and `deskBounds` and `tidyLayout` already ignore them.
- **`appStore.toggleItem`** only flips `done`. **`closeCard(id)`** drops blank Items and discards empty Cards, but it does not know whether the Card is new: the editor learns that from `deskStore.newCardId` ([src/desk/CardEditor.tsx](../../../src/desk/CardEditor.tsx)).
- **The drag pipeline in [src/desk/Desk.tsx](../../../src/desk/Desk.tsx)**: `beginPress` classifies a press (Area label, control, Card, paper), `follow` moves the lifted Card through `style.translate` and previews its Area through `--b-preview`, `drop` calls `dropCard` once, and `settle` clears what the drag wrote. Area labels are `button`s with `data-area-label`, checked **before** the control rule, so a press on a label can still pan. `releaseOutcome` turns a short release on a label into a fly.
- **Reduced motion**: a global rule in `src/index.css` sets `animation: none` and `transition: none` under `prefers-reduced-motion`. It covers anything done in CSS, but not JS timers or DOM nodes created from JS.
- **UI kit**: `Button`, `IconButton`, `Segmented`, `Sheet` (closed API, never the accent). There is no toast yet.
- **The approved mockup** ([design/mtf-mockup-desk.html](../../../design/mtf-mockup-desk.html)) is a working reference for every number below: the Jar's place and size (1500, 1170, 260 × 300), its hit margin, the piece layout, the animation timings, the chart's geometry, and the Spanish and English copy.

## Goals / Non-Goals

**Goals:**
- Every Win rule is a pure function over `(events, card)` and is unit-tested. The store only wires them in.
- Win feedback (toast, sparks, counter bump) is triggered by components from what store actions return, so the store stays free of UI.
- Dropping on the Jar reuses the existing drag pipeline: no second gesture system, and no React render per frame.
- No schema change and no migration.

**Non-Goals:**
- No motion library: CSS transitions and keyframes only (stack.md lists a motion library as a V2 option, and only if CSS falls short).
- No chart library: one small hand-drawn SVG.
- No storing the Jar's position, and no moving it (see decision 4).
- No pop animation on an Item's box when it is checked. A CSS rule keyed on "checked" would also play for every checked Item on load. The counter bump is the feedback.

## Decisions

### 1. Feature folder `src/wins/`
Wins get their own folder, like `src/desk/`:

| File | What |
|---|---|
| `rules.ts` (pure) | `jarVerdict(card)`, `hasCardWin(events, cardId)`, `itemToggled(events, card, itemId, now, newId)`, `syncCardWin(events, card, now, newId)`, `itemsRemoved(events, itemIds)`, `cardDeleted(events, cardId)`, `cardJarred(events, card, now, newId)`, `noteWritten(events, card, now, newId)` |
| `stats.ts` (pure) | `winStats(events, now)`, `dayStart(time)`, `daysAgo(time, now)` |
| `jarLayout.ts` (pure; not `jar.ts`: next to `Jar.tsx`, `./Jar` would resolve to it on case-insensitive file systems) | `jarRect(areas)`, `captionRect(jar)`, `jarBounds(jar)`, `isOverJar(jar, point)`, `jarPieces(colors)`, `JAR_SIZE`, `JAR_CAPACITY` |
| `sparks.ts` | `burst(rect)`: the one DOM side effect, skipped under reduced motion |
| `feedback.ts` | `useWinFeedback()`: turns a store outcome into toast, sparks and bump |
| `Jar.tsx`, `WinsCounter.tsx`, `MisLogros.tsx`, `WinsChart.tsx`, `JarIcon.ts` | Components |

`isFinished(card)` and `pendingItems(card)` go into `src/desk/cardText.ts`, next to `usableItems`, because they are facts about a Card's content and `DeskCard` needs them. Each pure module gets a co-located test.
*Alternative*: put everything in `src/desk/`. The Desk folder already holds 20 files, and Wins have their own rules and sheet. Keeping them apart mirrors the glossary's "Wins" section.

### 2. Win rules (pure, in `rules.ts`)
Every function returns a new `events` array and leaves its input untouched. Each new event gets `id: newId()`, `at: now`, `cardId`, a `title` snapshot (`displayTitle(card)`) and the `areaId`. The `itemId` is set only on Item events.

There are two invariants:

- **A Card on the Desk has a Card Win exactly while `isFinished(card)`.** In the Jar it always has one.
- **A Win exists only while the thing it counts exists.**

The rules:

- **Check** (`itemToggled` with the Item now done): append an `item` event. **Uncheck**: remove the **most recent** `item` event with that `itemId`.
- **Card Win** (`syncCardWin(events, card)`), run after every change to a Desk Card's Items (`toggleItem`, `addItem`, `updateItem`, `removeItem`, `closeCard`): finished and `!hasCardWin` → append a `card` event. Not finished and `hasCardWin` → remove it. So adding an unchecked Item to a finished Card removes the Card Win but keeps the Item Wins; finishing it again (by checking, or by removing the last unchecked Item) brings the Card Win back, once. The checked Items' Wins are the partial credit for a half-done Card, so there is no separate "semi-win" type (decided with the user).
- **Removed Items** (`itemsRemoved(events, itemIds)`): `removeItem`, and `closeCard` when it drops blank Items, remove those Items' `item` events.
- **Deleted Card** (`cardDeleted(events, cardId)`): `deleteCard`, and `closeCard` when it discards an empty Card, remove **every** event with that `cardId` (`item`, `card` and `note`) (decided with the user).
- **Jar accepted** (`cardJarred`): append a `card` event only if `!hasCardWin` (a Card without Items).
- **Returned from the Jar**: `syncCardWin` on the Card back on the Desk, so a Card without Items loses its Card Win and a finished one keeps it.
- **Note** (`noteWritten`): append a `note` event.
- Title and text edits, moves, Place and Tidy up never touch `events`, and time never removes anything.

"Things done" = `item` + `card` events, while `note` events are counted apart.

Why removals rather than a strictly append-only log: the issue requires that unchecking removes the Win, the user wants Wins to go away with their Card or Item, and the Mis logros numbers must stay a simple count of the list. Why this matters for V2 sync → [ADR 0005](../../../docs/adr/0005-win-events-with-removals.md) (new). architecture.md's "append-only" wording is corrected, and so is storage.md's "Deleting a Card does not delete its win events".
*Alternative*: counters on the Card (`wonAt`, per-Item `checkedAt`). Now that deleting a Card removes its Wins, that is closer than before, but it still cannot keep a Card Win while the Card is in the Jar without extra fields, it would need a schema change, and it would make V2 merges per-field instead of per-event.

### 3. Store actions return outcomes; components celebrate
In `appStore`:
- `toggleItem(cardId, itemId)` applies `itemToggled` and then `syncCardWin` together with the Item flip, in one `data` replacement. It now **returns** `'checked' | 'finished' | 'unchecked' | undefined`.
- `addItem`, `updateItem`, `removeItem` apply `syncCardWin` (and `removeItem` applies `itemsRemoved` first). `deleteCard` applies `cardDeleted`.
- `closeCard(id, { isNew = false } = {})`: a discarded empty Card → `cardDeleted`; dropped blank Items → `itemsRemoved` + `syncCardWin`; a kept new Card → `noteWritten`. `CardEditor` passes `isNew` from `deskStore`, which it already reads.
- `jarCard(id)` returns `{ ok: true } | { ok: false, pending: number }`. It refuses (and writes nothing) when `jarVerdict` refuses or the Card is missing, already in the Jar, or empty. Otherwise it sets `jarredAt = now`, `updatedAt`, and applies `cardJarred`.
- `returnCard(id)`: sets `jarredAt = null`, puts the Card at `spotIn(area)` in its Area with `z = topZ`, sets a new `updatedAt`, and applies `syncCardWin`. If its Area no longer exists (possible after custom Areas, #7), it uses `areaForPoint(areas, card.position)`.

Every action changes the Card and `events` in **one** `data` replacement, so a save never holds a Card and Wins that disagree.

`jarVerdict(card)` = `pendingItems(card).length === 0 ? accept : refuse(pending)`. The Desk calls it before animating, so a refused Card never reaches the store.

`useWinFeedback()` gives components `itemToggled(outcome, element)`, `jarred()` and `refused(pending)`. These show the right toast, `burst` sparks from the element or the Jar, and call `bumpWins()`. `DeskCard` and `CardEditor` call `itemToggled` with the outcome of `toggleItem`.
*Alternative*: let the store raise toasts. That would tie the saved-data store to i18n and to the DOM, and its tests would need a UI.

### 4. The Jar's place is derived from the Areas, not stored
`jarRect(areas)` = 260 × 300, centered under the horizontal middle of the Areas' bounding box, 50 px below the lowest Area. For the default row that gives exactly the mockup's (1500, 1170). With no Areas it returns `null` and no Jar is drawn. `jarBounds(jar)` adds the caption below it (360 px wide, ~90 px tall); `deskBounds` includes it, so See all and the initial view show the Jar. Dock "Frasco" flies to `fitRect(jarBounds + 200 px sideways / 60 px vertical margin)` with `maxScale: 1`, as in the mockup.

`isOverJar(jar, point)` uses the mockup's forgiving margin: the Jar rect grown by 50 px left and right, 60 px on top and 30 px at the bottom. The point is the dragged Card's center, the same point `areaForPoint` uses.
*Alternative*: store the Jar's position in `MtfData` (and let the user move it). That needs a schema bump and a migration for something nobody asked to move. A derived place also follows custom Areas (#7) for free.

### 5. Dropping on the Jar, inside the existing drag pipeline
- **Press**: `beginPress` recognizes `[data-jar]` the same way it recognizes Area labels, before the control rule, so a press on the Jar pans when it moves. `releaseOutcome` gains `onJar`, and a short release there (< 6 px) returns `'jar'`, which opens Mis logros. The Jar's own `onClick` only handles the keyboard (`event.detail === 0`), exactly like `AreaRegion`.
- **Follow**: when the Card's center is over the Jar, the Jar element gets `data-over` (accent outline, scale 1.05) and `--b-preview` is removed, so the Card shows no other Area's color. Otherwise the current Area preview applies.
- **Drop over the Jar**:
  - `jarVerdict` **refuses** → `data-returning` on the Card (a 0.35 s `translate` transition), then `style.translate` is cleared so the Card slides back to its stored place. `settle` runs after 380 ms. Toast via `refused(pending)`. Nothing is written to the store.
  - **accepts** → `data-into-jar` on the Card (pointer events off, 0.45 s transition to the Jar's center with `rotate(24deg) scale(.12)` and `opacity: 0`). After 460 ms: `jarCard(id)`, `settle`, then `jarred()` (sparks over the Jar, bump, toast). React unmounts the Card when `jarredAt` is set.
  - Under reduced motion both waits are 0: the outcome comes at once and only the toast shows.
- **Drop elsewhere** is unchanged: `dropCard`.
- A drag cancelled by `pointercancel` or a pinch still goes through `settle` and never reaches the Jar branch.

The press-and-hold → drag path is shared, so touch and mouse behave alike with no extra code. Playwright covers both (decision 13).

### 6. The Jar component and its fill
`Jar.tsx` is drawn in the world `div` after the Cards' Areas and before the Cards, from `jarRect(areas)`. It is an element with `data-jar`, `role="button"`, `tabIndex=0`, and an `aria-label` like "Frasco: N tarjetas. Abrir Mis logros". It renders the mockup's SVG: lid in `color-mix(accent 70%, ink)`, glass and neck filled with `--color-glass`, a shine stroke, and a label card with "Logros" and the number of jarred Cards in `accent-ink` Literata. The caption sits underneath.

`jarPieces(colors)` returns up to `JAR_CAPACITY` piece placements: 7 per row, staggered rows, and a deterministic jitter from the index (the mockup's `jit(i, k)`), so the Jar looks the same on every render and in tests. Pieces are ordered by `jarredAt`, oldest at the bottom, in `var(--color-<area color>)`. Pieces beyond capacity are not drawn, but the label number still counts every Card. The Jar keeps the previous set of jarred ids in a ref, and a piece whose Card is new since the last render gets `animate-drop`. On the first render none animate.

### 7. Feedback state in `deskStore`
`deskStore` (unsaved UI state) gains:
- `toast: { id: number; title: string; detail?: string } | null` and `showToast(title, detail?)`. A new toast replaces the current one and hides after 2.8 s.
- `winsOpen`, `openWins()`, `closeWins()`.
- `winsBump: number` and `bumpWins()`. `WinsCounter` renders its number inside a `span` keyed by `winsBump`, so each bump remounts it and restarts the `animate-bump` keyframe without timers.

### 8. Toast in the UI kit
`Toast({ message: { id, title, detail? } | null })`: a fixed pill above the Dock (bottom 92 px plus the safe area), ink fill with paper text, title in Literata 16 px and detail 13 px. It has `role="status"` and `aria-live="polite"`, and its region is **always mounted**, so screen readers announce changes. It is non-interactive (`pointer-events: none`). It is a closed API, so it never uses the accent, matching the kit rule. `App` renders it from `deskStore.toast`.

### 9. Stats and Mis logros
`winStats(events, now)` returns:
- `days`: 7 entries `{ start, count }`, from 6 days ago up to today. Day starts come from local calendar dates (`new Date(y, m, d - i)`), never from `now - i * 86 400 000`, so a daylight-saving change cannot shift a day.
- `week: { items, cards, notes, done }` (`done = items + cards`).
- `best: { start, count } | null`: the highest day. Ties go to the most recent day, and `null` when the week is empty.
- `total`: every `item` + `card` event ever.

`daysAgo(time, now)` counts calendar days and feeds "hoy" / "ayer" / "hace N días".

`MisLogros.tsx` is a `Sheet` with a new `wide` prop. It holds two panels, side by side from 760 px: the summary (big `done` number in `accent-ink` Literata, three stats with notes in pencil, `WinsChart`, the best-day line, and the total in pencil) and "En el frasco" (every jarred Card, newest first, with its title, an Area dot and name, the relative day, and a quiet `Button` "Devolver"). Devolver calls `returnCard` and shows "Volvió al escritorio". The sheet stays open.

`WinsChart.tsx` uses the mockup's SVG geometry (336 × 176 viewBox, bar width 26, `max = max(4, counts)`, minimum bar height 4). Past bars use `--color-bar` and today's bar the accent. Value labels sit above the bars, weekday initials below, and today's initial is in `accent-ink`. It has `role="img"` and the label "Cosas hechas por día, últimos 7 días". Weekday initials come from the dictionary (`['D','L','M','X','J','V','S']` / `['S','M','T','W','T','F','S']`, where "X" is the Spanish convention for miércoles). The best day's full name comes from `Intl.DateTimeFormat(locale, { weekday: 'long' })`, which is built in and works offline.

### 10. Counter, Dock button, editor button
- `WinsCounter` sits in the top-right tools pill between search and settings (the mockup's order). It is a 38 px pill with the `accent-soft` fill, `accent-ink` text, a lucide `Star` and a tabular number, and `aria-label` "Mis logros: N cosas hechas en 7 días". It lives in `src/wins/`, not in the kit, because the kit never uses the accent.
- Dock: a "Frasco" `ToolButton` after the Area buttons, before See all. lucide has no jar, so `JarIcon` is made with lucide-react's own `createLucideIcon` from the mockup's 16 px path. It is still a `LucideIcon`, so `ToolButton` takes it unchanged and no new library is needed.
- Editor footer: a quiet `Button` "Llevar al frasco" before Delete, `disabled` while `isEmptyCard(card)`. On activate, `jarVerdict` refuses → `refused(pending)` and the editor stays open; it accepts → `closeCard(id, { isNew })`, `closeEditor()`, `jarCard(id)`, `jarred()`. Running `closeCard` first means a new Card gets its note before it goes into the Jar.

### 11. Paint
In `src/index.css` `@theme static`:
- `--color-accent-soft: color-mix(in oklab, var(--color-accent) 14%, var(--color-paper))`
- `--color-bar: color-mix(in oklab, var(--color-accent) 30%, var(--color-rule))`
- `--color-glass` (light `rgb(255 255 255 / .45)`, dark `rgb(255 255 255 / .05)`)

The first two are defined through `var()`, so the dark block needs no new lines for them. New keyframes go in as `--animate-drop` (0.6 s, from `translateY(-190px)`), `--animate-bump` (0.5 s, scale 1.14), `--animate-spark` (0.75 s, to `translate(var(--dx), var(--dy)) scale(.4)`, opacity 0). A finished `DeskCard` gets `data-finished` and the finished look of decision 12.

### 12. A finished Card stands out (after the phone check)
The first version followed the mockup: the content faded to 62 % and the border took a faint accent. On a real phone that read as *switched off*, the opposite of a Win. The user chose version C of [design/mtf-mockup-finished-card.html](../../../design/mtf-mockup-finished-card.html):
- **Nothing fades.** A `card-won` utility (in `src/index.css`, used as `data-finished:card-won`) warms the Area tint with 10 % accent, sets a 1.5 px border at 70 % accent, and draws a 4 px halo at 12 % accent as an `::after`, so it never fights the Card's own shadows (lifted, search hit) or the ink focus ring. The title turns `accent-ink`; the chip is filled (`accent` with `on-accent` text).
- **A seal**: a 34 px `accent` circle with a check, tilted −12°, on the top-right corner, outside the near-look block so it also shows when zoomed out. A pinned finished Card moves its pin mark to the left of the seal.
- **One-time celebration**: when `toggleItem` returns `'finished'`, `useWinFeedback().itemToggled` sets `data-celebrate` on that Card for 700 ms: `animate-pop` (0.6 s, `scale` 1.06 with a fading accent glow) and, on the seal, `animate-stamp` (0.45 s, from `scale(2.2)`, faded, more tilted). It uses the `scale` / `rotate` properties, not `transform`, so it never fights the tilt or a drag. Keyed on the outcome rather than on "finished", so nothing replays on load or when a Card is finished by removing an Item; skipped under reduced motion. Like the sparks, it is a DOM side effect outside React.
*Alternative*: a looping glow on finished Cards. Rejected: with several finished Cards the Desk gets noisy and loses its calm.

### 13. Tests
- **Vitest, pure**: `rules.test.ts` (every rule in decision 2, including check → uncheck → check = one Win, finishing twice = one Card Win, adding an Item to a finished Card removes only the Card Win, removing the last unchecked Item adds it, removing a checked Item removes its Win, deleting a Card removes all its events, jar/return for Cards with and without Items), `stats.test.ts` (pinned dates with `vi.setSystemTime`: day 6 counts, day 7 does not, per-day counts, ties, an empty week, a DST week), `jar.test.ts` (default rect = (1500, 1170), centered for 4 Areas, `null` without Areas, hit margins, piece capacity and stability), `cardText.test.ts` (`isFinished`, `pendingItems`).
- **Vitest, store and components**: `appStore.test.ts` (`toggleItem` outcomes and events, `closeCard` note only for kept new Cards, `jarCard` accept/refuse, `returnCard` place, z and event), `DeskCard.test.tsx` (chip vs count), `MisLogros.test.tsx` (numbers, quiet-week copy, list order, Devolver), `WinsCounter.test.tsx`, `CardEditor.test.tsx` (the Jar button refuses and stays open, accepts and closes, disabled when empty), `Toast.test.tsx`, `Dock.test.tsx` (Frasco button).
- **Playwright** `e2e/jar.spec.ts`: on desktop, a mouse drop of a finished Card goes into the Jar, the counter changes and the Card is still in the Jar after a reload; a drop of a Card with pending Items comes back to its start with the toast; on the phone, a hold-and-drag onto the Jar is accepted; tapping the Jar opens Mis logros and Devolver brings the Card back to its Area; checking the last Item shows "¡Tarjeta completa!". Existing See all / initial-view e2e tests are re-checked, since the Jar is now part of the Desk bounds.

## Risks / Trade-offs

- [The store is written 460 ms after an accepted drop, so a reload in that window leaves the Card on the Desk] → Acceptable: nothing is lost, the user just drops it again. Writing first and animating a copy would need a second Card element.
- [Unchecking an old Item, removing a checked Item or deleting a Card lowers "since you started"] → Chosen by the user: Mis logros counts what is on the Desk and in the Jar, not a history of everything ever done. Only explicit user actions ever remove a Win; time never does. A user who wants to keep the credit puts the Card in the Jar instead of deleting it.
- [Typing an Item's text toggles the Card Win] → On a finished Card, the first character of a new Item makes it unfinished (Card Win removed). Clearing that text again finishes it (Card Win re-added with a new time). That is correct by the invariant, and the only visible effect is the time of that one Win.
- [A checked Item whose text is cleared keeps its Win until the editor closes] → Blank Items are only dropped on close, so the Win goes away then, together with the Item.
- [Events grow without limit] → About 150 bytes each: even 5,000 Wins a year is under 1 MB, well inside localStorage. If needed, V2 can compact old events into daily counts.
- [The derived Jar moves when Areas change (#7)] → Intended. Cards never sit "in" the Jar on the Desk, so nothing is left behind.
- [Removing events complicates V2 sync merging] → ADR 0005: V2 will need tombstones (or a deletion log). The local format stays a plain list, and the ADR records the cost.
- [Initial view and e2e expectations shift because the Jar enlarges the Desk bounds] → On desktop the fit is width-limited, so the scale does not change (3100 px wide either way). The e2e suite is re-run, and any expectation that changes is updated in this change.
- [A toast replaces the previous one] → On purpose: Wins can come fast, and a queue would lag behind what the user is doing.

## Migration Plan

No schema change: `events` and `jarredAt` exist since schema v1, and older documents simply have no events. Rolling back the code leaves recorded events and `jarredAt` values in `mtf_data`. Change 2's code ignores `events` and hides jarred Cards, so a rollback would hide those Cards until change 3 is back. That is acceptable for a single-user MVP with no release yet.
