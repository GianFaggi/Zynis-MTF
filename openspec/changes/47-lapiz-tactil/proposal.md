# Proposal

## Why

Some notes are faster or only make sense written by hand: a quick sketch, an arrow between two ideas, a word in your own letters. Today a Card holds only typed text and a checklist. MTF is used on an iPad with an Apple Pencil and on a PC with a graphics tablet, and neither pen can leave anything on a Card. This was requested directly (#47). The Desk, storage, Backup and sync are now stable enough (MVP, #36, #37) to add a new kind of Card content.

## What Changes

- **Handwriting in a Card.** The Card editor gets an optional handwriting box. Writing with an Apple Pencil, a graphics tablet pen or a mouse leaves ink strokes that are kept exactly as drawn, pressure included. MTF does **not** turn handwriting into text.
- **Off by default.** A new device setting, "Escritura a mano" / "Handwriting" (No / Sí), is off by default. While it is on, the editor offers "A mano" / "Handwriting" to add a box to a Card. Turning it off only hides that offer: handwriting a Card already has is always shown and stays editable.
- **The finger draws until a pen appears.** In the box, the pen and the mouse always draw. The finger draws too, so a phone can use it, until the box sees a pen. From then on the finger is ignored while the editor stays open, so a palm resting on the iPad leaves no marks.
- **Tools.** Undo, an eraser that removes whole strokes (also the eraser end of a tablet pen) and "Borrar todo" with a second-tap confirmation. One ink color that follows the theme. The box grows downwards as the user writes near its bottom, up to a limit.
- **On the Desk.** A Card shows its handwriting scaled down under its text. A Card whose only content is handwriting is not empty: it is kept, counts as a note written and can go to the Jar. When zoomed out, a Card with no title, text or Items shows its handwriting instead of an empty title.
- **Travels with the Card.** Handwriting is part of the Card, so it is saved locally, goes into the Backup and syncs with the Card. It is an **optional field**: a Card without it is a Card with no handwriting. There is **no schema bump**, so Cards and Backups from earlier versions keep working unchanged (decision and format in `design.md` and a new ADR).
- **Desk gestures unchanged.** Writing happens inside the editor sheet, never on the Desk. On the Desk the pen keeps behaving like the mouse.

Out of scope:
- Converting handwriting to text inside MTF, and a "convert" mode. The explore found no offline, free way to do it in the browser. On iPad, Scribble already turns Pencil writing into text in the title and text fields with no work from MTF.
- Writing directly on a Card on the Desk. With a graphics tablet the pen is the pointer, so writing cannot be told apart from moving Cards.
- Colors, stroke widths, highlighter, shapes, images, and searching handwriting.

Acceptance criteria of #47 → scope:

| Criterion | Where |
|---|---|
| Explore defines the scope | Done; recorded here and in `design.md` |
| Setting "Escritura a mano", off by default, shows or hides the box; existing handwriting stays visible | `handwriting`: setting requirements |
| Handwriting with Apple Pencil and graphics tablet, with undo, eraser and "Borrar todo" | `handwriting`: box, input and tools requirements |
| The finger draws until a pen is seen (palm rejection) | `handwriting`: finger rule |
| Saved, offline, no account, shown scaled down on the Desk | `handwriting` + `cards` (Card on the Desk, empty Cards) + `desk` (far zoom) |
| Travels in Export/Import and sync | `backup` (valid Backup) + `sync` (what travels) |
| The pen does not break Desk gestures | `handwriting` (drawing stays inside the box) + Playwright tasks |

## Capabilities

### New Capabilities
- `handwriting`: Handwriting inside a Card. Covers the device setting that offers it, the handwriting box in the editor, which pointers draw (pen, mouse, the finger until a pen appears), the tools (undo, eraser, clear), how the box grows and its limit, how a Card shows its handwriting, and that it is kept as ink, never as text.

### Modified Capabilities
- `cards`: "Empty new Cards are discarded" counts handwriting as content; "Card on the Desk" shows the handwriting scaled down.
- `desk`: "Far zoom shows titles only" gives a Card with only handwriting its handwriting instead of an empty title.
- `backup`: "What a valid Backup is" checks the shape of a Card's handwriting when present, and accepts Cards without it.
- `sync`: "What travels" includes a Card's handwriting, and leaves the new setting on each device.

## Impact

- **Data**: `Card` gains an optional `ink` field (strokes in box coordinates). There is no `SCHEMA_VERSION` bump and no migration. New ADR 0013 records the format and why it is optional. `src/types`, `src/backup/validate.ts`, `src/desk/cardText.ts` (`isEmptyCard`, `displayTitle` fallbacks).
- **Device setting**: new key `mtf_handwriting` in `src/lib/storage.ts`, `appStore.handwriting`. It is not in `mtf_data`, the Backup or sync.
- **UI**: a new handwriting box component and pure ink helpers (`src/ink/`), `CardEditor.tsx`, `DeskCard.tsx`, the Settings sheet in `App.tsx`, `es`/`en` locales.
- **Dependency**: `perfect-freehand` (tiny, no dependencies) to draw pressure-sensitive strokes, justified against `KB/frontend/stack.md` in `design.md`.
- **Sync / backend**: no change. Card records are opaque. A Card with a lot of handwriting can exceed the 60 KB leave send and fall back to ordinary pushes, which already exists.
- **Docs**: `GLOSSARY.md` (Handwriting), KBs `storage.md`, `desk.md`, `architecture.md`, `stack.md`, `design-system.md`, `testing.md`; a new `aprendizaje/` note on Pointer Events for pens and perfect-freehand.
