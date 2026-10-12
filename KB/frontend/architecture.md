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
  saved data + language                  Desk UI state, never saved
       |  persist whenever `data` is replaced (a drag writes once, on drop)
       v
  Storage layer  (src/lib/storage.ts)
       |
       +--> MVP: localStorage
       +--> V2:  .NET API (same interface, plus sync)
```

## Two stores

- **`appStore`** holds what is saved: `data` (the `MtfData` document) and `language`. A `subscribe` writes `data` through the storage layer whenever its reference changes. Its actions replace `data` immutably and set `updatedAt` on what they touch; a Card and its win events always change in the same replacement ([Wins as events](#wins-as-events)):
  - `setLanguage(language)`
  - `ensureDefaultAreas()` — runs once when the store is created
  - `createCard(point)` → new Card id, `updateCard(id, { title?, body? })`, `togglePin(id)`, `deleteCard(id)` (also removes every event of the Card)
  - `addItem(cardId, afterItemId?)` → new empty Item id, `updateItem(cardId, itemId, text)`, `removeItem(cardId, itemId)` — each keeps the Card Win in step; `removeItem` also removes the Item's Wins
  - `toggleItem(cardId, itemId)` → `'checked' | 'finished' | 'unchecked' | undefined`: `'finished'` when this check finished the Card, `undefined` when the Item does not exist. Components turn the outcome into feedback with `useWinFeedback()`; the store never shows UI
  - `dropCard(id, position, height?)` (end of a drag), `placeCard(id, areaId)` (Place selector), `tidyUp(heights)`
  - `closeCard(id, { isNew? })` — when the editor closes: drops blank Items (and their Wins), removes the Card and all its events if it is empty, and counts a kept new Card as a note. `CardEditor` passes `isNew` from `deskStore.newCardId`
  - `jarCard(id)` → `{ ok: true } | { ok: false, pending }`: refuses, writing nothing, a Card with unchecked Items (`pending` = how many), and a missing, empty or already jarred Card (`pending: 0`); otherwise sets `jarredAt` and gives a Card without Items its Card Win
  - `returnCard(id)` — out of the Jar: `jarredAt = null`, a `spotIn` its Area (or the Area nearest its old position when that Area is gone), on top, and the Card Win follows (a Card without Items loses it)
  - `replaceData(data)` — Import (change 4): the validated Backup document becomes `data` as a whole and the `subscribe` saves it; the language stays. No Win feedback fires: the counter just shows the new count
- **`deskStore`** holds Desk UI state that is never saved: the view `{ x, y, s }`, `flying`, `tidying`, `editingId`, `newCardId`, `searchOpen`, `query`, and the actions that change them: `setView`, `flyTo`, `animateTidy`, `openEditor(id, { isNew })`, `closeEditor`, `toggleSearch`, `setQuery`. It is shared because the Dock, the `+` button and search live outside the Desk but fly the view or open the editor. Change 3 added the Win feedback state: `toast` (`{ id, title, detail? } | null`) with `showToast(title, detail?)` (replaces the current toast and hides it after 2.8 s; a queue would lag behind fast Wins), `winsOpen` with `openWins` / `closeWins` (the Mis logros sheet), and `winsBump` with `bumpWins` (the counter remounts its number on it to replay the bump). Change 4 added `resetAfterImport()`: clears `editingId`, `newCardId` and `query` and closes search and Mis logros, which may point at Cards an Import removed; the view is left alone, and `App` then calls `showWholeDesk()` (`src/desk/view.ts`, shared with the Dock's See all).
- **`installStore`** (`src/install/installStore.ts`, change 4) holds the browser's install offer: `promptEvent` (the captured `beforeinstallprompt`) and `installed`. `listenForInstall()` runs in `main.tsx` before React mounts, because Chromium can fire the event early ([pwa.md](pwa.md#install-guidance)).
- **No React render per gesture frame.** The world `div` does not read the view through a selector: `Desk` subscribes to `deskStore` with `subscribe()` and writes `transform`, the grain layer's `transform` and `data-far` straight to the DOM. Only `transform` changes per frame, so a pan or zoom is composited by the GPU with no repaint. A dragged Card is moved the same way, through its element; the store hears about it once, on drop.

## Source layout

| Path | What |
|---|---|
| `src/main.tsx` | Entry: font imports, `index.css`, `listenForInstall()`, mounts `<App />` |
| `src/App.tsx` | The paper screen: composes the Desk, the floating UI (wordmark, tools pill with search, the wins counter and settings, Dock, `+` button, first-run hint, install nudge), the sheets (Card editor, Mis logros, Settings with language, Backup and install sections) and the toast; keeps `<html lang>` in sync with the store and asks for persistent storage (`usePersistentStorage`) |
| `src/index.css` | Tailwind import, Paper tokens, dark overrides, base styles, Win keyframes, Area paint utilities ([design-system.md](design-system.md)) |
| `src/components/ui/` | Closed-API UI kit: `Button`, `Callout`, `IconButton`, `Segmented`, `Sheet`, `Toast` |
| `src/desk/` | The Desk feature: pure helpers (`geometry`, `areas`, `tidy`, `search`, `cardText`, `intent`), `deskStore`, `dom`, `view` (`showWholeDesk`), and the components `Desk`, `AreaRegion`, `DeskCard`, `ItemCheck`, `CardEditor`, `Dock`, `SearchBox`, `FirstRunHint` ([desk.md](desk.md)) |
| `src/wins/` | Wins and the Jar (change 3): pure `rules`, `stats` and `jarLayout`; `useWinStats`, `feedback` (`useWinFeedback`), `sparks`; the components `Jar`, `JarIcon`, `WinsCounter`, `MisLogros`, `WinsChart` ([desk.md](desk.md#files-srcwins)) |
| `src/backup/` | Export / Import (change 4): pure `backup` (`backupFileName`, `makeBackup`, `readBackup`) and `validate` (`isValidData`); `deliver` (`deliverFile`: share sheet or download); the Settings section `BackupSection` with the import confirmation ([storage.md](storage.md#export--import)) |
| `src/install/` | Install guidance (change 4): `platform` (`isStandalone`, `isIos`), `installStore` (captured install prompt, `installMode`, `useInstallMode`), the Settings section `InstallSection` and the one-time `InstallNudge` ([pwa.md](pwa.md#install-guidance)) |
| `src/store/appStore.ts` | `createAppStore()` + the app's `useAppStore`: `data`, `language` and the actions above. Loads on create, then runs `ensureDefaultAreas`; a `subscribe` saves `data` whenever its reference changes |
| `src/store/usePersistentStorage.ts` | Asks the browser for persistent storage once per launch, the first time the data holds a Card ([storage.md](storage.md#persistent-storage)) |
| `src/lib/storage.ts` | The only module that touches localStorage ([storage.md](storage.md)) |
| `src/lib/id.ts` | `newId()` — v4 UUIDs |
| `src/types/index.ts` | `Language`, `Area`, `Item`, `Card`, `WinEvent`, `MtfData` |
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

Removing events makes V2 sync need tombstones or a deletion log next to `events`; that cost is recorded in ADR 0005.

## MVP vs V2

| | MVP | V2 |
|---|---|---|
| Persistence | localStorage | .NET API + database, local cache |
| Accounts | none (one user per browser) | login |
| Phone ↔ PC | Export / Import backup file | automatic sync |
| Offline | always | always (sync when back online) |

## Data model decision

Every entity carries `id` (uuid), `createdAt` and `updatedAt` from day one ([ADR 0002](../../docs/adr/0002-local-first-storage.md)). Positions are stored in Desk coordinates, independent of screen size and zoom, so the same Desk renders on a phone and a PC.

Entity shapes → [storage.md](storage.md). Desk mechanics → [desk.md](desk.md).
