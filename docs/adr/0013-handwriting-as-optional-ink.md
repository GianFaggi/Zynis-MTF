# Handwriting is optional ink on the Card, in box coordinates, with no schema bump

> Amended by [ADR 0014](0014-stroke-styles-parallel-list.md): strokes drawn with a pen other than Tinta keep their color and width in an optional `ink.styles` list.

A Card can hold Handwriting (#47). It is stored on the Card itself, as an optional field:

```ts
interface Ink {
  height: number        // box height in ink units; the width is always 1000
  strokes: number[][]   // each stroke is flat [x, y, p, x, y, p, ...], all integers
}
interface Card { /* … */ ink?: Ink }
```

- **Box coordinates.** The box is always 1000 units wide (`INK_WIDTH`). `x` is 0–1000, `y` is 0–`height`, both rounded to integers and clamped to the box. `p` is the pressure 0–100; a pointer that reports none (mouse, finger, a pen reporting 0) gets 50, an even stroke. The box renders as an SVG with `viewBox="0 0 1000 {height}"` at 100% width, so the same Handwriting fits a wide editor, a phone sheet and a 236 px Card with the same layout.
- **Kept as strokes, drawn with a fill of `currentColor`.** The color is not stored: it follows the theme's ink token.
- **Bounded.** A new box is 400 units tall, grows by 250 when a stroke ends near its bottom, up to 2500, and never rescales what is drawn. A Card holds at most 12 000 points (`INK_MAX_POINTS`, roughly 150 KB of JSON at worst), so one Card cannot fill the shared ~5 MB of localStorage, and it still fits sync's 512 KB push chunks.
- **Missing means none.** A Card never keeps an `ink` with no strokes: closing the editor removes it, the way it drops blank Items.

**No `SCHEMA_VERSION` bump.** Sync records carry no schema version ([ADR 0012](0012-session-sync-of-opaque-records.md)), so a device on an older deploy can push a Card without `ink` at any time, and this version has to read such a Card whatever the document's version says. A bump would add a migration that does nothing and make an older MTF refuse a new Backup as "newer" for no gain. It also follows every change since #7, which all added optional fields without one. Store actions copy the Card with `{ ...card, ...patch }` and the Backup check keeps unknown fields ([ADR 0006](0006-backup-file-format.md)), so an older version carries `ink` along untouched.

We chose this because Handwriting must be exact (it is the user's own letters), the same on every screen, readable in both themes, erasable stroke by stroke and small enough to sync with the Card it belongs to. Integer box coordinates in flat triples give all of that with plain JSON.

## Considered Options

- **A PNG data URL**: rejected. 50–200 KB per Card, blurry when zoomed in, a fixed color that breaks the dark theme, and no stroke erasing or undo.
- **Nested points `[[x, y, p], …]`**: rejected. About 30% bigger in JSON for the same data.
- **A delta-encoded string**: rejected for now. About 40% smaller, but opaque to read and debug, and the point limit already bounds the size.
- **Screen pixels instead of box units**: rejected. The same Handwriting would land differently on every editor width.
- **A separate Handwriting entity or storage key**: rejected. It would need its own sync kind, Backup section and delete rules, for content that always lives and dies with one Card.
- **A `SCHEMA_VERSION` bump with a no-op migration**: rejected (above).

## Consequences

- **An older deploy deletes a Card whose only content is Handwriting when its editor closes**, because its `isEmptyCard` does not know `ink`. Cards with any text, Item or title are safe. The window is short (the PWA updates on its next launch), but a rollback should go together with a Backup.
- Because `ink` carries no version of its own, changing its encoding later (a delta string, say) needs a **new field name**, read alongside `ink` for as long as old Cards exist. That is the hard-to-reverse part of this decision.
- A Card with a lot of Handwriting can pass the 60 KB `keepalive` leave send and fall back to ordinary pushes, which already exists in sync.
- Search, Tidy up, the Jar and Wins need no new rules: Handwriting only makes a Card not empty and taller.
