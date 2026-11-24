---
area: storage
description: localStorage schema, entity shapes, sync-ready conventions and Export / Import for Zynis MTF
---

# Storage

All persistence goes through `src/lib/storage.ts`. No other module reads or writes `localStorage`. Why local-first → [ADR 0002](../../docs/adr/0002-local-first-storage.md); why one versioned document with recovery → [ADR 0004](../../docs/adr/0004-versioned-storage-document.md).

The shapes below are **final for schema version 1** and mirror `src/types/index.ts`. Change them only together with a `SCHEMA_VERSION` bump and a migration. Adding an **optional** field that an older version carries along untouched is the exception every change since #7 has used (the bullets below say why each one needs no bump).

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
- Accounts (#36) need **no schema bump** and **no Backup change**: the session is one device key, `mtf_session` ([Keys](#keys)), never part of `mtf_data`. Signing in or out changes nothing in the data document.
- Sync (#37) needs **no schema bump** and **no Backup change**: its state is one device key, `mtf_sync` (the cursor, the pending changes and their tombstones), plus at most one replaced Desk, `mtf_data_replaced_<epochMs>` ([Keys](#keys), [ADR 0012](../../docs/adr/0012-session-sync-of-opaque-records.md)). Neither is part of `mtf_data` or a Backup, and an Import leaves both alone. Sync reads and writes `data` only through `appStore`: a change it fetched is applied with `replaceData`, flagged so the outbox does not count it as a local change. Every entity already has the `uuid` id and `updatedAt` it needs.
- Handwriting (#47) needs **no schema bump**: it is one optional field, `Card.ink` ([Entities](#entities-schema-version-1), [ADR 0013](../../docs/adr/0013-handwriting-as-optional-ink.md)). A missing `ink` means no handwriting, so every document, Backup and sync record from before it reads as is; sync records carry no schema version anyway, so the reading side must accept a Card without `ink` whatever the version. `setInk` writes it in one replacement per committed stroke, erase, clear or undo (never per pointer move); `closeCard` removes an `ink` with no strokes, like a blank Item. A Card holds at most `INK_MAX_POINTS` (12 000) points, so one Card cannot fill the shared quota. The Backup check accepts a Card with no `ink` and refuses one whose `ink` is not well formed (`height` an integer 1–2500, `strokes` a list of number lists whose length is a non-zero multiple of 3, finite numbers only; points outside the box are accepted, the renderer clamps them). The device setting that offers the handwriting box is one key, `mtf_handwriting` ([Keys](#keys)). An older deploy keeps `ink` (`{ ...card }` copies it) but deletes a handwriting-only Card when its editor closes (ADR 0013).
- Pens (#51) need **no schema bump**: each stroke's style is one optional field, `Ink.styles`, a list parallel to `strokes` ([ADR 0014](../../docs/adr/0014-stroke-styles-parallel-list.md)). Every write goes through `withStyles` (`src/ink/style.ts`), which leaves `styles` out when every stroke is Tinta Medio, so Tinta-only handwriting keeps the #47 shape. Every read goes through `strokeStyles`, which treats a missing `styles`, **or one whose length differs from `strokes`**, as all Tinta Medio: that is what an older deploy leaves when it edits styled handwriting (an erase keeps `styles` longer than `strokes`, a new stroke drops it, a clear writes neither), so a color never lands on the wrong stroke. An erase in this version maps the strokes left back to their own styles. The Backup check accepts a missing `styles` and one of another length, and refuses a `styles` that is not a list, or an entry whose `color` is not `null` or `#rrggbb` (either case) or whose `size` is not an integer 1–40. The pens themselves are one device key, `mtf_pens` ([Keys](#keys)).

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
  ink?: Ink;               // handwriting (#47); missing = none, never kept with no strokes
  createdAt: number; updatedAt: number;
}

interface Ink {            // #47, ADR 0013: box coordinates, the box is always INK_WIDTH (1000) wide
  height: number;          // box height in ink units: 400 new, +250 per growth, at most 2500
  strokes: number[][];     // each stroke flat [x, y, p, x, y, p, …], integers; x 0–1000, y 0–height, p pressure 0–100 (50 = none reported)
  styles?: InkStyle[];     // #51, ADR 0014: styles[i] is strokes[i]'s; left out when all are Tinta Medio; read only through strokeStyles()
}

interface InkStyle {       // #51: how one stroke looks (also the shape of a pen in mtf_pens)
  color: string | null;    // lowercase '#rrggbb'; null = Tinta, follows the theme
  size: number;            // perfect-freehand size in box units, integer 1–40: Fino 4, Medio 7, Grueso 12
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
| `mtf_session` | `StoredSession` as JSON: `{ refreshToken, email }` of the account signed in on this device ([ADR 0010](../../docs/adr/0010-account-sessions.md)). Missing, invalid JSON, or a missing or empty field reads as signed out. Written on sign-in and on every renewal (before the new token is used), removed on sign-out or when the server answers `session_ended`. Read at each use, never cached, so tabs share one session; renewals run one at a time across tabs (a Web Lock), each reading the token the last one saved. The access token is never stored. A device setting, not part of `mtf_data` or the Backup; an Import leaves it alone. **No schema bump** | #36 |
| `mtf_sync` | `SyncState` as JSON: `{ owner, cursor, pending, held, claim, lastSyncAt }` (#37, [architecture.md](architecture.md#sync-37)). `owner` is the email the state belongs to (`null`: never synced, and nothing is recorded); `cursor` the last server `seq` merged; `pending` maps `kind:id` to `{ at, deleted? }` (a change, or a tombstone, not yet confirmed); `held` the fetched records for the Card open in the editor; `claim` the moment this Desk was set to become the Account's (Subir este, an Import while signed in, Recuperar); `lastSyncAt` when the last sync finished. Missing, invalid JSON or a wrong shape reads as never synced (`emptySync()`), so the next sync runs the first sign-in rule. A device key, not part of `mtf_data` or the Backup; an Import leaves it alone. **No schema bump** | #37 |
| `mtf_data_replaced_<epochMs>` | `MtfData` as JSON: this device's Desk, kept just before "Usar el de la cuenta" replaced it, for "Recuperar el escritorio anterior". At most one: writing a new copy removes the older ones. Removed by a recovery, and at launch once older than 30 days. Restored through `upgradeDocument()`, so a copy made by an older version still opens. Not part of `mtf_data` or the Backup | #37 |
| `mtf_handwriting` | `'1'` while "Escritura a mano" is on, `'0'` once turned off; missing or anything else reads as off. It only offers the handwriting box: handwriting a Card already has always shows. A device setting, not part of `mtf_data` or the Backup, not synced; an Import leaves it alone. **No schema bump** | #47 |
| `mtf_pens` | `Pens` as JSON: `{ chosen, pens }`, the handwriting box's four pens (`InkStyle`s) and the index (0–3) of the chosen one. Missing, invalid JSON or malformed in any part (not four pens, a width that is not an integer 1–40, pens 2–4 without a `#rrggbb` color, `chosen` out of range) reads as the defaults (`DEFAULT_PENS`: Tinta, `#3a78c2`, `#d0443a`, `#2f9a5e`, all Medio, Tinta chosen). Tinta's color is read as `null` whatever is stored. Written on each choose or edit. A device setting, not part of `mtf_data` or the Backup, not synced; an Import leaves it alone. **No schema bump** | #51 |

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
| `loadHandwriting(): boolean` | `true` only when `mtf_handwriting` is `'1'`; `false` when unset, `'0'`, anything else, or storage refuses to read |
| `saveHandwriting(on)` | Writes `'1'` or `'0'` |
| `loadPens(): Pens` | `DEFAULT_PENS` when unset, damaged in any part, or storage refuses to read; never throws. Tinta's color always `null`, colors lowercased |
| `savePens(pens)` | Writes the four pens and the chosen one |
| `loadSession(): StoredSession \| null` | `null` when unset, damaged or storage refuses to read: signed out, never a crash |
| `saveSession(session)` | Writes `{ refreshToken, email }`, replacing the previous session |
| `clearSession()` | Removes `mtf_session`; never throws |
| `loadSync(): SyncState` | `emptySync()` when unset, damaged or storage refuses to read: never synced, never a crash |
| `saveSync(state)` | Writes the whole state; never throws (a refused write is logged, and the next push still reads the current `data`) |
| `emptySync()` | `{ owner: null, cursor: 0, pending: {}, held: [], claim: null, lastSyncAt: null }` |
| `saveReplaced(data, now): boolean` | Writes `mtf_data_replaced_<now>` and removes older copies. If the write is refused it removes the older copies and tries once more; `false` when it still does not fit, so the first sign-in dialog asks for an Export first |
| `loadReplaced(): { at, data } \| null` | The newest copy through `upgradeDocument()`; `null` when there is none, it is damaged, or storage refuses |
| `clearReplaced()` | Removes every `mtf_data_replaced_*` key; never throws |
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

- `data.schemaVersion` is the only version number. Device settings (`mtf_language`, `mtf_theme`, `mtf_welcome_placed`, `mtf_install_nudge_seen`, `mtf_arrangement`, `mtf_area_jars`, `mtf_handwriting`, `mtf_pens`, plus the device keys `mtf_session` and `mtf_sync`) are never in the file, and an Import leaves them as they were. Pretty-printed with 2 spaces.
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
- Changing MTF's address strands the notes on the old one; a Backup per device is the only bridge ([ADR 0008](../../docs/adr/0008-own-address.md)). Mitigation: the address is chosen once (`mtf.zynis.com.ar`, #28), and hosting moves change only the DNS record.
