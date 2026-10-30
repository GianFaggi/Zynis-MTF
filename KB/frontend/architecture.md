---
area: architecture
description: Data flow, state store, storage layer and the V2 sync path for Zynis MTF
---

# Architecture

## Shape of the app

One screen: the **Desk**. Everything else (Card editor, Mis logros, settings) opens as a sheet over it. There is no router in the MVP.

```
  +------------------------------------------------------------+
  |  Floating UI: brand · search · wins counter · settings     |
  |                                                            |
  |  Desk (pan / zoom)                                         |
  |    world div  (transform: translate(x,y) scale(s))         |
  |      Areas (soft colored regions)                          |
  |      Cards (absolute, Desk coordinates)                    |
  |      Jar                                                   |
  |                                                            |
  |  Dock: jump to Area · Jar · See all · Tidy up   (+) FAB    |
  +------------------------------------------------------------+
     sheets: Card editor · Mis logros · Settings
```

## Data flow

```
  React components ----------------------------+
       |  read slices / call actions           |  view, editor, search
       v                                       v
  appStore (src/store/appStore.ts)       deskStore (src/desk/deskStore.ts)
  saved data + settings                  Desk UI state, never saved
       |  persist whenever `data` is replaced (a drag writes once, on drop)
       v
  Storage layer  (src/lib/storage.ts)
       |
       +--> MVP: localStorage
       +--> V2:  .NET API (same interface, plus sync)
                 API on Render, Postgres on Neon
```

## Two stores

- **`appStore`** holds what is saved: `data` (the `MtfData` document) and the device settings `language`, `theme`, `arrangement` and `areaJars` (each saved under its own key, never in `data`). A `subscribe` writes `data` through the storage layer whenever its reference changes. Its actions replace `data` immutably and set `updatedAt` on what they touch; a Card and its win events always change in the same replacement ([Wins as events](#wins-as-events)):
  - `setLanguage(language)`, `setTheme(theme)`
  - `ensureDefaultAreas()` — runs once when the store is created
  - `createCard(point)` → new Card id, `updateCard(id, { title?, body? })`, `togglePin(id)`, `deleteCard(id)` (also removes every event of the Card)
  - `placeWelcomeCard(content)` → new Card id (#20): `welcomeCard(data.areas[0], content, { z: topZ, now, newId })` appended in one replacement, **no event** (MTF wrote it, so it is not a note). `content` (`WelcomeContent`) is translated by the caller with `welcomeContent(language)`, because the store cannot import i18n (`i18n/index.ts` imports the store). From then on it is an ordinary Card: checking, finishing, the Jar and deleting go through the actions above and their Win rules, untouched. `undefined` with no Area, which `ensureDefaultAreas` prevents
  - `addItem(cardId, afterItemId?)` → new empty Item id, `updateItem(cardId, itemId, text)`, `removeItem(cardId, itemId)` — each keeps the Card Win in step; `removeItem` also removes the Item's Wins
  - `toggleItem(cardId, itemId)` → `'checked' | 'finished' | 'unchecked' | undefined`: `'finished'` when this check finished the Card, `undefined` when the Item does not exist. Components turn the outcome into feedback with `useWinFeedback()`; the store never shows UI
  - `dropCard(id, position, height?)` (end of a drag), `placeCard(id, areaId)` (Place selector), `tidyUp(heights)`
  - `closeCard(id, { isNew? })` — when the editor closes: drops blank Items (and their Wins), removes the Card and all its events if it is empty, and counts a kept new Card as a note. `CardEditor` passes `isNew` from `deskStore.newCardId`
  - `jarCard(id, { areaId? })` → `{ ok: true } | { ok: false, pending }`: refuses, writing nothing, a Card with unchecked Items (`pending` = how many), and a missing, empty or already jarred Card (`pending: 0`); otherwise sets `jarredAt` and gives a Card without Items its Card Win. With an `areaId` that exists and is not the Card's own (Sí on another Area's Jar, #19), the same replacement also sets the Card's `areaId`, so a new Card Win carries the new Area; a missing target is ignored. The position is untouched
  - `returnCard(id)` — out of the Jar: `jarredAt = null`, a `spotIn` its Area (or the Area nearest its old position when that Area is gone), on top, and the Card Win follows (a Card without Items loses it)
  - `replaceData(data)` — Import (change 4): the validated Backup document becomes `data` as a whole and the `subscribe` saves it; the language, the theme, the saved arrangement and `areaJars` stay. No Win feedback fires: the counter just shows the new count
  - Areas the user shapes (#7), each one `data` replacement, writing nothing when nothing changes. The rules are the pure functions in `src/desk/areas.ts` ([desk.md](desk.md#areas)):
    - `createArea(name)` → new Area id: a uuid, the provisional `name` passed in by the caller (the store knows no strings), `nextColor`, `freeSlot`, `createdAt` / `updatedAt`; appended to `data.areas`
    - `renameArea(id, typed)` — `cleanName`; an empty name removes `name` from a default Area and leaves a custom one unchanged
    - `recolorArea(id, color)` — the color only; Cards and Jar pieces read it through their `areaId`
    - `moveArea(id, dx, dy)` — end of an Area move: shifts the `rect` and every Card of that Area on the Desk (`jarredAt === null`) by the same rounded amount, keeping `z` and tilt; a move that rounds to 0 writes nothing
    - `arrangeAreas(targets)` (#18) — Fila, Tabla, Estrella or Mi disposición: `targets` maps Area ids to rects computed by `src/desk/arrange.ts`. Every Area whose rect differs gets it (and `updatedAt`), and its Desk Cards shift by its top-left delta, all in one replacement; Areas not in `targets` or already there are untouched, and identical targets write nothing. A restored saved size with the same top-left moves no Card. `moveArea` and `arrangeAreas` share one private helper, `withAreaCardsShifted(cards, shifts, now)`, so "Cards travel with their Area" ([ADR 0007](../../docs/adr/0007-areas-the-user-shapes.md)) is written once
    - `resizeArea(id, rect)` — end of an Area resize: writes the `rect` as given
    - `deleteArea(id, destinationId)` — refuses the last Area, a missing destination and the Area itself. Otherwise removes the Area; its Desk Cards get the destination, a `spotIn` position and new `z` values on top in their old order, its Cards in the Jar only the new `areaId`. `events` are untouched, so no Win is lost
  - `moveArea` and `resizeArea` do **not** check overlap or the minimum size: the Desk does, with `overlapsAny` and `resizedRect`, before it calls them, the same way it calls `jarVerdict` before `jarCard`. One place decides each rule. `arrangeAreas` trusts its targets the same way: `arrange.ts` and its tests guarantee they never overlap
  - **`arrangement`** (#18): "Mi disposición", a device setting like `theme` (`SavedArrangement | null`, loaded on create from `mtf_arrangement`, never in `data`). `saveArrangement()` takes every Area's current `rect` with `savedAt = Date.now()`, sets it and writes it through the storage layer, replacing the previous one. `replaceData` leaves it alone, so after an Import with other Area ids "Mi disposición" is simply unavailable (`canRestore`)
  - **`areaJars`** (#19): "Frasco por área", a device setting like `theme` (`boolean`, loaded on create from `mtf_area_jars`, off unless `'1'`). `setAreaJars(on)` sets it and writes the key; `data` is untouched. While it is on, each Area draws a small Jar and Mis logros shows its Area filter ([desk.md](desk.md#area-jars-19))
- **`deskStore`** holds Desk UI state that is never saved: the view `{ x, y, s }`, `flying`, `tidying`, `editingId`, `newCardId`, `searchOpen`, `query`, and the actions that change them: `setView`, `flyTo`, `animateTidy`, `openEditor(id, { isNew })`, `closeEditor`, `toggleSearch`, `setQuery`. It is shared because the Dock, the `+` button and search live outside the Desk but fly the view or open the editor. Change 3 added the Win feedback state: `toast` (`{ id, title, detail? } | null`) with `showToast(title, detail?)` (replaces the current toast and hides it after 2.8 s; a queue would lag behind fast Wins), `winsOpen` with `openWins` / `closeWins` (the Mis logros sheet; #19 added `winsAreaId`, the Area it is filtered to, set by `openWins(areaId = null)` and changed by `setWinsArea(id)`), and `winsBump` with `bumpWins` (the counter remounts its number on it to replay the bump). #7 added `areaEditor` (`{ id, isNew } | null`) with `openAreaEditor(id, { isNew })` / `closeAreaEditor()`. Change 4 added `resetAfterImport()`: clears `editingId`, `newCardId`, `areaEditor` and `query` and closes search and Mis logros, which may point at Cards or Areas an Import removed; the view is left alone, and `App` then calls `showWholeDesk()` (`src/desk/view.ts`, shared with the Dock's See all). #20 added `focusCardId` (`string | null`, `null` by default and in `getInitialState()`) with `setFocusCard(id)`: the Card the first view shows instead of the usual one. `placeWelcomeOnce()` sets it to the Welcome Card it placed; the Desk's first view reads it and clears it ([desk.md](desk.md#navigation-helpers)).
- **`installStore`** (`src/install/installStore.ts`, change 4) holds the browser's install offer: `promptEvent` (the captured `beforeinstallprompt`) and `installed`. `listenForInstall()` runs in `main.tsx` before React mounts, because Chromium can fire the event early ([pwa.md](pwa.md#install-guidance)).
- **No React render per gesture frame.** The world `div` does not read the view through a selector: `Desk` subscribes to `deskStore` with `subscribe()` and writes `transform`, the grain layer's `transform` and `data-far` straight to the DOM. Only `transform` changes per frame, so a pan or zoom is composited by the GPU with no repaint. A dragged Card is moved the same way, through its element; the store hears about it once, on drop.

## Source layout

| Path | What |
|---|---|
| `src/main.tsx` | Entry: font imports, `index.css`, `listenForInstall()`, `applyTheme(theme)` with the stored theme, `placeWelcomeOnce()` (the Welcome Card once per device, before the first render, so StrictMode cannot place it twice and component tests, which never import `main.tsx`, keep a blank Desk), mounts `<App />`. Dev only: with `?avion` in the URL it imports `src/sync/PlanePreview` dynamically and mounts it instead, skipping `placeWelcomeOnce()`; a production build replaces `import.meta.env.DEV` with `false`, so the branch and its chunk are dropped (#35) |
| `src/App.tsx` | The paper screen: composes the Desk, the floating UI (wordmark, tools pill with search, the wins counter and settings, Dock, `+` button, install nudge), the sheets (Card editor, Mis logros, Settings with language, theme, Areas, Backup, install and introduction sections) and the toast; keeps `<html lang>` and the theme (`applyTheme`) in sync with the store and asks for persistent storage (`usePersistentStorage`) |
| `src/index.css` | Tailwind import, the `dark` custom variant, Paper tokens, the dark block, base styles, Win keyframes, the paper plane keyframes (`fly`, `trail`, `sway`), Area paint utilities ([design-system.md](design-system.md)) |
| `src/components/ui/` | Closed-API UI kit: `Button`, `Callout`, `IconButton`, `Segmented`, `Sheet`, `Toast` |
| `src/desk/` | The Desk feature: pure helpers (`geometry`, `areas`, `arrange`, `tidy`, `search`, `cardText`, `intent`), `deskStore`, `dom`, `view` (`showWholeDesk`, `welcomeCardView`), and the components `Desk`, `AreaRegion`, `DeskCard`, `ItemCheck`, `CardEditor`, `Dock`, `SearchBox`, `AreaEditor`, `AreasSection` ([desk.md](desk.md)) |
| `src/welcome/` | The Welcome Card (#20): pure `welcomeCard` (`welcomeCard(area, content, { z, now, newId })`, `WelcomeContent`); `welcome` (`welcomeContent(language)`, `placeWelcome()`, used by both the first launch and "Ver introducción", and `placeWelcomeOnce()`); the Settings section `WelcomeSection` ("Ver introducción") ([desk.md](desk.md#the-welcome-card-20)) |
| `src/wins/` | Wins and the Jar (change 3): pure `rules`, `stats` and `jarLayout`; `useWinStats`, `feedback` (`useWinFeedback`), `sparks`; the components `Jar`, `JarIcon`, `WinsCounter`, `MisLogros`, `WinsChart` ([desk.md](desk.md#files-srcwins)) |
| `src/backup/` | Export / Import (change 4): pure `backup` (`backupFileName`, `makeBackup`, `readBackup`) and `validate` (`isValidData`); `deliver` (`deliverFile`: share sheet or download); the Settings section `BackupSection` with the import confirmation ([storage.md](storage.md#export--import)) |
| `src/install/` | Install guidance (change 4): `platform` (`isStandalone`, `isIos`), `installStore` (captured install prompt, `installMode`, `useInstallMode`), the Settings section `InstallSection` and the one-time `InstallNudge` ([pwa.md](pwa.md#install-guidance)) |
| `src/sync/` | Waiting for the server (#35; #36 and #37 grow it): pure `wait` (`WAIT_STEPS`, `waitStage(elapsedMs)`, `nextStepAt(elapsedMs)`, `INDICATOR_DELAY`); `useWaitStage` (start taken on mount, one timeout to the next stage, the stage worked out from the clock); the components `PaperPlane` (the inline SVG), `PlaneWait` (the block a sheet shows while its request is pending) and `SyncIndicator` (for the tools pill). Mounted means waiting: callers render `{pending && <PlaneWait />}`. The dev-only `PlanePreview` behind `/?avion` simulates a server that answers in 0.8 s, in 40 s or never ([design-system.md](design-system.md#tokens)) |
| `src/store/appStore.ts` | `createAppStore()` + the app's `useAppStore`: `data`, `language`, `theme`, `arrangement`, `areaJars` and the actions above. Loads on create, then runs `ensureDefaultAreas`; a `subscribe` saves `data` whenever its reference changes |
| `src/store/usePersistentStorage.ts` | Asks the browser for persistent storage once per launch, the first time the data holds a Card ([storage.md](storage.md#persistent-storage)) |
| `src/lib/storage.ts` | The only module that touches localStorage ([storage.md](storage.md)) |
| `src/lib/id.ts` | `newId()` — v4 UUIDs |
| `src/lib/theme.ts` | `applyTheme(theme)` — the only DOM writes for the theme: `data-theme` on `<html>` and the `theme-color` metas ([design-system.md](design-system.md#how-the-theme-switches)) |
| `src/types/index.ts` | `Language`, `Theme`, `SavedArrangement`, `Area`, `Item`, `Card`, `WinEvent`, `MtfData` |
| `src/i18n/locales/es.ts`, `en.ts` | Dictionaries; `en` is typed `Messages = typeof es` |
| `src/i18n/detect.ts` | `detectLanguage(languages)` — kept apart from `index.ts` so the store can import it without an import cycle |
| `src/i18n/index.ts` | `useT()`, `translate()`, `languageNames`, re-exports `detectLanguage` |
| `src/test/setup.ts` | Vitest setup ([testing.md](testing.md)) |
| `src/test/fixtures.ts`, `src/test/stores.ts` | Test data builders; `resetStores()` for component tests |
| `e2e/` | Playwright specs; shared helpers (seeding, CDP touch) in `e2e/helpers.ts` |

i18n: components call `const t = useT()` and `t('key', ...args)`. UI kit components never read the store; screens pass them translated texts as props.

- **Components never touch localStorage.** They talk to the store; the store talks to the storage layer.
- **The storage layer is the seam for V2.** Swapping localStorage for API calls (plus a local cache for offline) must not change any component.
- **View state is not persisted as data.** Pan/zoom (`view.x`, `view.y`, `view.s`), the open editor and search live in `deskStore`, not in the backup. (Remembering the last view per device is a convenience, stored separately if added.)
- **During a drag**, the dragged Card's position updates the DOM directly (no full re-render per frame); the store is updated on drop.

## Wins as events

Mis logros, the wins counter and the Jar caption are computed from a list of **win events** (`MtfData.events`: `item`, `card`, `note`, each with an `id` and the moment `at`), never from stored counters. The list is **not append-only**: events are removed when what they count goes away ([ADR 0005](../../docs/adr/0005-win-events-with-removals.md)).

Two invariants hold after every store action:

- **A Card on the Desk has one `card` event exactly while it is finished** (`isFinished`: at least one Item with text, all checked). A Card in the Jar always has one.
- **A Win exists only while the Card or Item it counts exists.**

The rules are pure functions in `src/wins/rules.ts`; the store only wires them in, changing the Card and `events` in one `data` replacement:

| Rule | When | Effect on `events` |
|---|---|---|
| `itemToggled` | `toggleItem` | Check → append an `item` event. Uncheck → remove the most recent `item` event for that Item. Then `syncCardWin` |
| `syncCardWin` | After any change to a Desk Card's Items (`toggleItem`, `addItem`, `updateItem`, `removeItem`, `closeCard`) and on `returnCard` | Finished and no Card Win → append a `card` event; not finished and has one → remove it |
| `itemsRemoved` | `removeItem`, and `closeCard` when it drops blank Items | Remove those Items' `item` events |
| `cardDeleted` | `deleteCard`, and `closeCard` when it discards an empty Card | Remove every event with that `cardId` (`item`, `card`, `note`) |
| `cardJarred` | `jarCard` | Append a `card` event only if the Card has none (a Card without Items) |
| `noteWritten` | `closeCard` of a new Card that is kept | Append a `note` event |

New events carry `cardId`, a `title` snapshot (`displayTitle(card)`) and the `areaId`; `itemId` only on `item` events. Title and text edits, moves, Place and Tidy up never touch `events`, and time never removes anything. `jarVerdict(card)` (accept when no Item is pending) gates the Jar before anything is written.

"Things done" = `item` + `card` events; `note` events are counted apart. `src/wins/stats.ts` turns the list into numbers: `winStats(events, now)` → `days` (the last 7 local calendar days, oldest first, built from dates so a DST change never shifts a day), `week` (`items`, `cards`, `notes`, `done`), `best` (ties → most recent day, `null` for a quiet week) and `total` (all things done ever). `daysAgo(time, now)` counts calendar days for "hoy" / "ayer" / "hace N días".

**Wins by Area** (#19) are filtered at read time, never stored: `eventsOfArea(events, cards, areaId)` keeps the events whose Card belongs to that Area **now**, falling back to the event's `areaId` snapshot only when its Card is gone (possible only from an imported file). So the Areas always add up to "Todas", a Card moved by Sí on another Area's Jar brings its Wins along, and the Wins of a deleted Area's Cards follow them. `useWinStats(areaId?)` runs `winStats` over that list; without an Area (the wins counter, the Jar caption) it reads every event and does not depend on the Cards.

Removing events makes V2 sync need tombstones or a deletion log next to `events`; that cost is recorded in ADR 0005.

## MVP vs V2

| | MVP | V2 |
|---|---|---|
| Persistence | localStorage | .NET API + database, local cache |
| Accounts | none (one user per browser) | login |
| Phone ↔ PC | Export / Import backup file | automatic sync |
| Offline | always | always (sync when back online) |
| Hosting | Vercel only (static) | Vercel + API on Render Free + Postgres on Neon Free ([ADR 0009](../../docs/adr/0009-v2-backend-hosting.md)) |

## Data model decision

Every entity carries `id` (uuid), `createdAt` and `updatedAt` from day one ([ADR 0002](../../docs/adr/0002-local-first-storage.md)). Positions are stored in Desk coordinates, independent of screen size and zoom, so the same Desk renders on a phone and a PC.

Entity shapes → [storage.md](storage.md). Desk mechanics → [desk.md](desk.md).
