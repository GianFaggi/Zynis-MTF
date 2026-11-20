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
     sheets: Card editor · Mis logros · Settings · Account (#36)
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
       +--> localStorage: always the Desk's home, also with an account

  Sync (src/sync/, #37): subscribes to appStore beside the save, with a session only
       |  outbox in mtf_sync; pull on arrival, push on leaving
       v
  .NET API on Render, Postgres on Neon (opaque records)
```

## Two stores

- **`appStore`** holds what is saved: `data` (the `MtfData` document) and the device settings `language`, `theme`, `arrangement`, `areaJars` and `handwriting` (each saved under its own key, never in `data`). A `subscribe` writes `data` through the storage layer whenever its reference changes. Its actions replace `data` immutably and set `updatedAt` on what they touch; a Card and its win events always change in the same replacement ([Wins as events](#wins-as-events)):
  - `setLanguage(language)`, `setTheme(theme)`
  - `ensureDefaultAreas()` — runs once when the store is created
  - `createCard(point)` → new Card id, `updateCard(id, { title?, body? })`, `togglePin(id)`, `deleteCard(id)` (also removes every event of the Card)
  - `setInk(id, ink | null)` (#47) — the Card's handwriting in one replacement with `updatedAt`; `null` removes the field (no `ink: undefined` left behind). The handwriting box calls it once per committed stroke, erase pass, clear or undo, never per pointer move. No Win rule: handwriting only makes a Card not empty ([ADR 0013](../../docs/adr/0013-handwriting-as-optional-ink.md))
  - `placeWelcomeCard(content)` → new Card id (#20): `welcomeCard(data.areas[0], content, { z: topZ, now, newId })` appended in one replacement, **no event** (MTF wrote it, so it is not a note). `content` (`WelcomeContent`) is translated by the caller with `welcomeContent(language)`, because the store cannot import i18n (`i18n/index.ts` imports the store). From then on it is an ordinary Card: checking, finishing, the Jar and deleting go through the actions above and their Win rules, untouched. `undefined` with no Area, which `ensureDefaultAreas` prevents
  - `addItem(cardId, afterItemId?)` → new empty Item id, `updateItem(cardId, itemId, text)`, `removeItem(cardId, itemId)` — each keeps the Card Win in step; `removeItem` also removes the Item's Wins
  - `toggleItem(cardId, itemId)` → `'checked' | 'finished' | 'unchecked' | undefined`: `'finished'` when this check finished the Card, `undefined` when the Item does not exist. Components turn the outcome into feedback with `useWinFeedback()`; the store never shows UI
  - `dropCard(id, position, height?)` (end of a drag), `placeCard(id, areaId)` (Place selector), `tidyUp(heights)`
  - `closeCard(id, { isNew? })` — when the editor closes: drops blank Items (and their Wins) and an `ink` with no strokes (#47), removes the Card and all its events if it is empty (no title, text, Item with text or handwriting stroke), and counts a kept new Card as a note. `CardEditor` passes `isNew` from `deskStore.newCardId`
  - `jarCard(id, { areaId? })` → `{ ok: true } | { ok: false, pending }`: refuses, writing nothing, a Card with unchecked Items (`pending` = how many), and a missing, empty or already jarred Card (`pending: 0`); otherwise sets `jarredAt` and gives a Card without Items its Card Win. With an `areaId` that exists and is not the Card's own (Sí on another Area's Jar, #19), the same replacement also sets the Card's `areaId`, so a new Card Win carries the new Area; a missing target is ignored. The position is untouched
  - `returnCard(id)` — out of the Jar: `jarredAt = null`, a `spotIn` its Area (or the Area nearest its old position when that Area is gone), on top, and the Card Win follows (a Card without Items loses it)
  - `replaceData(data)` — Import (change 4), and sync applying what it fetched (#37, flagged so the outbox skips it): the validated document becomes `data` as a whole and the `subscribe` saves it; the language, the theme, the saved arrangement, `areaJars` and `handwriting` stay. No Win feedback fires: the counter just shows the new count
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
  - **`handwriting`** (#47): "Escritura a mano", a device setting like `areaJars` (`boolean`, loaded on create from `mtf_handwriting`, off unless `'1'`). `setHandwriting(on)` sets it and writes the key; `data` is untouched. It only decides whether the editor offers "A mano": handwriting a Card already has always shows ([desk.md](desk.md#handwriting-47))
- **`deskStore`** holds Desk UI state that is never saved: the view `{ x, y, s }`, `flying`, `tidying`, `editingId`, `newCardId`, `searchOpen`, `query`, and the actions that change them: `setView`, `flyTo`, `animateTidy`, `openEditor(id, { isNew })`, `closeEditor`, `toggleSearch`, `setQuery`. It is shared because the Dock, the `+` button and search live outside the Desk but fly the view or open the editor. Change 3 added the Win feedback state: `toast` (`{ id, title, detail? } | null`) with `showToast(title, detail?)` (replaces the current toast and hides it after 2.8 s; a queue would lag behind fast Wins), `winsOpen` with `openWins` / `closeWins` (the Mis logros sheet; #19 added `winsAreaId`, the Area it is filtered to, set by `openWins(areaId = null)` and changed by `setWinsArea(id)`), and `winsBump` with `bumpWins` (the counter remounts its number on it to replay the bump). #7 added `areaEditor` (`{ id, isNew } | null`) with `openAreaEditor(id, { isNew })` / `closeAreaEditor()`. Change 4 added `resetAfterImport()`: clears `editingId`, `newCardId`, `areaEditor` and `query` and closes search and Mis logros, which may point at Cards or Areas an Import removed; the view is left alone, and `App` then calls `showWholeDesk()` (`src/desk/view.ts`, shared with the Dock's See all). #20 added `focusCardId` (`string | null`, `null` by default and in `getInitialState()`) with `setFocusCard(id)`: the Card the first view shows instead of the usual one. `placeWelcomeOnce()` sets it to the Welcome Card it placed; the Desk's first view reads it and clears it ([desk.md](desk.md#navigation-helpers)). #37 added `lifted` with `setLifted(lifted)`: `true` while a Card or an Area is lifted (set in the Desk's `lift()`, cleared in `settle()`, which every drop, cancel, slide back and "¿Pasarla a…?" answer reaches, and on a release that is not a drop), so sync merges only after the drop.
- **`installStore`** (`src/install/installStore.ts`, change 4) holds the browser's install offer: `promptEvent` (the captured `beforeinstallprompt`) and `installed`. `listenForInstall()` runs in `main.tsx` before React mounts, because Chromium can fire the event early ([pwa.md](pwa.md#install-guidance)).
- **`accountStore`** (`src/account/accountStore.ts`, #36) holds the account on this device ([ADR 0010](../../docs/adr/0010-account-sessions.md)): `email` (read from `mtf_session` on create, so Settings shows it with no connection), `accessToken` (memory only), `sheetOpen`, `link` (a mail link read by `readAccountLink()`) with `linkCount` (goes up per link, so a link arriving while the sheet is open restarts it on its step), `sessionEnded`, and `memorySession` (a copy for a launch where storage is refused). Plain functions change it: `openAccount()`, `closeAccount()` (also drops an unused link), `openWithLink(link)`, `clearLink()`, `signedIn(tokens)` (saves the renewal token **before** keeping the access token), `signOut()` (forgets at once, tells the server only when online), `refreshSession(signal?)` (one at a time across tabs under the Web Lock `mtf_session_renewal`, each reading the renewal token the last one saved, so tabs never hold two live tokens; only `session_ended` clears the session, every other failure keeps it), `loadMe(signal?)`. Nothing in it runs at launch, and nothing on the Desk reads it. #37 added `accessTokenExpiresAt` (memory only, from the sign-in or renewal answer), so a leave send renews a token about to expire first. Sync starts and stops by **subscribing** to its `email` (a new email: sync at once, which runs the first sign-in rule; `null` after `signOut()` or `session_ended`: stop), so `accountStore` never imports the sync engine.
- **No React render per gesture frame.** The world `div` does not read the view through a selector: `Desk` subscribes to `deskStore` with `subscribe()` and writes `transform`, the grain layer's `transform` and `data-far` straight to the DOM. Only `transform` changes per frame, so a pan or zoom is composited by the GPU with no repaint. A dragged Card is moved the same way, through its element; the store hears about it once, on drop.

## Source layout

| Path | What |
|---|---|
| `src/main.tsx` | Entry: font imports, `index.css`, `listenForInstall()`, `applyTheme(theme)` with the stored theme. First, `readGoogleWait(location.hash)`: in Google's window (`#google=<hash>&lang=`, #36) it sets the address's language in `appStore` without saving it, imports `src/account/GoogleWait` dynamically (its own chunk, precached) and mounts only that: no Desk, no `placeWelcomeOnce()`, no mail-link listener. Otherwise `placeWelcomeOnce()` (the Welcome Card once per device, before the first render, so StrictMode cannot place it twice and component tests, which never import `main.tsx`, keep a blank Desk), `listenForAccountLinks()` (reads a `#verify=` / `#reset=` mail link now and on every `hashchange`, #36), mounts `<App />`, then `startSyncTriggers()` (#37: nothing fires with no session; the launch sync waits a macrotask, so it runs after the first render). Dev only: with `?avion` in the URL it imports `src/sync/PlanePreview` dynamically and mounts it instead, skipping `placeWelcomeOnce()`; a production build replaces `import.meta.env.DEV` with `false`, so the branch and its chunk are dropped (#35) |
| `src/App.tsx` | The paper screen: composes the Desk, the floating UI (wordmark, tools pill with search, the wins counter and settings, Dock, `+` button, install nudge), the sheets (Card editor, Mis logros, Settings with account, language, theme, handwriting, Areas, Backup, install and introduction sections, the Account sheet) and the toast; keeps `<html lang>` and the theme (`applyTheme`) in sync with the store and asks for persistent storage (`usePersistentStorage`) |
| `src/index.css` | Tailwind import, the `dark` custom variant, Paper tokens, the dark block, base styles, Win keyframes, the paper plane keyframes (`fly`, `trail`, `sway`), Area paint utilities ([design-system.md](design-system.md)) |
| `src/components/ui/` | Closed-API UI kit: `Button`, `Callout`, `IconButton`, `Segmented`, `Sheet`, `TextField` (labelled input; a password gets a show/hide toggle, #36), `Toast` |
| `src/desk/` | The Desk feature: pure helpers (`geometry`, `areas`, `arrange`, `tidy`, `search`, `cardText`, `intent`), `deskStore`, `dom`, `view` (`showWholeDesk`, `welcomeCardView`), and the components `Desk`, `AreaRegion`, `DeskCard`, `ItemCheck`, `CardEditor`, `Dock`, `SearchBox`, `AreaEditor`, `AreasSection` ([desk.md](desk.md)) |
| `src/ink/` | Handwriting (#47, [desk.md](desk.md#handwriting-47), [ADR 0013](../../docs/adr/0013-handwriting-as-optional-ink.md)): `constants` (`INK_WIDTH`, heights, `INK_MAX_POINTS`, eraser radius, undo limit); pure `geometry` (screen → box point, pressure, the 2-unit point skip, RDP simplification, growth, `addStroke` with the point limit), `input` (which pointer draws: `pointerDown`, `isEraserEnd`), `erase` (strokes an eraser path touches) and `render` (`inkPaths`: perfect-freehand outlines as SVG `d` strings, cached per stroke array in a `WeakMap`); the components `InkBox` (the editor's box: raw Pointer Events, capture, coalesced points, live stroke in an animation frame, undo stack, eraser, Borrar todo) and `InkView` (read-only SVG for the Desk Card) |
| `src/welcome/` | The Welcome Card (#20): pure `welcomeCard` (`welcomeCard(area, content, { z, now, newId })`, `WelcomeContent`); `welcome` (`welcomeContent(language)`, `placeWelcome()`, used by both the first launch and "Ver introducción", and `placeWelcomeOnce()`); the Settings section `WelcomeSection` ("Ver introducción") ([desk.md](desk.md#the-welcome-card-20)) |
| `src/wins/` | Wins and the Jar (change 3): pure `rules`, `stats` and `jarLayout`; `useWinStats`, `feedback` (`useWinFeedback`), `sparks`; the components `Jar`, `JarIcon`, `WinsCounter`, `MisLogros`, `WinsChart` ([desk.md](desk.md#files-srcwins)) |
| `src/backup/` | Export / Import (change 4): pure `backup` (`backupFileName`, `makeBackup`, `readBackup`) and `validate` (`isValidData`); `deliver` (`deliverFile`: share sheet or download); the Settings section `BackupSection` with the import confirmation ([storage.md](storage.md#export--import)) |
| `src/install/` | Install guidance (change 4): `platform` (`isStandalone`, `isIos`), `installStore` (captured install prompt, `installMode`, `useInstallMode`), the Settings section `InstallSection` and the one-time `InstallNudge` ([pwa.md](pwa.md#install-guidance)) |
| `src/account/` | Accounts (#36, [Network requests](#network-requests-36)): `api` (`API_URL`, `apiRequest`, `wakeApi`, `withSession`), `accountStore`, `links` (`readAccountLink`, `listenForAccountLinks`), `google` (hand-off secret and hash, `googleWaitUrl` / `readGoogleWait`, `googleLoginUrl`, `openGoogleWindow`, pure `pollOutcome`, `watchGoogle`, `useGoogleWatch`), `hooks` (`useOnline`, `useCountdown`), `messages` (server code → message key), and the components `GoogleWait` (the Google window's first page: the plane until `/health` answers, then on to the API), `AccountSection` (the Settings row; no request) and `AccountSheet` (every step: sign in, register, check mail, forgot, reset, verify, link expired, Google, signed in) |
| `src/sync/` | Sync (#37, [Sync](#sync-37)): pure `records`, `outbox`, `merge`, `normalize`, `firstSignIn`, `relativeTime`; `syncApi`, `syncStore`, `engine` (the only one with side effects), `triggers`; the components `SyncChoice` (the first sign-in dialog) and `SyncStatus` (the Account's sync lines). And waiting for the server (#35, #36): pure `wait` (`WAIT_STEPS`, `WAIT_LIMIT` (#36: the request limit, read from the `failed` step), `waitStage(elapsedMs)`, `nextStepAt(elapsedMs)`, `INDICATOR_DELAY`); `useWaitStage` (start taken on mount, one timeout to the next stage, the stage worked out from the clock); the components `PaperPlane` (the inline SVG), `PlaneWait` (the block a sheet shows while its request is pending) and `SyncIndicator` (for the tools pill). Mounted means waiting: callers render `{pending && <PlaneWait />}`. The dev-only `PlanePreview` behind `/?avion` simulates a server that answers in 0.8 s, in 40 s or never ([design-system.md](design-system.md#tokens)) |
| `src/store/appStore.ts` | `createAppStore()` + the app's `useAppStore`: `data`, `language`, `theme`, `arrangement`, `areaJars`, `handwriting` and the actions above. Loads on create, then runs `ensureDefaultAreas`; a `subscribe` saves `data` whenever its reference changes |
| `src/store/usePersistentStorage.ts` | Asks the browser for persistent storage once per launch, the first time the data holds a Card ([storage.md](storage.md#persistent-storage)) |
| `src/lib/storage.ts` | The only module that touches localStorage ([storage.md](storage.md)) |
| `src/lib/id.ts` | `newId()` — v4 UUIDs |
| `src/lib/theme.ts` | `applyTheme(theme)` — the only DOM writes for the theme: `data-theme` on `<html>` and the `theme-color` metas ([design-system.md](design-system.md#how-the-theme-switches)) |
| `src/types/index.ts` | `Language`, `Theme`, `SavedArrangement`, `StoredSession`, `Area`, `Item`, `Card`, `WinEvent`, `MtfData` |
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

Removing events makes sync need tombstones next to `events`; that cost is recorded in ADR 0005 and paid by #37's outbox. After every merge, `normalizeWins` restores both invariants, keeping the same duplicate on every device ([Sync](#sync-37)).

## Sync (#37)

The Desk travels between an Account's devices **per session** ([ADR 0012](../../docs/adr/0012-session-sync-of-opaque-records.md), the `sync` spec, the server side in [api.md](../backend/api.md#sync)). Only with a session; it never blocks the Desk and never shows an error.

```
appStore.subscribe ──diffData──> pending (mtf_sync) ──outgoing──> pushRecords / leaveSend ──> confirmSent
                                                                     (newest change wins on the server)
pullRecords(cursor) ──> mergeRecords (held for the open Card; deferred while lifted)
                    ──> replaceData, flagged ──> repairDesk + normalizeWins as a local change ──> push
```

| Module | What |
|---|---|
| `records.ts` | Pure: `MtfData` ⇄ records (`toRecords`, `fromRecords`, `keyOf` = `kind:id`, `canonicalOrder`, `sameValue`). Items travel inside their Card; Win events as kind `win` |
| `outbox.ts` | Pure: `diffData(before, after, now)` (same reference = unchanged; a new reference counts only if its content differs; removed = tombstone), `addPending` (newer entry wins), `outgoing(pending, data)` (read at send time, each with its entry's `at` as `updatedAt`), `confirmSent` (keeps an entry changed during the send) |
| `merge.ts` | Pure: `mergeRecords(data, incoming, pending, { editingId })` → `{ data, changed, held }`; `repairDesk` (a Card whose Area is gone goes to the nearest Area; no Area left brings the defaults back) |
| `normalize.ts` | Pure: `normalizeWins(data, now, newId)`, reusing `src/wins/rules.ts`; the earliest duplicate survives, ties to the smallest id |
| `firstSignIn.ts` | Pure: `isNewDevice`, `firstSignIn(local, remote)` → `upload` / `take` / `ask`, `deskSummary` |
| `syncApi.ts` | `pushRecords` (chunks of at most 512 KB), `pullRecords` (every page), `leaveSend` (up to 60 KB as one `keepalive` fetch straight to the API, else ordinary pushes; renews a token about to expire on hide, not on close), all through `withSession` |
| `syncStore.ts` | Zustand, never saved: `syncing`, `lastSyncAt`, `pendingCount`, `choice` (the dialog's two summaries, `noRoom`, `exported`), `replacedUntil` |
| `engine.ts` | The only module with side effects: `initSync`, `syncNow` (arrive), `leave`, `pushPending`, `claimDesk`, `chooseAccount`, `chooseUpload`, `markExported`, `closeChoice`, `recoverPrevious`; `resetSyncEngine` for tests |
| `triggers.ts` | `startSyncTriggers()` from `main.tsx`: launch, `visibilitychange`, `pagehide`, `online`, the idle timer and the keep-awake |

- **Recording.** The engine subscribes to `appStore` beside the save and adds `diffData` to `mtf_sync.pending` whenever `data` is replaced, but only on a device with an `owner` (the email the state belongs to). A device that never synced records nothing. With an owner, changes are recorded even while signed out (locally only, no request), so signing in again to the same Account sends them; another Account is a first sign-in. Changes the engine applies itself go through `replaceData` with a module flag set, and the subscriber skips them (Zustand calls subscribers synchronously).
- **One at a time.** `syncNow` and the sends run under the Web Lock `mtf_sync`; a trigger fired meanwhile is remembered once (an arrival covers a send).
- **Arrive** = pull from `cursor`, merge once, then push. **Leave** = push only. Failures: `offline` waits for `online`; `session_ended` stops with `pending` kept; `cursor_expired` runs the first sign-in rule; `timeout`, `network`, `server_error`, 429 and 5xx retry after 10, 30 and 90 s (or `Retry-After` if longer), then stop until the next trigger.
- **Holding.** While `deskStore.lifted`, a pull is parked without holding the lock (so a leave send is never stuck behind a long "¿Pasarla a…?") and merged when `lifted` turns false, then what is pending is pushed. Records for `editingId` (the Card and its Wins) go to `mtf_sync.held` and merge when `editingId` changes, or at the next launch if MTF closed with the editor open. An Area editor or the Mis logros filter on an Area a merge removed closes.
- **First sign-in** (`owner` is not the signed-in email, or `cursor_expired`): pull everything; `upload` → claim; `take` → `replaceData(canonicalOrder(fromRecords(...)))` flagged, then normalize, `resetAfterImport`, `showWholeDesk`; `ask` → `syncStore.choice` and `SyncChoice` opens; nothing syncs until the user chooses.
- **Claim** (Subir este, an Import while signed in, Recuperar): `mtf_sync.claim` = now. The next sync pulls everything and marks every local entity pending, and every Account record not on the device as a tombstone, each at the claim or just after the Account's own copy, so it wins on the server.
- **The replaced Desk.** Usar el de la cuenta first writes `mtf_data_replaced_<epochMs>`; when it does not fit, the dialog asks for an Export (`markExported`) before going on without the copy. `initSync` removes a copy older than 30 days, with no request.
- **Triggers.** Launch (after the first render), visible again, and the first input after idle arrive; hidden, `pagehide` and 2.5 minutes with no `pointerdown`, `keydown` or `wheel` leave; `online` pushes. The idle timer and the keep-awake (`wakeApi()` every 10 minutes) run only while something is pending, MTF is visible and a session exists. No polling.
- **UI.** The tools pill renders `{syncing && <SyncIndicator />}` (it waits 2 s before showing); a merge that changed the Desk shows the toast "Tu escritorio está al día"; `SyncStatus` in the Account section and sheet shows the last sync, the pending count, Sincronizar ahora and Recuperar el escritorio anterior, reading only `syncStore` (no request).

## Network requests (#36)

Until #36 MTF made no request at all. With no session it calls **only its own API** (`API_URL`: `https://api.mtf.zynis.com.ar` in production, `http://localhost:5000` in development, `VITE_API_URL` as a local override), and **only from the Account sheet**, a mail link it opened, or the Google window it opened (`/health` alone, from `GoogleWait`). With a session, sync also runs in the background ([Sync](#sync-37)). The Desk, the Jar, Mis logros, the Backup and opening Settings make none, and neither does a launch with no session ([pwa.md](pwa.md#service-worker-vite-plugin-pwa), the `pwa-offline` spec).

- **Waking Render.** Opening the sheet with no session and a connection calls `wakeApi()`: `/health` every 5 s until it answers, shared by every caller, skipped within 10 minutes of an answer. No plane shows while the user types.
- **One request, sent once.** `apiRequest()` awaits the wake, then sends the request exactly once; the whole attempt gives up at `WAIT_LIMIT` (90 s) with `timeout`. It answers `{ ok, data }` or `{ ok: false, code }`: a server code passed through, or `offline`, `timeout`, `network`, `aborted`. Closing the sheet aborts it.
- **The plane on submit.** The sheet renders `{pending && <PlaneWait />}` in place of its form, with the typed values kept in state, and an inline `role="alert"` line for a failure (`messages.ts` turns codes into the current language).
- **Sessions.** With a session, opening the sheet calls `loadMe()`, which renews the access token through `withSession()` first when there is none; nothing renews at launch.
- **Google.** `newHandoff()` prepares the secret and its hash before the click; the click opens the window synchronously, on MTF's own address `googleWaitUrl(hash, lang)` = `/#google=<hash>&lang=<es|en>`, not on the API. In that window `main.tsx` renders only `GoogleWait` (see Source layout): the paper plane while `wakeApi()` runs, then `location.replace(googleLoginUrl(hash, lang))`, so Render's loading page never shows; if the wake gives up it stays on the calm message. The window's language comes from the address and is not saved (on an installed iPhone the window has storage of its own). Meanwhile `useGoogleWatch` polls `google/exchange` every 3 s, at once on `visibilitychange`, and stops at 5 minutes, on Cancel, on a final answer or when the sheet closes ([ADR 0011](../../docs/adr/0011-google-sign-in-handoff.md)).
- **A verification link posts once per token**, cached in `AccountSheet.tsx`, so StrictMode's double effect cannot use the token twice; it is not aborted by closing the sheet.

## MVP vs V2

| | MVP | V2 |
|---|---|---|
| Persistence | localStorage | .NET API + database, local cache |
| Accounts | none (one user per browser) | email + password and Google, optional (#36) |
| Phone ↔ PC | Export / Import backup file | sync per session with an account (#37); the Backup stays |
| Offline | always | always (sync when back online) |
| Hosting | Vercel only (static) | Vercel + API on Render Free + Postgres on Neon Free ([ADR 0009](../../docs/adr/0009-v2-backend-hosting.md)) |

## Data model decision

Every entity carries `id` (uuid), `createdAt` and `updatedAt` from day one ([ADR 0002](../../docs/adr/0002-local-first-storage.md)). Positions are stored in Desk coordinates, independent of screen size and zoom, so the same Desk renders on a phone and a PC.

Entity shapes → [storage.md](storage.md). Desk mechanics → [desk.md](desk.md).
