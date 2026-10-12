# Proposal

## Why

Everything a user writes in MTF lives in one browser's `localStorage`: Safari can evict it from a site not opened for about 7 days, clearing site data or changing phones erases it, and there is no way to move it between phone and PC. This is the last MVP change ([KB/roadmap.md](../../../KB/roadmap.md), issue #4): until V2 sync exists, a Backup file is the only bridge between devices and the only way back after a loss, and installing the app plus asking for persistent storage makes the loss less likely in the first place.

## What Changes

- **Export** (Settings → "Copia de seguridad"): builds a Backup file `mtf-backup-YYYY-MM-DD.json` with the whole data document (Areas, Cards on the Desk and in the Jar, win events). On a touch device that can share files, it opens the system share sheet with the file (mail, chat, Drive, Save to Files); otherwise, or if sharing fails, the file is downloaded.
- **Import**: the user picks a file; MTF checks that it is an MTF Backup, that its version is one it understands (older versions are migrated), and that every Area, Card, Item and win event has a valid shape. A valid file shows a summary (date, Cards, Cards in the Jar, things done) and asks for an explicit confirmation before **replacing** the data on this device. An invalid file shows a clear message and the current data is not touched.
- **Persistent storage**: once the Desk holds at least one Card (on launch, or right after the first Card is kept), MTF asks the browser to keep its data (`navigator.storage.persist()`), silently and only while not yet granted.
- **Install guidance**: a "Instalar la app" section in Settings explains why installing protects the notes and shows the right steps for the device: iPhone/iPad (Share → Add to Home Screen), an "Instalar MTF" button where the browser offers installation, generic steps elsewhere, and a short "installed" line when MTF already runs as an app. A one-time nudge after the user keeps their first new Card points to it, only where installing is possible and MTF is not installed.
- A round-trip test: exporting and then importing yields exactly the same data.

### Acceptance criteria → scope

| Criterion (issue #4) | Covered by |
|---|---|
| Export downloads `mtf-backup-AAAA-MM-DD.json` with the Desk, Cards and Wins | Export (download on PC; share sheet with the same file on phones) |
| Import validates the file (version and format) and asks for confirmation before replacing | Import validation + confirmation step |
| Invalid file → clear message, current data untouched | Import error messages; nothing is written before confirmation |
| Persistent storage request on first use | Persistent storage request |
| Install guide (especially iPhone), explaining it helps keep data | Install section in Settings + one-time nudge |
| Round-trip test | Unit test on the Backup functions + e2e export → import |

### Out of scope

- **Merging** a Backup with the current data, or any automatic sync: Import always replaces. Merging and sync need conflict rules and are V2 work (with accounts and the .NET backend).
- Encrypting the Backup file; scheduled or reminder-based backups; a "last backup" date.
- Surfacing the `mtf_data_recovery_*` copies kept by the storage layer (ADR 0004 mentions it as possible; it stays a later ticket).
- Device settings (language, first-run hint, install nudge) are not part of the Backup.

## Capabilities

### New Capabilities
- `backup`: Export and Import of the Backup file: its content and name, how it leaves the device (share or download), validation of a foreign file, the confirmation before replacing, and what the Desk shows after an Import.

### Modified Capabilities
- `local-storage`: adds the request for persistent storage, so the browser is asked not to evict MTF's data.
- `pwa-offline`: adds install guidance (Settings section per device and the one-time nudge), since installing is what protects data on iPhone.

## Impact

- **New code**: `src/backup/` (pure Backup functions: build, read and validate; share/download; the Settings section and the import confirmation), `src/install/` (platform detection, the captured install prompt, the Settings section and the nudge).
- **Changed code**: `src/lib/storage.ts` (exports a migration entry point for Import, `requestPersistentStorage()`, and the install-nudge device flag), `src/store/appStore.ts` (`replaceData`), `src/App.tsx` (Settings sheet sections, nudge, persistence trigger), `src/main.tsx` (listens for the install prompt before React mounts), `src/i18n/locales/es.ts` / `en.ts`.
- **Docs**: ADR 0006 (Backup file format), `GLOSSARY.md` (Backup sharpened), KBs `storage.md`, `pwa.md`, `architecture.md`, `testing.md`, `roadmap.md`.
- **Dependencies**: none. Web Share, File and Storage APIs are built into the browser.
- **No network**: Export, Import and the install guide work offline and make no request outside the MTF origin.
