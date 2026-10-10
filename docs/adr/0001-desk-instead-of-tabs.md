# One free Desk with Areas instead of boards in tabs

MTF organizes Cards on a single free Desk that the user pans and zooms. Trabajo, Vida and Recordar are soft colored **Areas** of that Desk, not tabs or containers, and a Card's Area is simply where it was dropped. Finished Cards go into a **Jar** on the same Desk. We chose this after the user tried a tabs + card-grid mockup ([design/mtf-mockup.html](../../design/mtf-mockup.html)) and rejected it as "a list of things inside a list of things", "inside a box", like the apps already on the market. The desk mockup ([design/mtf-mockup-desk.html](../../design/mtf-mockup-desk.html)) was approved. The product's point is freedom of placement plus a visible record of effort; a layout the app decides would remove both.

## Considered Options

- **Boards as tabs with a card grid (Google Keep style)**: rejected. Familiar and simple on phones, but it is the "box" the user wants to escape, and it makes MTF indistinguishable from existing apps.
- **Columns per board (Trello style)**: rejected. Too formal and workflow-like for a personal notepad; the user said tables make them lose interest.
- **A free canvas per board (boards still as tabs)**: rejected as the main model. Freer inside each board, but keeps the list-of-lists hierarchy.

## Consequences

- Gestures (pan, zoom, drag, press and hold) become core functionality and need real-browser tests (Playwright).
- Phones need care: one finger pans, press and hold drags, pinch zooms. A non-gesture path (the editor's Place selector) must always exist.
- Search and "fly to" navigation matter more than in a list UI, and a **Tidy up** action is needed for messy desks.
- Positions are stored per Card in Desk coordinates.
