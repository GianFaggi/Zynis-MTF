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

- **`appStore`** holds what is saved: `data` (the `MtfData` document) and `language`. A `subscribe` writes `data` through the storage layer whenever its reference changes. Its actions replace `data` immutably and set `updatedAt` on what they touch:
  - `setLanguage(language)`
  - `ensureDefaultAreas()` — runs once when the store is created
  - `createCard(point)` → new Card id, `updateCard(id, { title?, body? })`, `togglePin(id)`, `deleteCard(id)`
  - `addItem(cardId, afterItemId?)` → new empty Item id, `updateItem(cardId, itemId, text)`, `toggleItem(cardId, itemId)`, `removeItem(cardId, itemId)`
  - `dropCard(id, position, height?)` (end of a drag), `placeCard(id, areaId)` (Place selector), `tidyUp(heights)`
  - `closeCard(id)` — when the editor closes: drops blank Items, removes the Card if it is empty
- **`deskStore`** holds Desk UI state that is never saved: the view `{ x, y, s }`, `flying`, `tidying`, `editingId`, `newCardId`, `searchOpen`, `query`, and the actions that change them: `setView`, `flyTo`, `animateTidy`, `openEditor(id, { isNew })`, `closeEditor`, `toggleSearch`, `setQuery`. It is shared because the Dock, the `+` button and search live outside the Desk but fly the view or open the editor.
- **No React render per gesture frame.** The world `div` does not read the view through a selector: `Desk` subscribes to `deskStore` with `subscribe()` and writes `transform`, the grain layer's `transform` and `data-far` straight to the DOM. Only `transform` changes per frame, so a pan or zoom is composited by the GPU with no repaint. A dragged Card is moved the same way, through its element; the store hears about it once, on drop.

## Source layout

| Path | What |
|---|---|
| `src/main.tsx` | Entry: font imports, `index.css`, mounts `<App />` |
| `src/App.tsx` | The paper screen: composes the Desk, the floating UI (wordmark, tools pill with search and settings, Dock, `+` button, first-run hint) and the sheets (Card editor, Settings); keeps `<html lang>` in sync with the store |
| `src/index.css` | Tailwind import, Paper tokens, dark overrides, base styles, Area paint utilities ([design-system.md](design-system.md)) |
| `src/components/ui/` | Closed-API UI kit: `Button`, `IconButton`, `Segmented`, `Sheet` |
| `src/desk/` | The Desk feature: pure helpers (`geometry`, `areas`, `tidy`, `search`, `cardText`, `intent`), `deskStore`, `dom`, and the components `Desk`, `AreaRegion`, `DeskCard`, `ItemCheck`, `CardEditor`, `Dock`, `SearchBox`, `FirstRunHint` ([desk.md](desk.md)) |
| `src/store/appStore.ts` | `createAppStore()` + the app's `useAppStore`: `data`, `language` and the actions above. Loads on create, then runs `ensureDefaultAreas`; a `subscribe` saves `data` whenever its reference changes |
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

Mis logros is computed from an append-only list of **win events** (`item`, `card`, `note`) with timestamps, not from counters. Unchecking an Item removes its event; taking a Card out of the Jar removes the Card's event if it is no longer finished. This keeps "last 7 days", "per day" and "since you started" consistent and makes V2 sync a merge of event lists.

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
