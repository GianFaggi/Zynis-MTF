# One versioned storage document, migrated on load, never silently lost

All user data (Areas, Cards, win events) is stored as **one JSON document** under the localStorage key `mtf_data`: `{ schemaVersion, areas, cards, events }`. The language is a separate key (`mtf_language`) because it is a device setting, not user data. `src/lib/storage.ts` reads the document on start and writes the whole document back on every change.

On load, the storage layer:

1. returns an empty document at the current `schemaVersion` when nothing is stored;
2. checks the shape (an object; integer `schemaVersion` ≥ 1; `areas`, `cards`, `events` are lists);
3. runs `migrations[v]` (version `v` → `v + 1`) one step at a time when the document is older than the app;
4. when the text is not valid JSON, has the wrong shape, is **newer** than the app understands, or a migration fails, copies the raw text to `mtf_data_recovery_<epochMs>` and starts from an empty document, instead of overwriting it.

Every localStorage access is wrapped in `try/catch`: a refused read or write is logged and the app keeps working in memory.

We chose this because the schema is the part that is hard to change once people have data: it must be possible to evolve it (migrations) and to never destroy something MTF could not read (recovery copy). A newer document most likely means an older cached app version opened data written by a newer one; keeping a copy means a later update can still read it.

## Considered Options

- **One key per entity type** (`mtf_cards`, `mtf_areas`, `mtf_events`): rejected. Several writes to keep consistent, several versions to track, and the Backup in change 4 wants the whole document anyway.
- **IndexedDB**: deferred, as in [ADR 0002](0002-local-first-storage.md). Text notes are small; the storage layer keeps a later switch local.
- **Start empty and overwrite on unreadable data**: rejected. One bad write or a downgrade would erase everything the user wrote.
- **Refuse to start on unreadable data**: rejected. MTF must always open; the recovery copy keeps the data without blocking the app.

## Consequences

- Changing the stored shape means bumping `SCHEMA_VERSION` and adding `migrations[oldVersion]` with a test.
- Recovery copies are never deleted automatically; change 4 (Backup) can surface them.
- Entities inside the lists are not validated one by one on load; they were written by MTF. Import (change 4) validates a foreign file more strictly.
- Writing the whole document on each change is cheap at notepad size; while dragging, writes are debounced (change 2).
