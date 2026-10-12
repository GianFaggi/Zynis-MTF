# Design

## Context

See [proposal.md](proposal.md) for why. What exists today:

- `src/lib/storage.ts` is the only module that touches `localStorage`. `loadData()` checks the document's outer shape (`isDocument`), recovers newer or unreadable documents into `mtf_data_recovery_<ms>`, and runs `migrate()` with a private `migrations` map (empty at `SCHEMA_VERSION = 1`). It does **not** check the entities inside the lists, because MTF wrote them itself ([ADR 0004](../../../docs/adr/0004-versioned-storage-document.md): "Import validates a foreign file more strictly").
- `appStore` holds `data` and saves it through a `subscribe` whenever its reference changes. `deskStore` holds UI state (`view`, `editingId`, `newCardId`, `searchOpen`, `winsOpen`, `toast`…), including ids of Cards that an Import can make disappear.
- The Settings sheet is inline in `src/App.tsx` (`settingsOpen` local state) and only holds the language. The mockup's Settings already shows the Backup group: a label, a note and two quiet buttons ("Exportar copia" / "Importar copia").
- `FirstRunHint` is a one-time ink note above the Dock, with its device flag `mtf_hint_seen` in `storage.ts`.
- No new library is needed: Web Share (`navigator.share` / `canShare` with files), `File` / `Blob`, `URL.createObjectURL`, `<input type="file">`, `navigator.storage.persist()` and `beforeinstallprompt` are browser APIs.

## Goals / Non-Goals

**Goals:**
- Export and Import live in small pure functions that are easy to test (round trip, every refusal), with the browser-specific parts (share, download, file picking) kept thin around them.
- Import and launch use the **same** migration path, so a Backup and a stored document can never be upgraded differently.
- Nothing is written before the user confirms an Import.

**Non-Goals:**
- No UI for the persistent storage status, no "last backup" date, no recovery-copy browser.
- No change to the schema: `SCHEMA_VERSION` stays 1.

## Decisions

### 1. Backup file = an envelope around the data document ([ADR 0006](../../../docs/adr/0006-backup-file-format.md))

```json
{
  "format": "mtf-backup",
  "exportedAt": "2026-10-11T18:04:12.345Z",
  "data": { "schemaVersion": 1, "areas": [...], "cards": [...], "events": [...] }
}
```

- `format` tells "not an MTF Backup" apart from "damaged MTF Backup", so the message can be precise. `exportedAt` (ISO string) feeds the confirmation summary. The version lives in one place only: `data.schemaVersion`.
- Pretty-printed with 2 spaces: a notepad's data is small, and a readable file can be checked or fixed by hand.
- **Alternatives:** the bare `mtf_data` document (what the KB sketched) cannot be told apart from any other JSON with lists, and has nowhere for the export date; a separate `backupVersion` would be a second version number to keep in sync with `schemaVersion` for no gain.

### 2. Pure Backup module: `src/backup/backup.ts`

- `backupFileName(date: Date): string` → `mtf-backup-YYYY-MM-DD.json` from the **local** date (built from `getFullYear/getMonth/getDate`, never `toISOString()`, which would give tomorrow's date after 21:00 in Argentina).
- `makeBackup(data: MtfData, now: Date): string` → the envelope as text.
- `readBackup(text: string): BackupResult` with
  `{ ok: true, data: MtfData, exportedAt: string } | { ok: false, reason: 'notBackup' | 'newer' | 'damaged' }`:
  1. Longer than 5 MB → `notBackup` (localStorage cannot hold more than about 5 MB anyway).
  2. Not JSON, not an object, or `format !== 'mtf-backup'` → `notBackup`.
  3. `data` fails the outer document check, or `exportedAt` is not a string → `damaged`.
  4. `data.schemaVersion > SCHEMA_VERSION` → `newer`.
  5. Upgrade through the storage layer (decision 3); a failing step → `damaged`.
  6. Entity check (`src/backup/validate.ts`, `isValidData(doc)`) fails → `damaged`.
- **Entity check** (strict, because the file comes from outside): every list item is an object; ids are non-empty strings, unique within Areas, within Cards, within all Items, within events; `createdAt` / `updatedAt` / `at` are finite numbers; Area `color` is one of `sage | sand | sky | plum | rose`, `key` (if present) one of `work | life | remember`, `name` (if present) a string, `rect` four finite numbers with `w` and `h` > 0; Card `title` / `body` strings, `pinned` boolean, `position` four finite numbers, `jarredAt` a finite number or `null`, `items` a list of `{ id, text: string, done: boolean, createdAt, updatedAt }`, and `areaId` the id of an Area in the file; event `type` one of `item | card | note`, optional `cardId` / `itemId` / `title` / `areaId` strings when present; at least one Area.
- Event `cardId`s are **not** required to point at an existing Card: a dangling event only miscounts, it cannot break the Desk, and refusing a whole Backup over it would be worse for the user.
- Unknown extra fields are kept as they are, so a round trip is exact.
- **Alternative:** a schema library (zod, valibot). Rejected by [stack.md](../../../KB/frontend/stack.md)'s "no unnecessary libraries": the shape is small and fixed, and a hand-written check is about 60 lines with plain tests.

### 3. One migration path: `upgradeDocument()` in `storage.ts`

`storage.ts` exports `upgradeDocument(doc: unknown): { ok: true, data } | { ok: false, reason: 'shape' | 'newer' | 'migration' }`, built from the existing `isDocument`, the newer-version check and `migrate(doc, migrations, SCHEMA_VERSION)`. `loadData()` is rewritten on top of it (the recovery behavior is unchanged) and `readBackup()` calls it. The `migrations` map stays private, so a future schema bump changes both paths at once.

### 4. Getting the file out: `src/backup/deliver.ts`

`deliverFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'>`:
- **Share** when `matchMedia('(pointer: coarse)').matches` and `navigator.canShare?.({ files: [file] })` is true. `navigator.share({ files: [file] })` resolving → `'shared'`; an `AbortError` → `'cancelled'`; any other error → fall through to download.
- **Download** otherwise: `URL.createObjectURL(file)`, a temporary `<a download="…">` clicked, the URL revoked on the next tick → `'downloaded'`.
- The coarse-pointer check exists because desktop Chrome and Edge can also share files, but a PC user expects a download.
- **User activation:** iOS only opens the share sheet from a user gesture. `makeBackup` and the `File` are built **synchronously** in the click handler, and `share()` is the first await, so the gesture is still valid.
- Toast after `'shared'` or `'downloaded'`: "Copia lista" / "Backup ready" with the file name as the detail. `'cancelled'` → nothing.

### 5. Import UI inside the Settings sheet: `src/backup/BackupSection.tsx`

- Rendered in the Settings sheet after the language. States: **idle** (note + "Exportar copia" + "Importar copia"), **error** (idle plus an inline `role="alert"` message for `notBackup` / `newer` / `damaged`), **confirm** (the summary and two buttons).
- "Importar copia" clicks a hidden `<input type="file" accept="application/json,.json">`. Its value is reset after every pick, so picking the same file again fires `change`. The file is read with `file.text()`.
- **Confirm panel** replaces the buttons inside the section, not a second sheet: a sheet over a sheet means two scrims and two focus traps for one question. Content: "Copia del 3 de octubre de 2026" (`Intl.DateTimeFormat(language, { dateStyle: 'long' })`), Cards on the Desk, Cards in the Jar and things done (item + card events, the same definition as `winStats().total`), then "Reemplaza todo lo que hay en este dispositivo (8 tarjetas). Si querés conservarlo, exportalo antes." Buttons: "Reemplazar mis datos" (`primary`) and "Cancelar" (`quiet`). Focus moves to the confirm panel's heading when it appears.
- **Errors inline, not as a toast:** the toast disappears after 2.8 s and is announced once; a refused file is something the user needs to read and act on.
- On confirm: `appStore.replaceData(data)` and then the section's `onImported(data)` callback, which `App` uses to close Settings, reset the Desk (decision 6) and show the toast "Copia importada" with "N tarjetas" as the detail.

### 6. Store and Desk after an Import

- `appStore.replaceData(data: MtfData)`: `set({ data })`. The existing subscriber saves it; nothing else changes (language stays). Validation guarantees at least one Area, so `ensureDefaultAreas` is not needed.
- `deskStore.resetAfterImport()`: `editingId`, `newCardId`, `query` cleared; `searchOpen` and `winsOpen` false. The view is not reset there.
- Then the view flies to "see all". Dock's private `seeAll()` moves to an exported `showWholeDesk()` in `src/desk/view.ts` (Dock and App call it), instead of copying the fit logic.
- No Win feedback (sparks, bump, toasts per Win) fires on Import: the counter simply shows the new count.

### 7. Persistent storage

- `storage.ts` gets `requestPersistentStorage(): Promise<void>`: if `navigator.storage?.persist` is missing, return; if `await navigator.storage.persisted()` is true, return; else `await navigator.storage.persist()`. Everything is in `try/catch` with `console.warn`, like the rest of the layer. It lives in the storage layer because it is about the browser keeping MTF's storage.
- `usePersistentStorage()` (`src/store/usePersistentStorage.ts`, called once from `App`) selects `data.cards.length > 0` and calls `requestPersistentStorage()` the first time it is true in this launch (a module-level flag). That covers both "opens with Cards" and "first Card kept".
- **Why not on the very first launch:** Firefox shows a permission prompt for `persist()`. On a blank first launch that is a question out of nowhere; after the first Card it comes when there is something to protect. Chrome decides silently (installed apps and engagement raise the odds), and asking on every launch until it is granted lets an install made later count. Safari grants it mostly to Home Screen apps.

### 8. Install guidance: `src/install/`

- **`platform.ts`**: `isStandalone()` (`matchMedia('(display-mode: standalone)').matches || navigator.standalone === true`), `isIos()` (`/iPhone|iPad|iPod/` in the user agent, or `Macintosh` with `navigator.maxTouchPoints > 1` for iPadOS, which reports itself as a Mac).
- **`installStore.ts`** (Zustand, already in the stack): `promptEvent: BeforeInstallPromptEvent | null`, `installed: boolean`, and `listenForInstall()`, which `main.tsx` calls **before** rendering because Chromium can fire `beforeinstallprompt` before React mounts. It calls `preventDefault()` on the event and keeps it; `appinstalled` sets `installed` and drops it. `install()` calls `promptEvent.prompt()` and clears the event (it can be used once). `installMode()` → `'installed' | 'ios' | 'prompt' | 'manual'`, in that order of priority; `useInstallMode()` is its React hook.
- **`InstallSection.tsx`**, after the Backup section in Settings: the "why" text, then per mode the installed line, the iOS steps (1. Tocá Compartir, with lucide's `Share` icon inline. 2. Elegí "Agregar a inicio", the label Safari shows in Spanish, confirmed by the user. 3. Abrí MTF desde el ícono), the "Instalar MTF" `primary` button, or the generic menu steps.
- **`InstallNudge.tsx`**: the same ink note as `FirstRunHint`, text "Instalá MTF para que tus notas estén más seguras." with "Cómo" (opens Settings) and "Ahora no". Both, and `installed` becoming true, save `mtf_install_nudge_seen = '1'` (`loadInstallNudgeSeen` / `saveInstallNudgeSeen` in `storage.ts`, a device setting like `mtf_hint_seen`). **Trigger:** the number of `note` events grows during this session (the count at mount is the baseline, so reloading with notes never triggers it), and at that moment the mode is `'ios'` or `'prompt'`, the nudge was never seen, and `loadHintSeen()` is true, so it never stacks on the first-run hint.
- **Shared look:** the ink note above the Dock moves from `FirstRunHint` into the UI kit as `components/ui/Callout.tsx` (message + action buttons, closed API), used by both, instead of copying its classes.
- **Why a nudge at all:** on iPhone, installing is what exempts the data from Safari's 7-day eviction, and a section deep in Settings is easy never to see. Once per device, positive copy, and it waits for the first kept Card, so it never greets a new user with a demand.

### 9. Strings

New ES/EN keys: Backup section (label, note, export, import, ready toast, imported toast, three errors, confirm title/summary/warning/buttons), install section (label, why, installed, iOS steps, button, manual steps), nudge (text, "Cómo", "Ahora no"). Spanish is the source dictionary; the key-parity test covers English.

### 10. Tests

- **Vitest**: `backup.test.ts` (file name from a local date near midnight; round trip `readBackup(makeBackup(d))` deep-equals `d`; each refusal; extra fields kept; an older version goes through `upgradeDocument`, tested with an injected step through `migrate`), `validate.test.ts` (one test per rule), `deliver.test.ts` (stubbed `canShare` / `share` / `matchMedia` / `createObjectURL`: share, cancel, share failure → download, desktop → download), `storage.test.ts` (`upgradeDocument`, `loadData` unchanged, `requestPersistentStorage` with a stubbed `navigator.storage`, nudge flag), `appStore.test.ts` (`replaceData` saves and keeps the language), `BackupSection.test.tsx` (`userEvent.upload`: invalid → alert and data untouched; valid → summary; cancel; confirm → data replaced and `onImported` called), `platform.test.ts`, `InstallSection.test.tsx` (each mode), `InstallNudge.test.tsx` (triggers on a new note only in `ios`/`prompt` mode, once, not with the hint visible), `Callout.test.tsx`.
- **Playwright** `e2e/backup.spec.ts`, desktop project only (the phone project emulates touch, and Chromium's share sheet cannot be driven): seed → export (`page.waitForEvent('download')`) → read the file → change a Card → import with `setInputFiles` → confirm → `storedData` equals the seeded data and the Desk shows it after a reload; an invalid file shows the message and leaves `mtf_data` unchanged; export and import with `context.setOffline(true)` and no request leaving the origin.
- **By hand** (task list): share sheet and file picker on Android and iPhone, the install steps on iPhone, the install button on Android Chrome.

## Risks / Trade-offs

- [Import replaces device-only Cards] → explicit confirmation with the current count and "exportalo antes"; merging is V2.
- [iOS Files may grey out `.json` files with `accept="application/json"`] → `.json` is listed too; checked by hand on an iPhone. If iOS still refuses, drop `accept` on iOS (copy-free change).
- [The browser cannot save a large imported document (quota)] → the 5 MB cap keeps it rare; the storage layer logs the failure and the app keeps working in memory, as for any other save.
- [A Backup holds the notes as plain text] → accepted for the MVP; encryption is out of scope.
- [A newer Backup on an older cached app] → the message says it was made with a newer MTF; silent updates mean the next launch usually has the new version.
- [`beforeinstallprompt` exists only in Chromium; iOS detection relies on the user agent] → the generic steps cover every other browser; the iPadOS check uses touch points.
- [Firefox shows a prompt for persistent storage] → asked only after the first Card, never on a blank launch.
- [The iOS share sheet needs a user gesture] → the file is built synchronously before the first await (decision 4).

## Migration Plan

No schema change and no data migration: `SCHEMA_VERSION` stays 1 and the stored document is untouched. One new device key, `mtf_install_nudge_seen`. Rolling back the deploy leaves that key unused and harmless.

