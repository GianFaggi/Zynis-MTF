---
area: storage
description: localStorage schema, entity shapes, sync-ready conventions and Export / Import for Zynis MTF
---

# Storage

All persistence goes through `src/lib/storage.ts`. No other module reads or writes `localStorage`. Why local-first → [ADR 0002](../../docs/adr/0002-local-first-storage.md).

This file describes the **intended** schema; it is finalized (and kept in sync with `src/types/index.ts`) in changes 1–3.

## Conventions

- Every entity: `id` (uuid v4), `createdAt`, `updatedAt` (epoch ms). `updatedAt` changes on every edit, including moves.
- Keys are prefixed `mtf_` and the root document carries a `schemaVersion` for migrations.
- Writes are debounced while dragging; a drop always writes.
- Deleting a Card does **not** delete its win events: what you did still counts.

## Entities (draft)

```ts
type AreaId = string;

interface Area {
  id: AreaId;
  key?: 'work' | 'life' | 'remember'; // default Areas, translated by key
  name?: string;                       // custom name (overrides key)
  color: 'sage' | 'sand' | 'sky' | 'plum' | 'rose';
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
```

## Keys (draft)

| Key | Content |
|---|---|
| `mtf_data` | `{ schemaVersion, areas, cards, events }` |
| `mtf_language` | `'es' \| 'en'` |
| `mtf_hint_seen` | first-run hint dismissed |

## Export / Import (change 4)

- Export writes the whole `mtf_data` document to `mtf-backup-YYYY-MM-DD.json`.
- Import validates `schemaVersion` and shape, then replaces the current data after an explicit confirmation in the UI. (Merge is a V2 sync concern.)
- Ask the browser for persistent storage (`navigator.storage.persist()`) on first launch to reduce eviction risk.

## Risks

- Safari can evict data of sites not opened for ~7 days; installed PWAs are treated better. Mitigation: install prompt guidance + Backup.
- Clearing site data deletes everything. Mitigation: Backup.
