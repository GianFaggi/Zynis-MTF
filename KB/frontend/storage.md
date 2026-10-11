---
area: storage
description: localStorage schema, entity shapes, sync-ready conventions and Export / Import for Zynis MTF
---

# Storage

All persistence goes through `src/lib/storage.ts`. No other module reads or writes `localStorage`. Why local-first → [ADR 0002](../../docs/adr/0002-local-first-storage.md); why one versioned document with recovery → [ADR 0004](../../docs/adr/0004-versioned-storage-document.md).

The shapes below are **final for schema version 1** and mirror `src/types/index.ts`. Change them only together with a `SCHEMA_VERSION` bump and a migration.

## Conventions

- Every Area, Card, Item and win event has an `id`: a v4 UUID from `newId()` in `src/lib/id.ts`.
- Areas, Cards and Items also have `createdAt` and `updatedAt` (epoch ms). `updatedAt` changes on every edit, including moves. Win events have `at` instead (they are never edited).
- `newId()` uses the built-in `crypto.randomUUID()`; outside a secure context (phone testing over `http://192.168.x.x`) it falls back to `crypto.getRandomValues()`. No `uuid` package.
- Keys are prefixed `mtf_` and the root document carries a `schemaVersion` for migrations.
- A drag writes once, on drop: while dragging only the DOM moves. Typing in the editor writes on each change (cheap at notepad size, ADR 0004).
- On a launch with no stored Areas, the store writes the three default Areas into `mtf_data` (`ensureDefaultAreas`), so Cards always point at Area ids that survive a reload. A document from change 1 (`areas: []`) gets them the same way; no migration.
- Deleting a Card does **not** delete its win events: what you did still counts.
- View state (pan/zoom, open sheets) is never part of `mtf_data`.

## Entities (schema version 1)

```ts
type Language = 'es' | 'en';
type AreaId = string;
type AreaColor = 'sage' | 'sand' | 'sky' | 'plum' | 'rose';

interface Area {
  id: AreaId;
  key?: 'work' | 'life' | 'remember'; // default Areas, translated by key
  name?: string;                       // custom name (overrides key)
  color: AreaColor;
  rect: { x: number; y: number; w: number; h: number }; // Desk coordinates
  createdAt: number; updatedAt: number;
}

interface Item {
  id: string;
  text: string;
  done: boolean;
  createdAt: number; updatedAt: number;
}

interface Card {
  id: string;
  areaId: AreaId;
  title: string;
  body: string;
  items: Item[];
  pinned: boolean;
  position: { x: number; y: number; tilt: number; z: number }; // Desk coordinates
  jarredAt: number | null; // in the Jar since; null = on the Desk
  createdAt: number; updatedAt: number;
}

interface WinEvent {
  id: string;
  type: 'item' | 'card' | 'note';
  at: number;
  cardId?: string;
  itemId?: string;
  title?: string;   // snapshot, so the event still reads well if the Card is deleted
  areaId?: AreaId;
}

interface MtfData {         // the whole `mtf_data` document
  schemaVersion: number;    // 1
  areas: Area[];
  cards: Card[];
  events: WinEvent[];
}
```

## Keys

| Key | Content | Since |
|---|---|---|
| `mtf_data` | `MtfData` as JSON | change 1 |
| `mtf_language` | `'es'` or `'en'`; anything else is ignored | change 1 |
| `mtf_data_recovery_<epochMs>` | raw text of an `mtf_data` that could not be read, kept instead of overwritten | change 1 |
| `mtf_hint_seen` | `'1'` once the first-run hint is dismissed; a device setting, not part of `mtf_data` or the Backup | change 2 |

## Storage layer API (`src/lib/storage.ts`)

| Function | Behavior |
|---|---|
| `loadData(): MtfData` | Nothing stored → `emptyData()`. Invalid JSON, wrong shape (not an object, `schemaVersion` not an integer ≥ 1, `areas`/`cards`/`events` not lists), a `schemaVersion` above `SCHEMA_VERSION`, or a failing migration → copy the raw text to `mtf_data_recovery_<epochMs>`, return `emptyData()`. Older version → `migrate()` step by step. |
| `saveData(data)` | Writes the whole document. |
| `loadLanguage(): Language \| null` | `null` when unset or unknown. |
| `saveLanguage(language)` | |
| `loadHintSeen(): boolean` | `true` only when `mtf_hint_seen` is `'1'`; `false` when unset or storage refuses to read |
| `saveHintSeen()` | Writes `'1'` |
| `migrate(doc, steps, target)` | Runs `steps[v]` (v → v + 1) up to `target`; throws if a step is missing. The `migrations` map is empty at v1. |
| `emptyData()` | `{ schemaVersion: SCHEMA_VERSION, areas: [], cards: [], events: [] }` |

Every access is in `try/catch`: when the browser refuses storage (blocked, private mode, quota) the layer logs `console.warn` and never throws; the app keeps working in memory.

**Adding a schema change:** bump `SCHEMA_VERSION`, add `migrations[old] = (doc) => newDoc`, update `src/types/index.ts` and this file, and add a test in `storage.test.ts` that loads an old document.

## Export / Import (change 4)

- Export writes the whole `mtf_data` document to `mtf-backup-YYYY-MM-DD.json`.
- Import validates `schemaVersion` and shape, then replaces the current data after an explicit confirmation in the UI. (Merge is a V2 sync concern.)
- Ask the browser for persistent storage (`navigator.storage.persist()`) on first launch to reduce eviction risk.

## Risks

- Safari can evict data of sites not opened for ~7 days; installed PWAs are treated better. Mitigation: install prompt guidance + Backup.
- Clearing site data deletes everything. Mitigation: Backup.
