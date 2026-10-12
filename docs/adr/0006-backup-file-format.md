# The Backup file is a versioned envelope around the data document, and Import replaces

A Backup is one JSON file, `mtf-backup-YYYY-MM-DD.json` (local date of the export):

```json
{
  "format": "mtf-backup",
  "exportedAt": "2026-10-11T18:04:12.345Z",
  "data": { "schemaVersion": 1, "areas": [], "cards": [], "events": [] }
}
```

- `format` marks the file as an MTF Backup; `exportedAt` is when it was made (ISO 8601, UTC).
- `data` is the whole `mtf_data` document ([ADR 0004](0004-versioned-storage-document.md)) exactly as stored. Its `schemaVersion` is the only version number: the envelope has none of its own.
- Device settings (language, dismissed hints) are not included: they belong to a device, not to the user's notes.

Reading a Backup is stricter than loading `mtf_data`, because the file comes from outside MTF: it is refused as **not a Backup** (not JSON, no `format`), **newer** (a `schemaVersion` above what this MTF knows) or **damaged** (wrong shape, a failed migration, or any Area, Card, Item or win event with a missing or wrongly typed field, a duplicated id, or a Card whose Area is not in the file). An older Backup is migrated through the same `migrations` the storage layer uses on load.

**Import always replaces** the whole document on the device, after an explicit confirmation that shows what the Backup holds. It never merges.

We chose this because Backup files leave the app and live on in mail, chats and drives: every future MTF version must still be able to read the ones made today. A marker and a single version number are the least that keeps that promise. Replacing is the only behavior that is both simple and predictable without sync rules.

## Considered Options

- **The bare `mtf_data` document as the file**: rejected. Any JSON with three lists would look like a Backup, the "not an MTF file" message could not be given, and there is nowhere for the export date.
- **A separate `backupVersion` in the envelope**: rejected. Two version numbers that must move together; `schemaVersion` already says how to read `data`.
- **Merge on Import** (keep Cards that exist on only one side, newest `updatedAt` wins): rejected for the MVP. Deleted Cards and removed Wins would come back from the other device, because removals leave no trace ([ADR 0005](0005-win-events-with-removals.md)). Doing it right needs tombstones and conflict rules: that is V2 sync.
- **Lenient Import** (load what can be read, skip the rest): rejected. Silently losing part of a Backup is worse than a clear refusal with the current data untouched.

## Consequences

- A schema change (`SCHEMA_VERSION` bump) must keep reading old Backups: its migration step is shared by load and Import, and gets a test with an old Backup.
- Changing the envelope itself (renaming `format`, moving `data`) breaks every Backup in the wild; if it is ever needed, readers must accept both shapes.
- Using two devices at once with Import as the bridge loses the changes made on the device that receives the Backup. The confirmation states it; V2 sync removes the problem.
- The file holds the notes as readable text. Encryption, if added, wraps `data` and adds a field to the envelope; unencrypted Backups stay readable.
