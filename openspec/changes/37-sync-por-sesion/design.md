# Design

## Context

See [proposal.md](proposal.md) for why. What the design has to fit:

- **The data is one document.** `appStore.data` is `MtfData` (`areas`, `cards` with nested `items`, `events`). Every action replaces `data` immutably, touches only what it changes (other entities keep their object reference) and sets `updatedAt` on what it touches. A `subscribe` saves the whole document to `mtf_data` whenever the reference changes ([architecture.md](../../../KB/frontend/architecture.md)). Win events have `at` and no `updatedAt`, and are added or removed, never edited ([ADR 0005](../../../docs/adr/0005-win-events-with-removals.md)).
- **Wins follow the Desk through pure rules** in `src/wins/rules.ts` (`syncCardWin`, `itemToggled`, `cardDeleted`, …). Two invariants: one `card` event exactly while a Desk Card is finished (always one in the Jar), and no Win without the Card or Item it counts.
- **Accounts exist** (#36): `accountStore` holds the access token in memory (15 min) and renews it under the Web Lock `mtf_session_renewal`; `withSession()` renews and retries once on 401; `apiRequest()` wakes Render through `/health` (shared, skipped within 10 minutes of an answer), sends once, gives up at 90 s. Nothing runs at launch today.
- **The API** (`api/`) is Controllers → Services → DAOs behind interfaces, EF Core on Postgres 17, a global 64 KB body limit, IP rate limits (`global` 60/min, `auth`, `session`), CORS for one origin, `TimeProvider` for time, no background jobs (a job would wake Neon).
- **Hosting** is Render Free (sleeps after 15 quiet minutes, ~1 min to wake) and Neon Free (scales to zero after 5 min) ([ADR 0009](../../../docs/adr/0009-v2-backend-hosting.md)).
- **`src/sync/` already exists** for the paper plane (#35): `PaperPlane`, `PlaneWait`, `SyncIndicator`, `useWaitStage`, `wait.ts`.

## Goals / Non-Goals

**Goals:**

- Sync is an addition: no store action, no `MtfData` field, no `SCHEMA_VERSION` bump, no Backup format change.
- Every sync rule that decides data (diff, merge, normalization, first sign-in) is a pure function with unit tests; the side effects (timers, listeners, requests, storage) live in one orchestration module.
- The server stays ignorant of the Desk's shape, so a future front-end field needs no server change.
- One code path for "this Desk becomes the Account's" (Subir este, Import while signed in, Recuperar el escritorio anterior).

**Non-Goals:**

- Several tabs of MTF open at once on one device. MTF already assumes one tab (each tab saves the whole `mtf_data`); sync only makes sure two tabs never sync at the same time.
- Clock correction between devices: "newest wins" trusts each device's clock (one person, devices with network time).
- Compressing or diffing record contents on the wire.

## Decisions

### D1. One `records` table of opaque JSON, keyed by Account, kind and id

```
records          user_id → users (cascade) · kind ('area' | 'card' | 'win') · id (uuid)
                 data (jsonb) · updated_at (timestamptz) · deleted_at (timestamptz?) · seq (bigint, unique)
                 PK (user_id, kind, id) · index (user_id, seq)
sync_accounts    user_id (PK) → users (cascade) · purged_seq (bigint, default 0) · created_at · updated_at
```

- A **Card record holds its Items** (the issue's "Cards (con sus Items)"): Items have no life of their own outside a Card, and every Card action already rewrites the Card.
- **`kind` is `win`**, not `event`, to match the glossary; the front end maps `MtfData.events` ⇄ `win` records.
- **`updated_at` is the moment the device made the change**, sent by the device (D4), not a server stamp. That is why `Record` does not inherit `Entity` (whose `updated_at` `AppDbContext` stamps from the server clock), and has no `created_at`: the data inside already carries the entity's own `createdAt`.
- **`data` stays on a deleted record** (`deleted_at` set) for 30 days, the issue's safety net; D3 removes it after that.
- **`seq`** comes from one Postgres sequence, `records_seq`, taken on every insert and every accepted update.
- `sync_accounts.purged_seq` is the highest `seq` ever purged for that Account (D3). It lives apart so `users` stays the minimal record #36 promised.
- The server validates only the envelope: `kind` is one of the three, `id` is a uuid, `updatedAt` is a positive epoch-ms number, `data` is a JSON object when not deleted. It never reads inside `data`.
- *Alternatives*: a table per entity with real columns (rejected: the server would have to change with every front-end field, and merge rules would be duplicated in C#); one JSON blob per Account (rejected: every push rewrites the whole Desk, and two devices' changes to different Cards would overwrite each other).

### D2. Push: a batch, newest change wins, serialized per Account

`POST /api/sync/push` with `{ records: [{ kind, id, updatedAt, deleted, data? }] }` → `200 { }`.

- One transaction per request. It first takes `pg_advisory_xact_lock` on the Account, so two pushes of one Account never interleave; that keeps `seq` in commit order within an Account, so a pull can never skip a change that commits late (D3).
- Each record is one `INSERT … ON CONFLICT (user_id, kind, id) DO UPDATE SET data, updated_at, deleted_at, seq = nextval('records_seq') WHERE records.updated_at < excluded.updated_at`. An older or equal change does nothing, so the same batch twice changes nothing (idempotent). The SQL lives in `RecordDao` (raw SQL through EF's `ExecuteSqlInterpolatedAsync`, since EF's change tracker cannot express the conditional upsert).
- The answer carries nothing: a record that lost to a newer one will come back to the device in its next pull, because the winner's `seq` is newer than anything the device has seen.
- The push also purges (D3), so cleaning up needs no background job.
- **Limits**: the push endpoint accepts up to 1 MB (`[RequestSizeLimit]`), above the global 64 KB; the client never sends more than 512 KB in one request (D7). Both sync endpoints use a new `sync` rate-limit policy, 30 / min per IP.
- *Alternative*: answer with the stored version of every losing record (rejected: more code and bytes for a case the next pull already covers).

### D3. Pull by cursor, purge after 30 days, and an expired cursor

`GET /api/sync/pull?after=<seq>&limit=500` → `200 { records: [{ kind, id, updatedAt, deleted, data? }], next: <seq>, more: bool }`.

- Records of the token's Account with `seq > after`, ordered by `seq`. Deleted records come with `deleted: true` and no `data` (the device only needs to know they are gone).
- **Purge** (inside each push): delete the Account's records with `deleted_at` older than 30 days, and raise `sync_accounts.purged_seq` to the highest `seq` removed.
- **Expired cursor**: a pull with `0 < after < purged_seq` answers `410 cursor_expired`. A device that missed a purged deletion would otherwise bring the deleted record back. So does a pull with `after` above the highest `seq` ever issued (the database was lost or restored older, D15). The device then runs the first sign-in rule (D12). `after = 0` (a full pull) is always allowed.
- Both endpoints are `[Authorize]`; the Account is `User.GetUserId()`, never a parameter.
- *Alternative*: keep tombstones forever (rejected: Neon's 1 GB and a list that only grows; and the issue fixes 30 days).

### D4. The outbox is a diff of the document, kept in `mtf_sync`

A new module subscribes to `appStore` beside the existing save, and compares `previous.data` with `state.data`:

- Entities are matched by `kind` + `id`. An entity whose object reference is the same is unchanged (actions keep references of what they do not touch). A different reference is checked by content before it counts, so `replaceData` with an equal Desk adds nothing.
- Added or changed → `pending[key] = { at: now }`. Removed → `pending[key] = { at: now, deleted: true }` (the tombstone). The newest entry for a key replaces the older one.
- **`at` is the change time sent as `updatedAt`** (D1). For an ordinary edit it equals the entity's own `updatedAt`; for an Import, a recovery or a normalization it is the moment MTF wrote it, so those changes win over older copies on the server. Win events, which have no `updatedAt`, get one the same way.
- What is sent is read from the current `data` at send time, so a Card edited ten times sends once.
- An entry is removed only when a push that contained it is confirmed **and** its `at` is not newer than what was sent (a Card edited during the send stays pending).
- Changes made by sync itself (D9) are applied through `appStore.replaceData` while a module flag is set, and the subscriber skips them. Zustand calls subscribers synchronously, so the flag covers exactly that replacement. No store action changes.
- **`mtf_sync`** (one device key, behind `src/lib/storage.ts`): `{ owner, cursor, pending, held, claim, lastSyncAt }`. `owner` is the email the state belongs to; with no owner (a device that never signed in) nothing is recorded. Missing or damaged reads as "never synced". Not part of `mtf_data` or the Backup; an Import leaves it alone.
- *Alternatives*: hooking every store action (rejected by the issue: forty actions to keep in step, and a forgotten one silently never syncs); storing the outbox inside `mtf_data` (rejected: it would enter the Backup and need a schema bump).

### D5. Where the code lives

`src/sync/` grows, with the pure rules apart from the side effects:

| Module | What |
|---|---|
| `records.ts` | Pure: `MtfData` ⇄ records (`toRecords`, `keyOf`, `fromRecords`) |
| `outbox.ts` | Pure: `diffData(before, after, now)` → pending entries; `confirmSent(pending, sent)` |
| `merge.ts` | Pure: `mergeRecords(data, incoming, pending)` → `{ data, changed }` (D9) |
| `normalize.ts` | Pure: `normalizeWins(data, now, newId)` (D10), reusing `src/wins/rules.ts` |
| `firstSignIn.ts` | Pure: `isNewDevice(data)`, `firstSignIn(local, remote)` → `'upload' \| 'take' \| 'ask'`, `deskSummary(...)` |
| `syncApi.ts` | `pushRecords`, `pullRecords` through `withSession` + `apiRequest`; the leave send (D7) |
| `syncStore.ts` | Zustand: `syncing`, `lastSyncAt`, `pendingCount`, `choice` (the dialog's two summaries), `replacedUntil` |
| `engine.ts` | The only module with side effects: the subscribe, `syncNow()`, `leave()`, backoff, the hold, the Web Lock `mtf_sync`, the keep-awake timer |
| `triggers.ts` | `startSyncTriggers()`: launch, `visibilitychange`, `pagehide`, `online`, idle; started from `main.tsx` |
| `SyncChoice.tsx` | The first sign-in dialog (a `Sheet`) |

`wait.ts`, `PaperPlane`, `PlaneWait`, `SyncIndicator` stay as they are; `App` mounts `SyncIndicator` in the tools pill while `syncStore.syncing`.

### D6. Triggers

- **Arrive** = `syncNow()`: pull every page, merge once, normalize, then push. Fired at launch (from `main.tsx`, after the first render, never before it), on `visibilitychange` → visible, and on the first input after idle counted as leaving.
- **Leave** = `leave()`: push only. Fired on `visibilitychange` → hidden, on `pagehide`, and after 2.5 minutes with no `pointerdown`, `keydown` or `wheel` while visible (the issue's 2–3 minutes; one timer, reset by input, running only while something is pending).
- **Online** → push if something is pending.
- **Sincronizar ahora** → `syncNow()`.
- **Keep-awake**: while something is pending, MTF is visible and a session exists, one interval calls `wakeApi()` every 10 minutes (it is itself skipped within 10 minutes of an answer). Idle-as-leave empties the pending list after 2.5 quiet minutes, so the interval only runs while the person is actually working. `/health` never touches the database (ADR 0009, rule 4), so Neon sleeps.
- Nothing fires with no session, and nothing fires on a timer except the idle timer and the keep-awake, neither of which reads data. No polling.
- One sync at a time per browser: `syncNow()` and `leave()` run under the Web Lock `mtf_sync` (as #36's renewal does). A trigger fired while a sync runs is remembered once and runs after it.
- *Alternative*: idle only on PCs (rejected: telling PCs from phones is guesswork, and a phone left visible on a table is the same situation).

### D7. The leave send: `keepalive` when small, preflight cached

- A page being hidden or closed may be killed before an ordinary `fetch` finishes. `fetch(…, { keepalive: true })` keeps going after the page is gone, but the browser caps all in-flight `keepalive` bodies of a page at 64 KB. So: a batch up to 60 KB goes with `keepalive`; a larger one goes as ordinary requests of up to 512 KB each (on `visibilitychange` → hidden a phone usually keeps the page running for a few seconds).
- The request has `Authorization` and `Content-Type: application/json`, so it needs a CORS preflight. The API sets `SetPreflightMaxAge(2 h)`, so the leave send reuses the preflight cached by the arrival's push. **Task 8.1 checks on an Android phone, an iPhone and a PC** that a `keepalive` push reaches the API on tab close. If a browser drops it, the fallback is a "simple" request (`Content-Type: text/plain`, the access token inside the body) on the push endpoint only; nothing else changes.
- **The access token** may be stale at leave time (15 minutes). `accountStore` now keeps `accessTokenExpiresAt` in memory. On `visibilitychange` → hidden with a token expiring within a minute, MTF renews first, then sends. On `pagehide` it sends with what it has; a refused send stays pending and goes on the next arrival.
- *Alternative*: `navigator.sendBeacon` (rejected: it cannot send an `Authorization` header and has the same 64 KB cap).

### D8. Retries

`apiRequest()` already waits for Render to wake (up to 90 s) and sends once. On top of it:

- `offline` → no retry; the `online` trigger takes over.
- `session_ended` → stop; the session ends as in #36 and the pending list stays, for whenever the user signs in again.
- `cursor_expired` → first sign-in rule (D12).
- `timeout`, `network`, `server_error`, 429 → retry after 10 s, then 30 s, then 90 s (or the `Retry-After`, if longer), then stop until the next trigger. Never a loop.
- An unconfirmed push needs no special handling: its entries were never removed (D4), so the next arrival sends them again, and the server keeps one copy (D2).

### D9. Merge, record by record

After all pages of a pull arrive, `mergeRecords(data, incoming, pending)` decides each record on its own:

- Incoming record and **no pending entry** for that key → apply it (replace, add, or remove when `deleted`).
- Incoming record and a pending entry **newer** than it → keep the local version (it will be pushed and win on the server too). Equal → keep local (it is this device's own change coming back).
- Incoming records for the Card open in the editor go to `held` (D11) instead.
- `changed` is true only when the local `data` actually changed, so the "Tu escritorio está al día" toast never fires for a device's own changes coming back.
- After merging, a Card whose Area is gone moves to the Area nearest its position (the rule `returnCard` already uses), and a Desk left with no Area (two devices each deleted the other's last Area) gets the default Areas back. Both are local changes, so they are pushed.
- The merged document is applied with the sync flag (D4), then D10 runs as an ordinary local change.

### D10. Normalizing Wins after every merge

`normalizeWins(data, now, newId)` restores ADR 0005's invariants, which two devices can each break while offline:

- Every Desk Card that is finished, and every Card in the Jar, has exactly one `card` event; an unfinished Desk Card has none.
- A checked Item has at most one `item` event; an unchecked Item has none.
- An event whose Card or Item is gone is removed.
- **Which duplicate survives is the same on every device**: the one with the earliest `at`, and on a tie the smallest `id`. So two devices that each normalized converge without talking to each other.
- A missing `card` event is added with `at = now`. If two devices add one at the same time, the next normalization removes one of them by the rule above.
- An `item` event is never added (the issue's "at most one").
- It runs on the merged document **as a local change** (not flagged), so the removals and additions become pending and reach the other devices.
- Nothing is removed for the passing of time (the `wins` spec's positive rule).

### D11. Holding remote changes during an edit or a drag

- `deskStore` gains `lifted: boolean`, set by the Desk when a Card or an Area is lifted, and cleared on drop, on cancel and after the "¿Pasarla a…?" answer (#19 keeps the Card lifted while it asks).
- **During a drag** the whole merge waits: `engine` subscribes to `deskStore` and merges right after `lifted` turns false. Drags last seconds, and both a Card and an Area drag move Cards, so holding everything is the simplest correct choice.
- **While the editor is open**, records for `editingId` are put in `mtf_sync.held` and the rest merge at once. When the editor closes (`editingId` changes), the held records merge by D9, then D10 runs. They are kept on the device, not in memory, so the cursor can move past them safely even if MTF closes with the editor open.
- *Alternative*: holding the whole merge while the editor is open (rejected: the editor can stay open for minutes, and the spec only protects the open Card).

### D12. First sign-in on a device

The rule runs when `mtf_sync.owner` is not the signed-in email (never synced here, or another Account), or after `cursor_expired`:

1. Pull everything (`after = 0`) into memory; nothing is applied yet and the cursor is not saved.
2. Account has no live record → **upload**: set `claim` (below) and push.
3. `isNewDevice(local)` → **take**: replace `data` with the Account's Desk (flagged, then normalized). Nothing to protect, so no copy. `isNewDevice` is true when there are exactly three Areas, each a default one (`key` set, no `name`, the default color and rect), every Card's title is the Welcome Card's title in Spanish or English, and the only events belong to those Cards and are not `note` events.
4. Otherwise → **ask**: `syncStore.choice = { local, remote }` with each side's number of Cards (Desk and Jar), number of Areas and last update (the newest `updatedAt` or `at`), and `SyncChoice` opens. Nothing syncs until the user chooses; closing it leaves everything as it was and the next arrival asks again.
   - **Usar el de la cuenta** → keep the copy (D13), then replace `data` with the Account's Desk as in step 3, clear `pending`.
   - **Subir este** → `claim`.
5. Then `owner` = the email and `cursor` = the pull's `next`.

**`claim`** (one path for Subir este, an Import while signed in, and Recuperar): `mtf_sync.claim = at`. The next sync pulls everything, marks every local entity pending with `at = claim`, adds a tombstone (also at `claim`) for every Account record that is not on this device, and pushes. Because `claim` is stored, an Import made offline still takes over at the next arrival. `BackupSection` sets it after `replaceData` when a session exists, and its confirmation text says the other devices will follow (the `backup` spec).

### D13. The replaced Desk

- Before "Usar el de la cuenta", `saveReplaced(data)` writes `mtf_data_replaced_<epochMs>` and removes any older `mtf_data_replaced_*` key (one copy is enough). If the write fails (quota), `SyncChoice` says there is no room and shows the Export button; Usar el de la cuenta becomes available once `deliverFile` has delivered the Backup.
- At launch (no request involved) a copy older than 30 days is removed. `syncStore.replacedUntil` drives the Account section's **Recuperar el escritorio anterior**.
- Recovering: `replaceData(copy)` (not flagged), `claim`, remove the copy, `syncNow()`.
- Restoring this copy uses `upgradeDocument()` like the Backup, so a copy made by an older version still opens.

### D14. UI

- **Tools pill**: `{syncing && <SyncIndicator />}`, which already waits 2 s before it shows.
- **Toast**: `deskStore.showToast(t('sync.upToDate'))` when a sync's merge reported `changed`.
- **Account section and sheet**: "Última sincronización: hace 5 minutos" and, when pending, "3 cambios se suben en la próxima sincronización", with `Intl.RelativeTimeFormat` in the current language; **Sincronizar ahora** (disabled while `syncing`); **Recuperar el escritorio anterior** while `replacedUntil` is in the future. Ink and paper only.
- **`SyncChoice`**: two side-by-side summaries (stacked on a phone), two plain buttons with neither styled as the default, and the no-room message with Export when needed.
- Every new string in `es.ts` and `en.ts`.

### D15. No database backup; the devices rebuild the Account

- ADR 0009's rule 8 (an encrypted nightly `pg_dump`) is **dropped** by the user: MTF is a personal app, and a scheduled job with keys and secrets is more upkeep than the data is worth.
- What stands in for it: every signed-in device holds its whole Desk in `mtf_data`, so the server is a relay, not the only copy; the manual Backup stays.
- **A server that forgot heals itself.** If the database is lost or restored older, `records_seq` starts lower than the cursors devices hold. A pull whose `after` is above the highest `seq` the server has issued answers `410 cursor_expired` too (D3), the device runs the first sign-in rule (D12), finds the Account empty and uploads its Desk. The first device to sync refills the Account; the others then get the dialog or take it.
- *Alternative*: the nightly encrypted dump of ADR 0009 (`pg_dump` + `age` as a GitHub Actions artifact). Rejected by the user for the upkeep; it can come back as its own ticket if MTF is ever opened to other people.

### D16. ADR and docs

- **ADR 0012 — Session sync of opaque records** records D1–D4, D9, D10, D12, D15 and why (per-session instead of live, opaque instead of typed, newest change instead of field merge, diff instead of action hooks, 30-day tombstones with an expiring cursor, devices as the copies).
- ADR 0009: rule 8 is marked dropped by #37, with the reason, and the roadmap's backup items go away.
- CLAUDE.md's core rule ("makes no request at launch, and only the Account sheet calls the API") becomes: with no account MTF makes no request; with one, sync runs in the background and never blocks the Desk.
- GLOSSARY: **Sync** (ES **sincronización**) and **Previous desk** (ES **escritorio anterior**); **Backup** and **Import** say what changes with a session.

## Risks / Trade-offs

- [A browser drops a `keepalive` request that needs a preflight] → the preflight is cached for 2 hours by the arrival's push; task 8.1 checks the three devices first; the text/plain fallback is ready (D7); anything not sent goes on the next arrival.
- [Leaving with no signal or with a dead page] → the changes go up on that device's next arrival. This is the gap the issue already accepts.
- [Device clocks disagree] → "newest wins" could keep the older edit when a clock is minutes off. Accepted for one person; phones and PCs keep network time.
- [Two devices edit the same Card offline] → the later change wins whole, the earlier is lost. Accepted by the issue. The server's 30-day copy of deleted records does not cover overwritten ones.
- [A wrong choice in the first sign-in dialog] → the local copy and Recuperar el escritorio anterior (30 days); Subir este overwrites the Account, whose other devices still hold their own copy until they sync, and whose deleted records stay on the server for 30 days.
- [localStorage is nearly full] → `mtf_sync` and the replaced copy share the ~5 MB with `mtf_data`. The copy can be refused (then Export is required); `mtf_sync` failing to save is logged and the next diff recomputes nothing lost, because a push still reads the current `data`.
- [Render's 750 shared hours] → one arrival a session plus the keep-awake while editing stays near the issue's 20–35 h estimate. The monthly check of ADR 0009 watches it.
- [Neon loses the database, with no backup] → accepted by the user. The devices still hold every note, and D15's expired cursor makes the first device to sync refill the Account. What is lost: deleted records' 30-day copies, and changes no device had received yet.
- [A future schema bump] → records carry entities in the current shape. A `SCHEMA_VERSION` bump will need per-entity migrations applied to pulled records; ADR 0012 notes it, nothing is built for it now.
- [Two tabs] → the Web Lock stops them from syncing at once, but each still saves its own `data`, as today (Non-Goals).

## Migration Plan

1. Merge one PR with both sides. Render deploys the API (the migration creates `records`, `sync_accounts` and `records_seq` at start-up; #36's endpoints are untouched). Vercel deploys the front end.
2. First real use: sign in on the device with the most complete Desk first (empty Account → upload), then on the others (dialog or take).
3. **Rollback**: revert the front end and sync stops; every device keeps its notes in `mtf_data`, and `mtf_sync` is ignored. The tables can stay; a later forward migration can drop them if sync is abandoned.

## Open Questions

- The exact Spanish and English wording of the dialog, the status line and the toast is settled while building `SyncChoice` and the Account section, within the spec's texts.
- Whether the push's 512 KB request size needs tuning is answered by the manual hand-off with a real Desk.
