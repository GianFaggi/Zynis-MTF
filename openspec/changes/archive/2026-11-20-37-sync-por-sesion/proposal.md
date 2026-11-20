# Proposal

## Why

Since #36 a person can have an Account, but each device still keeps its own Desk. The only bridge between phone and PC is Export → Import, which replaces everything and has to be done by hand. #37 makes the Account useful: the same Areas, Cards and Wins on every device of the account, with no extra step.

A person uses one device at a time, so the Desk travels **per session**: it is fetched on arrival and sent on leaving, never during use and never by polling. That keeps Render and Neon use low (ADR 0009's free plans) and independent of how much the person writes.

## What Changes

- **Server records.** A new `records` table holds each Area, Card (with its Items) and Win of an account as opaque JSON (`user_id`, `kind`, `id`, `data`, `updated_at`, `deleted_at`, `seq`). The server never reads a Card's fields; the schema stays on the front end. Two endpoints behind the access token: a **batch push** that is idempotent (the newest `updated_at` wins), and a **pull by cursor** (`seq` greater than the last seen).
- **Client outbox.** A new sync module watches `appStore` with `subscribe`, compares the document before and after, and records what changed, with no change to any store action. Deletions are kept as tombstones in a device key, `mtf_sync`, with the cursor and the pending list. `MtfData`, `SCHEMA_VERSION` and the Backup format do not change.
- **Triggers, no polling.** Arriving (launch or returning to the app): pull, then push what is pending. Leaving (`visibilitychange` → hidden, `pagehide`): push with `fetch` `keepalive`, or a normal `fetch` above ~64 KB. 2–3 minutes with no input count as leaving. Coming back online pushes what is pending. Settings → Cuenta gets **Sincronizar ahora**. Something sent without a confirmation is sent again on the next arrival; retries back off and stop, never loop.
- **Keeping the server awake while there is something to send** (added to the issue during this proposal): Render sleeps after 15 quiet minutes, so a leave push at the end of a long session would hit a sleeping server and be lost until that device opens again. While changes are pending and MTF is visible, MTF asks `/health` at most every 10 minutes. `/health` never touches the database, so Neon still sleeps.
- **Merge and Win normalization.** Records merge one by one. After each pull, Wins are normalized so both devices agree: one `card` event per finished Card (or Card in the Jar), at most one `item` event per checked Item, none for an unchecked Item or a Card that is gone ([ADR 0005](../../../docs/adr/0005-win-events-with-removals.md)). The choice of which duplicate to keep is the same on every device.
- **Holding remote changes.** A remote change to the Card open in the editor waits until the editor closes; any remote change waits while a Card or an Area is lifted, and applies on drop.
- **First sign-in on a device.** An empty account receives this Desk. A new device (only the default Areas and a Welcome Card) takes the account's Desk without asking. When both have data, a dialog shows what each side has (Cards, Areas, last update) with no option preselected: **Usar el de la cuenta** / **Subir este**.
- **Protection when replacing.** Before the account's Desk replaces this one, MTF keeps a local copy (`mtf_data_replaced_<date>`) and offers **Recuperar el escritorio anterior** in Settings for 30 days. If the copy does not fit in localStorage, the dialog asks for an Export first. The server keeps deleted records with their data for 30 days.
- **UI with the paper plane.** The tools pill shows `SyncIndicator` when a sync takes longer than ~2 s. A toast "Tu escritorio está al día" appears only when changes arrived. Settings → Cuenta shows the last sync and what is pending, with no guilt and no red.
- **No nightly database backup.** ADR 0009's rule 8 and the roadmap asked for an encrypted nightly `pg_dump` before #37 stores notes on the server. The user dropped it during this proposal: MTF is a personal app, and a scheduled job, keys and secrets are more upkeep than the data is worth. Every device keeps its whole Desk in localStorage, so the server is a relay rather than the only copy, and the manual Backup stays. ADR 0009 and the roadmap are updated to say so.
- **The "no request at launch" rule changes.** With no account, MTF still makes no request at all. With a session, sync runs in the background at launch and on the triggers above, and never blocks or waits in front of the Desk. CLAUDE.md, the `pwa-offline`, `accounts` and `account-session` specs are updated to say so.
- An ADR for the sync model; `KB/frontend/storage.md`, `KB/frontend/architecture.md`, `KB/backend/api.md`, `KB/roadmap.md` and `GLOSSARY.md` updated.

### Acceptance criteria → scope

| Issue criterion | Where |
|---|---|
| Server `records` table, opaque JSON | `sync` (server records); design D1 |
| Idempotent batch push, newest wins; pull by cursor | `sync`; design D2, D3 |
| Outbox from `subscribe`, tombstones in `mtf_sync`, no `MtfData` / Backup change | `sync`; design D4 |
| Triggers: arrive, leave (keepalive / ~64 KB), idle, `online`, Sincronizar ahora, no polling | `sync`, `pwa-offline`; design D6, D7 |
| Unconfirmed resent on arrival; growing backoff, never a loop | `sync`; design D8 |
| Record-by-record merge + Win normalization | `sync`; design D9, D10 |
| Remote change to an open or dragged Card applies on close / drop | `sync`; design D11 |
| First sign-in: empty account / new device / dialog | `sync`; design D12 |
| Replace protection: local copy, Recuperar 30 days, Export when it does not fit; server keeps tombstones 30 days | `sync`, `backup`; design D13, D3 |
| Paper plane UI: indicator after ~2 s, toast only on changes, Cuenta with last sync and pending | `sync`, `server-wait`, `accounts`; design D14 |
| ADR, `storage.md`, `architecture.md` | tasks; ADR 0012 |
| Tests: merge, normalization, outbox, first sign-in rule; Playwright of a remote change during a drag | tasks |
| Manual hand-off on Android, iPhone and PC | tasks |

### Out of scope

- A backup of the server's database (nightly dumps or any scheduled job): dropped, see What Changes.
- Live sync during use, polling, push notifications or WebSockets.
- Merging two offline edits of the same Card field by field: the last change wins (accepted for one person, as the issue says).
- Device settings: language, theme, Mi disposición, Frasco por área, the Welcome Card flag and the install nudge stay on each device.
- Sharing a Card or an Area with another account; a list of devices; deleting an account (V2 backlog).
- A server-side copy of the Desk the user can browse or restore from the UI: the 30-day server tombstones are a safety net for manual recovery only.
- Syncing while signed out, or across two accounts on one device: signing in to another account is treated as a first sign-in.

## Capabilities

### New Capabilities

- `sync`: the Desk travelling between the devices of an Account per session: server records and their endpoints, the client outbox and tombstones, the triggers, retries, merge and Win normalization, holding remote changes during an edit or a drag, the first sign-in rule, the protection when replacing, and how sync shows in the UI.

### Modified Capabilities

- `pwa-offline`: "No network needed at runtime" now allows sync requests from a signed-in device (launch, return, leave, online, idle, Sincronizar ahora, the `/health` keep-awake), still none with no session.
- `accounts`: "An account is optional" no longer says nothing is uploaded on sign-in (the first sign-in rule applies); "Account in Settings" shows the last sync, what is pending, Sincronizar ahora and Recuperar el escritorio anterior.
- `account-session`: "A session never blocks the Desk" allows the background sync at launch while keeping the Desk independent of it.
- `server-wait`: "Sync indicator" is now shown in the tools pill by real syncs.
- `backend-service`: a new requirement for the sync endpoints' own body limit and rate limit.
- `backup`: an Import on a signed-in device becomes the account's Desk on the next sync.

## Impact

- **Front end**: new `src/sync/` modules (outbox, merge, normalize, first sign-in rule, triggers, sync store, API calls); `src/lib/storage.ts` gains `mtf_sync` and `mtf_data_replaced_<date>` accessors; `appStore`'s actions are untouched (sync applies remote records through the existing `replaceData`, flagged so they are not counted as local changes); `accountStore` keeps the access token's expiry in memory and starts or stops sync on sign-in and sign-out; `deskStore` exposes whether a Card or an Area is lifted; `AccountSection` / `AccountSheet` get the sync status, the first sign-in dialog and the recovery; `App` mounts the indicator and the triggers; Spanish and English strings.
- **Back end**: `records` model, migration, DAO, service and controller (`/api/sync/push`, `/api/sync/pull`), a larger body limit and a `sync` rate-limit policy for those endpoints, CORS preflight cache, purge of old tombstones on push, xUnit + Testcontainers tests.
- **Usage**: ~20–35 Render hours and 2–4 Neon CU-hours a month for 4–6 sessions a day (issue estimate). Render's 750 hours are shared with Zynis Cal.
- **Docs**: ADR 0012 (sync model), ADR 0009 (rule 8 dropped), CLAUDE.md core rule, KBs, GLOSSARY, an `aprendizaje/` note for sync concepts.
