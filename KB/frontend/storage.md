---
area: storage
description: localStorage schema, entity shapes, sync-ready conventions and Export / Import for Zynis MTF
---

# Storage

All persistence goes through `src/lib/storage.ts`. No other module reads or writes `localStorage`. Why local-first → [ADR 0002](../../docs/adr/0002-local-first-storage.md); why one versioned document with recovery → [ADR 0004](../../docs/adr/0004-versioned-storage-document.md).

The shapes below are **final for schema version 1** and mirror `src/types/index.ts`. Change them only together with a `SCHEMA_VERSION` bump and a migration.

## Conventions

- Every Area, Card, Item and win event has an `id`: a v4 UUID from `newId()` in `src/lib/id.ts`.
- Areas, Cards and Items also have `createdAt` and `updatedAt` (epoch ms). `updatedAt` changes on every edit, including moves. Win events have `at` instead (they are never edited, only added or removed).
- `newId()` uses the built-in `crypto.randomUUID()`; outside a secure context (phone testing over `http://192.168.x.x`) it falls back to `crypto.getRandomValues()`. No `uuid` package.
- Keys are prefixed `mtf_` and the root document carries a `schemaVersion` for migrations.
- A drag writes once, on drop: while dragging only the DOM moves. Typing in the editor writes on each change (cheap at notepad size, ADR 0004).
- On a launch with no stored Areas, the store writes the three default Areas into `mtf_data` (`ensureDefaultAreas`), so Cards always point at Area ids that survive a reload. A document from change 1 (`areas: []`) gets them the same way; no migration.
- `events` is filled from change 3 on (documents from changes 1–2 simply have none; no migration). It is a list that follows the Desk, not an append-only log ([ADR 0005](../../docs/adr/0005-win-events-with-removals.md)); the rules live in `src/wins/rules.ts` ([architecture.md](architecture.md#wins-as-events)):
  - `item` — appended when an Item is checked; the most recent one for that Item is removed when it is unchecked, and all of them when the Item is removed (including a blank Item dropped when the editor closes).
  - `card` — exactly one while a Desk Card is finished: appended when it becomes finished (by checking or by removing its last unchecked Item), removed when it stops being finished (an Item unchecked, or a new unchecked Item with text). The Jar appends one to a Card without Items when it accepts it; taking that Card back out removes it. A Card in the Jar always keeps its one.
  - `note` — appended once when the editor of a newly created Card closes and the Card is kept.
- Deleting a Card removes **every** event with its `cardId` (`item`, `card` and `note`): a deleted Card is treated as never written. The Jar is where Cards whose credit you want to keep go.
- Every action changes a Card and its events in **one** `data` replacement, so a save never holds a Card and Wins that disagree.
- View state (pan/zoom, open sheets) is never part of `mtf_data`.
- Areas the user creates, renames, recolors, moves, resizes or deletes (#7) need **no schema bump**: `Area` already had an optional `name`, an optional `key` and a `rect`. A user-created Area has no `key`; clearing the name of a default Area removes `name`, so its translated `key` shows again. Moving an Area writes its `rect` and its Desk Cards' positions in one replacement; deleting one moves its Cards to the Area the user chose, and leaves `events` untouched (a Win's `areaId` is a snapshot). Only `AreaColor` grew, from 5 to 12 colors. So a Backup made by this version with one of the new colors is refused as **damaged** by an older MTF; that is acceptable, since a Backup moves data between devices running the same deployed app.
- Arranging the Areas (#18) needs **no schema bump** either: an arrangement writes every moved Area's `rect` and its Desk Cards' positions in one replacement, like a hand move. "Mi disposición" is a device setting under its own key, `mtf_arrangement` ([Keys](#keys)), not part of `mtf_data`, so the Backup format does not change either.
- "Frasco por área" (#19) needs **no schema bump** and **no Backup change**: it is one device key, `mtf_area_jars` ([Keys](#keys)). Area Jars are a view of `Card.jarredAt` + `Card.areaId`, and the Mis logros Area filter reads `events` through the Cards at read time (a Win counts in its Card's current Area, falling back to its `areaId` snapshot only when the Card is gone). Moving a Card to another Area as it goes into the Jar (`jarCard(id, { areaId })`) writes `areaId` and `jarredAt` in one replacement.
- The Welcome Card (#20) needs **no schema bump** and **no Backup change**: it is an ordinary `Card` (no field marks it), added to `cards` with no event. Only one device key is new, `mtf_welcome_placed` ([Keys](#keys)). A Backup made with a Welcome Card on the Desk carries it like any Card.

## Entities (schema version 1)

```ts
type Language = 'es' | 'en';
type Theme = 'system' | 'light' | 'dark'; // device setting, not in MtfData
type AreaId = string;
interface SavedArrangement { rects: Record<AreaId, Area['rect']>; savedAt: number } // "Mi disposición" (#18), device setting, not in MtfData
type AreaColor = 'sage' | 'sand' | 'sky' | 'plum' | 'rose' | 'teal' | 'olive' | 'slate' | 'indigo' | 'turquoise' | 'pine' | 'berry'; // teal… berry: #7

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
| `mtf_hint_seen` | `'1'` once the first-run hint was dismissed. **No longer read** since #20 replaced the hint with the Welcome Card; it stays in browsers that had it, harmless, and nothing removes it | change 2 |
| `mtf_install_nudge_seen` | `'1'` once the install nudge was answered ("Cómo" or "Ahora no") or MTF was installed; a device setting, not part of the Backup | change 4 |
| `mtf_theme` | `'system'`, `'light'` or `'dark'`; anything else is ignored (= System). A device setting, not part of `mtf_data` or the Backup | change 5 |
| `mtf_arrangement` | `SavedArrangement` as JSON: every Area's rect when the user last chose "Guardar esta disposición", and when. One slot, replaced by each save. Anything else (invalid JSON, not an object, a rect without four finite numbers) reads as nothing saved. A device setting, not part of `mtf_data` or the Backup; an Import leaves it alone | #18 |
| `mtf_area_jars` | `'1'` while "Frasco por área" is on, `'0'` once turned off; missing or anything else reads as off. A device setting, not part of `mtf_data` or the Backup; an Import leaves it alone | #19 |
| `mtf_welcome_placed` | `'1'` once MTF placed this device's Welcome Card; missing or anything else reads as not placed. Written by `placeWelcomeOnce()` at start-up, never by "Ver introducción". A new key rather than `mtf_hint_seen`, so devices that dismissed the old hint still get the Welcome Card once. A device setting, not part of `mtf_data` or the Backup; an Import leaves it alone | #20 |

## Storage layer API (`src/lib/storage.ts`)

| Function | Behavior |
|---|---|
| `loadData(): MtfData` | Nothing stored → `emptyData()`. Invalid JSON, wrong shape (not an object, `schemaVersion` not an integer ≥ 1, `areas`/`cards`/`events` not lists), a `schemaVersion` above `SCHEMA_VERSION`, or a failing migration → copy the raw text to `mtf_data_recovery_<epochMs>`, return `emptyData()`. Older version → `migrate()` step by step. |
| `saveData(data)` | Writes the whole document. |
| `loadLanguage(): Language \| null` | `null` when unset or unknown. |
| `saveLanguage(language)` | |
| `loadTheme(): Theme \| null` | `null` when unset, unknown or storage refuses to read; the store then uses `'system'` |
| `saveTheme(theme)` | Writes `'system'` too, so the choice is explicit |
| `loadWelcomePlaced(): boolean` | `true` only when `mtf_welcome_placed` is `'1'`; `false` when unset, anything else, or storage refuses to read |
| `saveWelcomePlaced()` | Writes `'1'` |
| `loadInstallNudgeSeen(): boolean` | `true` only when `mtf_install_nudge_seen` is `'1'`; `false` when unset or storage refuses to read |
| `saveInstallNudgeSeen()` | Writes `'1'` |
| `loadArrangement(): SavedArrangement \| null` | `null` when unset, damaged or storage refuses to read: nothing saved |
| `saveArrangement(arrangement)` | Writes the whole arrangement, replacing the previous one |
| `loadAreaJars(): boolean` | `true` only when `mtf_area_jars` is `'1'`; `false` when unset, `'0'`, anything else, or storage refuses to read |
| `saveAreaJars(on)` | Writes `'1'` or `'0'` |
| `upgradeDocument(doc): UpgradeResult` | The one migration path, used by `loadData()` and by Import. `{ ok: true, data }`, or `{ ok: false, reason }` with `'shape'` (outer shape wrong), `'newer'` (`schemaVersion` above `SCHEMA_VERSION`) or `'migration'` (a step missing, throwing, or breaking the shape). Checks the outer shape only, not the entities |
| `migrate(doc, steps, target)` | Runs `steps[v]` (v → v + 1) up to `target`; throws if a step is missing. The `migrations` map is private and empty at v1. |
| `emptyData()` | `{ schemaVersion: SCHEMA_VERSION, areas: [], cards: [], events: [] }` |
| `requestPersistentStorage(): Promise<void>` | Asks the browser to keep MTF's storage (`navigator.storage.persist()`). Returns at once without the API or when `persisted()` is already `true`; never throws, only logs. Called by `usePersistentStorage()` ([Persistent storage](#persistent-storage)) |

Every access is in `try/catch`: when the browser refuses storage (blocked, private mode, quota) the layer logs `console.warn` and never throws; the app keeps working in memory.

**Adding a schema change:** bump `SCHEMA_VERSION`, add `migrations[old] = (doc) => newDoc`, update `src/types/index.ts` and this file, and add a test in `storage.test.ts` that loads an old document **and** one in `src/backup/backup.test.ts` that imports an old Backup ([ADR 0006](../../docs/adr/0006-backup-file-format.md)).

## Export / Import

A **Backup** is one JSON file, `mtf-backup-YYYY-MM-DD.json` (local date of the export), with the whole `mtf_data` document inside an envelope ([ADR 0006](../../docs/adr/0006-backup-file-format.md)):

```json
{
  "format": "mtf-backup",
  "exportedAt": "2026-10-11T18:04:12.345Z",
  "data": { "schemaVersion": 1, "areas": [], "cards": [], "events": [] }
}
```

- `data.schemaVersion` is the only version number. Device settings (`mtf_language`, `mtf_theme`, `mtf_welcome_placed`, `mtf_install_nudge_seen`, `mtf_arrangement`, `mtf_area_jars`) are never in the file, and an Import leaves them as they were. Pretty-printed with 2 spaces.
- The pure functions live in `src/backup/backup.ts`: `backupFileName(date)`, `makeBackup(data, now)` and `readBackup(text)`. `src/backup/validate.ts` (`isValidData`) checks the entities; `src/backup/deliver.ts` shares or downloads the file.
- **Reading a Backup** (`readBackup`) is stricter than `loadData()`, because the file comes from outside:
  - **not a Backup**: longer than 5 MB, not JSON, not an object, or `format !== 'mtf-backup'`
  - **damaged**: `data` fails the outer shape check, `exportedAt` is not a string, a migration step fails, or the entity check fails (missing or wrongly typed field, duplicated id, unknown Area color, a Card whose Area is not in the file, no Area at all)
  - **newer**: `data.schemaVersion` above `SCHEMA_VERSION`
  - an older version is migrated through `upgradeDocument()`, the same path as on load
- Unknown extra fields are kept, so a round trip is exact. A win event whose `cardId` points at no Card is accepted (it only miscounts).
- **Import replaces** the whole document (`appStore.replaceData`) after an explicit confirmation in Settings; nothing is written before it. Merging is a V2 sync concern.

## Persistent storage

`usePersistentStorage()` (`src/store/usePersistentStorage.ts`, called once from `App`) runs `requestPersistentStorage()` the first time in a launch that the data holds at least one Card: when MTF opens with Cards, or right after the first Card is kept. Not on a blank first launch, because Firefox shows a permission prompt for it. Asking on every launch until granted lets a later install count (Chrome grants it silently by engagement and installation; Safari mostly to Home Screen apps).

## Risks

- Safari can evict data of sites not opened for ~7 days; installed PWAs are treated better. Mitigation: install guidance in Settings + the one-time install nudge ([pwa.md](pwa.md)), the persistent storage request, and the Backup.
- Clearing site data deletes everything. Mitigation: Backup.
