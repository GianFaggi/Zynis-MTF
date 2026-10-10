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
  React components
       |  read slices / call actions
       v
  Zustand store  (src/store/appStore.ts)   <- single source of truth in memory
       |  persist on change (debounced while dragging)
       v
  Storage layer  (src/lib/storage.ts)
       |
       +--> MVP: localStorage
       +--> V2:  .NET API (same interface, plus sync)
```

## Source layout

| Path | What |
|---|---|
| `src/main.tsx` | Entry: font imports, `index.css`, mounts `<App />` |
| `src/App.tsx` | Base paper screen (change 1); hosts the Desk from change 2; keeps `<html lang>` in sync with the store |
| `src/index.css` | Tailwind import, Paper tokens, dark overrides, base styles ([design-system.md](design-system.md)) |
| `src/components/ui/` | Closed-API UI kit: `Button`, `IconButton`, `Segmented`, `Sheet` |
| `src/store/appStore.ts` | `createAppStore()` + the app's `useAppStore`: `data`, `language`, `setLanguage`. Loads on create; a `subscribe` saves `data` whenever its reference changes |
| `src/lib/storage.ts` | The only module that touches localStorage ([storage.md](storage.md)) |
| `src/lib/id.ts` | `newId()` — v4 UUIDs |
| `src/types/index.ts` | `Language`, `Area`, `Item`, `Card`, `WinEvent`, `MtfData` |
| `src/i18n/locales/es.ts`, `en.ts` | Dictionaries; `en` is typed `Messages = typeof es` |
| `src/i18n/detect.ts` | `detectLanguage(languages)` — kept apart from `index.ts` so the store can import it without an import cycle |
| `src/i18n/index.ts` | `useT()`, `translate()`, `languageNames`, re-exports `detectLanguage` |
| `src/test/setup.ts` | Vitest setup ([testing.md](testing.md)) |
| `e2e/` | Playwright specs |

i18n: components call `const t = useT()` and `t('key', ...args)`. UI kit components never read the store; screens pass them translated texts as props.

- **Components never touch localStorage.** They talk to the store; the store talks to the storage layer.
- **The storage layer is the seam for V2.** Swapping localStorage for API calls (plus a local cache for offline) must not change any component.
- **View state is not persisted as data.** Pan/zoom (`view.x`, `view.y`, `view.s`) and open sheets live in component/store state, not in the backup. (Remembering the last view per device is a convenience, stored separately if added.)
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
