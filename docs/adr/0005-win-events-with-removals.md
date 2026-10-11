# Wins are a list of events that follows the Desk, with one Card Win per finished Card

Mis logros, the wins counter and the Jar's numbers are all **computed from `MtfData.events`**, a list of `WinEvent`s (`item`, `card`, `note`, each with an `id` and the moment `at`). There are no stored counters. Change 3 fixes the rules for writing that list:

1. Checking an Item **appends** an `item` event. Unchecking it **removes** the most recent `item` event for that Item.
2. **A Card on the Desk has a `card` event exactly while it is finished**, and a Card in the Jar always has one. After every change to a Card's Items, MTF adds the `card` event if the Card is finished and has none, and removes it if the Card is no longer finished. The Jar adds one to a Card without Items when it accepts it. Taking such a Card back out removes it. The checked Items' events are the partial credit for a half-done Card; there is no separate "semi-win" type.
3. Keeping a newly created Card appends a `note` event. Notes are shown apart and never count as "things done".
4. **Wins go away with what they count**: deleting a Card removes every event with its `cardId` (`item`, `card`, `note`), and removing an Item removes that Item's events. Editing a title or text, moving a Card and the passing of time never remove anything.

We chose events over counters because the views need "per day", "last 7 days" and "since you started", and because a list of events with ids merges well between devices in V2. We chose to **remove** events (rather than append "unchecked" or "deleted" events) because the user wants Mis logros to count what is on the Desk and in the Jar, so every number stays a plain count of the list.

## Considered Options

- **Counters on the entities** (`Card.wonAt`, `Item.checkedAt`): rejected. It needs a schema change and extra fields to keep a Card Win while the Card is in the Jar, and V2 merges would be per field instead of per event.
- **Strictly append-only log** (an `uncheck` or `deleted` event cancels an earlier one): rejected for the MVP. Every reader would have to replay pairs, and storage would grow with every toggle. It would make V2 merges trivial, which is the trade-off below.
- **Keep Wins after a Card is deleted** ("what you did still counts"): rejected by the user. A deleted Card is treated as never written; the Jar is the place for Cards whose credit you want to keep.
- **Keep the Card Win when a finished Card gets a new unchecked Item**: rejected by the user. A Card Win means "this Card is finished now".

## Consequences

- The Backup (change 4) carries `events` as they are. Importing replaces them along with the rest of the document.
- **V2 sync cost**: because events can be removed, merging two devices' lists needs to know about removals. V2 will keep tombstones (removed event ids with a time) or a small deletion log next to `events`. That is an addition to the schema, not a rewrite, but it is the price of choosing removals now.
- Unchecking or removing an Item, or deleting a Card, lowers "since you started". That is accepted: only an explicit action by the user lowers a number.
- The list grows with use (about 150 bytes per event), and deletions keep it in step with the Desk. That is fine for localStorage at notepad scale. If it ever matters, old events can be compacted into daily counts.
