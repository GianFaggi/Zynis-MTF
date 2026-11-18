# The Desk syncs per session as opaque records, newest change wins

An Account's Desk travels between its devices **per session** (#37): MTF fetches what changed when it opens or comes back, and sends what changed here when it is hidden, closed or left idle for 2.5 minutes. Nothing syncs during use and nothing polls. The only request MTF repeats while the user works is a `/health` wake-up, at most every 10 minutes and only while something is waiting to be sent, so a leave send never hits a sleeping Render.

The server keeps every Area, Card (with its Items inside) and Win as an **opaque record** of its Account: `kind`, `id`, the JSON `data`, the time it changed and, if deleted, when ([KB/backend/api.md](../../KB/backend/api.md#sync)). It checks only that envelope and never reads a Card. The rules that understand the Desk (the diff, the merge, the Win clean-up, the first sign-in rule) are pure functions on the front end, in `src/sync/` ([architecture.md](../../KB/frontend/architecture.md)).

The pieces, and why each one:

1. **Per session, not live.** One person uses one device at a time. Fetching on arrival and sending on leaving covers the hand-off between phone and PC, and keeps Render and Neon use independent of how much the person writes, within [ADR 0009](0009-v2-backend-hosting.md)'s free plans. The gap it accepts: leaving with no signal, or a page killed before its send, waits for that device's next arrival.
2. **Opaque records, not typed tables.** A new Card field needs no server change, and the merge rules live in one place. A table per entity would duplicate them in C#; one JSON blob per Account would make every push rewrite the whole Desk and let two devices' edits to different Cards overwrite each other.
3. **Newest change wins, record by record.** The server keeps a record's change only when its `updatedAt` (the device's own clock, epoch ms) is newer than what it holds, so the same batch twice changes nothing. Merging on the device follows the same rule: a fetched record wins unless this device has a newer pending change to it. Two offline edits of the same Card are not merged field by field: the later one wins whole. Accepted for one person whose devices keep network time.
4. **The outbox is a diff of the document, not a hook on every action.** A module subscribes to `appStore` and compares the document before and after each replacement; a changed reference with equal content counts as unchanged. Hooking forty store actions would let a forgotten one silently never sync. Pending changes and deletions (tombstones) live in a device key, `mtf_sync`, outside `MtfData` and the Backup, so sync needs no `SCHEMA_VERSION` bump and no Backup change. Changes that sync itself applies are flagged and skipped.
5. **Pull by cursor.** Every accepted change takes the next value of one Postgres sequence (`seq`); a device asks for what is after the last `seq` it merged. Pushes of one Account run under an advisory lock, so its seqs commit in order and a pull can never skip a change that commits late.
6. **Deletions are kept 30 days, then the cursor expires.** A deleted record keeps its data on the server for 30 days, then the Account's next push removes it. A device whose cursor is older than the newest removed deletion gets `410 cursor_expired` and starts over with the first sign-in rule instead of bringing the deleted thing back. Keeping tombstones forever would only grow, against Neon's 1 GB.
7. **Wins are normalized after every merge, the same way everywhere.** Two devices can each break [ADR 0005](0005-win-events-with-removals.md)'s invariants offline (both finish the same Card; one unchecks what the other checked). After each merge MTF keeps one Card Win per finished or jarred Card, at most one Item Win per checked Item, none for anything unchecked, unfinished or gone. When it removes a duplicate it keeps the earliest, ties to the smallest id, so devices converge without talking. It never adds an Item Win and never removes anything for its age.
8. **The first sign-in rule.** When a device meets an Account for the first time (or after an expired cursor): an Account with no live record receives this Desk; a device with nothing of its own (the three untouched default Areas and at most Welcome Cards) takes the Account's; otherwise MTF asks, with neither choice preselected. "Usar el de la cuenta" first keeps a local copy of this Desk for 30 days (Recuperar el escritorio anterior); "Subir este", an Import while signed in, and Recuperar share one path, **claim**: every local entity is sent as new and every Account record not on this device is deleted.
9. **The devices are the copies.** Every signed-in device holds its whole Desk in localStorage, so the server is a relay. There is no database backup ([ADR 0009](0009-v2-backend-hosting.md), rule 8, dropped by #37). A pull whose cursor is above the highest `seq` the Account ever held (the database was lost, restored older, or emptied by hand) answers `410 cursor_expired` too: the device runs the first sign-in rule, finds the Account empty and uploads its Desk.

## Considered Options

- **Live sync (polling, WebSockets, push)**: rejected. It keeps Render awake while MTF is open and buys nothing for one person on one device at a time.
- **Field-level merge (a CRDT or per-field timestamps)**: rejected. It is a lot of machinery for a case the issue accepts losing: the same Card edited offline on two devices.
- **Typed server tables**: rejected (point 2).
- **Hooks in every store action**: rejected (point 4).
- **A nightly encrypted `pg_dump`**: rejected by the user for the upkeep (point 9).
- **Server time instead of device time for "newest"**: rejected. The order that matters is when the person made each change, and a push sent hours later would otherwise beat an edit made in between.

## Consequences

- Device clocks are trusted. A clock minutes off can make an older edit win.
- An edit overwritten by a newer one is not kept anywhere; only deleted records have a 30-day copy on the server.
- A future `SCHEMA_VERSION` bump must migrate pulled records entity by entity, since records carry entities in the current shape. Nothing is built for it now.
- Two tabs of MTF on one device never sync at the same time (the Web Lock `mtf_sync`), but each still saves its own document, as before.
- With no Session, MTF still makes no request at all.
