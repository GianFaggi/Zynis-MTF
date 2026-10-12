# Tasks

## 1. Storage layer

- [x] 1.1 Add `upgradeDocument(doc: unknown)` to `src/lib/storage.ts` (outer shape check, newer-version check, `migrate` with the private `migrations`; returns `{ ok: true, data } | { ok: false, reason: 'shape' | 'newer' | 'migration' }`) and rewrite `loadData()` on top of it with the same recovery behavior (design decision 3); verify `storage.test.ts` stays green unchanged and new tests cover each `upgradeDocument` result, including an older version upgraded through an injected migration step
- [x] 1.2 Add `requestPersistentStorage()` (no API → return; already `persisted()` → no `persist()` call; else `persist()`; every failure caught and logged) and the device flag `loadInstallNudgeSeen` / `saveInstallNudgeSeen` (`mtf_install_nudge_seen = '1'`); verify in `storage.test.ts` with a stubbed `navigator.storage`: missing API, already persisted, asked once, rejecting `persist()` does not throw; and the flag round trip plus a refused read giving `false`
- [x] 1.3 Update [KB/frontend/storage.md](../../../KB/frontend/storage.md): rewrite "Export / Import" from plan to fact (envelope, refusals, replace, link to [ADR 0006](../../../docs/adr/0006-backup-file-format.md)), add `upgradeDocument`, `requestPersistentStorage` and the flag to the API table, and `mtf_install_nudge_seen` to the keys table; verify every function named exists in `storage.ts`

## 2. Backup file (pure)

- [x] 2.1 Write `src/backup/validate.ts` (`isValidData(doc)`, the entity rules of design decision 2); verify in `validate.test.ts` with one failing case per rule (missing id, duplicated Card id, duplicated Item id across Cards, unknown color, bad `rect`, `jarredAt` a string, Card in a missing Area, unknown event type, no Areas) and that a valid document with extra fields and a dangling event `cardId` passes
- [x] 2.2 Write `src/backup/backup.ts` (`backupFileName(date)`, `makeBackup(data, now)`, `readBackup(text)` → `ok` / `notBackup` / `newer` / `damaged`, 5 MB cap, using `upgradeDocument` and `isValidData`); verify in `backup.test.ts`: the name uses the local date at 23:30 (TZ stubbed to `America/Argentina/Buenos_Aires`), the round trip `readBackup(makeBackup(d))` deep-equals `d` for a document with Desk Cards, Jar Cards, Items and every event type, not-JSON / foreign JSON / missing `format` → `notBackup`, `schemaVersion: 2` → `newer`, bad entity or missing `exportedAt` → `damaged`
- [x] 2.3 Write `src/backup/deliver.ts` (`deliverFile(file)` → `'shared' | 'downloaded' | 'cancelled'`, coarse-pointer + `canShare` gate, `AbortError` → cancelled, other share errors → download, object URL revoked); verify in `deliver.test.ts` with stubbed `matchMedia`, `navigator.canShare` / `share` and `URL.createObjectURL` / `revokeObjectURL`: desktop downloads, a phone shares, cancel does not download, a share failure downloads

## 3. Store and Desk after an Import

- [x] 3.1 Add `appStore.replaceData(data)`; verify in `appStore.test.ts`: `data` is the given document, `mtf_data` is saved with it, the language is unchanged
- [x] 3.2 Add `deskStore.resetAfterImport()` (clears `editingId`, `newCardId`, `query`; closes search and Mis logros) and move Dock's `seeAll()` to an exported `showWholeDesk()` in `src/desk/view.ts`, used by Dock; verify a `deskStore` test for the reset and that `Dock.test.tsx` and `e2e/navigation.spec.ts` stay green
- [x] 3.3 Update [KB/frontend/architecture.md](../../../KB/frontend/architecture.md): `replaceData` in the action list, `resetAfterImport` in `deskStore`, `src/desk/view.ts`, `src/backup/` and `src/install/` in the source layout; verify every path named exists

## 4. Backup in Settings

- [x] 4.1 Add the ES/EN strings for the Backup section, toasts, the three errors and the confirm panel (design decision 9); verify the i18n key-parity test passes
- [x] 4.2 Write `src/backup/BackupSection.tsx` (idle / error / confirm states, hidden file input reset after each pick, summary with `Intl.DateTimeFormat`, Desk / Jar / things-done counts, "Reemplazar mis datos" / "Cancelar", focus to the confirm heading, Export through `makeBackup` + `deliverFile` built synchronously in the click, "Copia lista" toast); verify in `BackupSection.test.tsx` with `userEvent.upload`: a foreign file shows the "not a Backup" alert and leaves `useAppStore` data unchanged, a newer and a damaged Backup show their messages, a valid one shows the summary, Cancel leaves data unchanged, Confirm replaces data and calls `onImported`, Export calls the stubbed `deliverFile` and shows the toast with the file name
- [x] 4.3 Wire it into the Settings sheet in `src/App.tsx` with `onImported` (close Settings, `resetAfterImport()`, `showWholeDesk()`, "Copia importada" toast with the Card count); verify in `App.test.tsx`: Settings shows the Backup section, and a confirmed Import closes Settings and shows the toast; check the section against the mockup's Settings at phone and desktop width, light and dark, with no accent color

## 5. Persistent storage request

- [x] 5.1 Write `src/store/usePersistentStorage.ts` (asks once per launch, the first time `data.cards.length > 0`) and call it from `App`; verify in `usePersistentStorage.test.ts` with `requestPersistentStorage` mocked: not called on an empty Desk, called once when the first Card appears, called once at mount when Cards exist, not called again on later changes

## 6. Install guidance

- [x] 6.1 Write `src/install/platform.ts` (`isStandalone`, `isIos` with the iPadOS check) and `src/install/installStore.ts` (`listenForInstall`, `promptEvent`, `installed`, `install()`, `installMode()`, `useInstallMode()`), and call `listenForInstall()` in `src/main.tsx` before rendering; verify in `platform.test.ts` (iPhone, iPad, iPadOS-as-Mac, Android, desktop user agents; standalone media query and `navigator.standalone`) and `installStore.test.ts` (a dispatched `beforeinstallprompt` is kept with `preventDefault`, `install()` calls `prompt()` once and clears it, `appinstalled` sets installed, mode priority installed > ios > prompt > manual)
- [x] 6.2 Move the ink note above the Dock into `src/components/ui/Callout.tsx` (message + actions, closed API) and make `FirstRunHint` use it; verify in `Callout.test.tsx` and that `FirstRunHint.test.tsx` stays green unchanged
- [x] 6.3 Add the ES/EN strings for the install section and the nudge, and write `src/install/InstallSection.tsx` (why text; installed line / iOS steps with the `Share` icon / "Instalar MTF" button / generic steps), added to Settings after the Backup section; verify in `InstallSection.test.tsx` one test per mode, the button calling `install()`, and the i18n key-parity test
- [x] 6.4 Write `src/install/InstallNudge.tsx` (shows when the `note` event count grows in this session, mode `ios` or `prompt`, nudge not seen, first-run hint seen; "Cómo" opens Settings, "Ahora no" dismisses; both and `installed` save the flag) and mount it in `App`; verify in `InstallNudge.test.tsx`: no nudge at mount with existing notes, shown after a new note in `ios` mode, not in `manual` or `installed` mode, not while the first-run hint is unseen, "Cómo" opens Settings, never shown again after either button
- [x] 6.5 Update [KB/frontend/pwa.md](../../../KB/frontend/pwa.md): an "Install guidance" section (modes, `beforeinstallprompt` captured in `main.tsx`, the nudge rule and its flag, persistent storage request and when it runs), and adjust "iOS specifics"; verify it matches the code

## 7. End-to-end

- [x] 7.1 Write `e2e/backup.spec.ts` (desktop project only): seed → export (`waitForEvent('download')`, file name, content) → edit a Card → import the downloaded file with `setInputFiles` → confirm → `storedData` equals the seeded data and the Desk shows it after a reload; a foreign file shows the message and leaves `mtf_data` unchanged; export and import with `context.setOffline(true)` and no request leaving the origin; verify `command npm run test:e2e` passes
- [x] 7.2 Update [KB/frontend/testing.md](../../../KB/frontend/testing.md) (Backup tests in both layers, stubbing the share / download / storage APIs in jsdom, why the phone project skips Backup e2e); verify the commands named run

## 8. Integration and wrap-up

- [x] 8.1 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass
- [x] 8.2 Add short Spanish sections to `aprendizaje/localstorage.md` (Backup file, `persist()`, why Import replaces) and `aprendizaje/pwa.md` (Web Share with files, `beforeinstallprompt`, installing on iPhone); no new library is introduced, so no new note; verify both link from `aprendizaje/index.md`
- [x] 8.3 Tick change 4 in [KB/roadmap.md](../../../KB/roadmap.md) and fill Technical Context / Modified Files in `KB/developers/active.md`; verify every path named exists
- [x] 8.4 Manual check on a real Android phone and an iPhone after deploy: Export opens the share sheet and the file arrives on the PC; Import picks a `.json` from Files / Downloads (iOS: the file is not greyed out); a confirmed Import shows the Desk; the iOS steps match Safari's menu ("Agregar a inicio"); "Instalar MTF" opens Chrome's dialog on Android; the nudge appears once after the first kept Card

## Workflow follow-up

- The user commits, pushes `feat/4-copia-de-seguridad-exportar-e-importar` and opens the PR; it merges once CI is green.
- After the merge, on an up-to-date `main`: `/opsx:archive`, push the archive commit straight to `main`, then `/close-ticket`.
