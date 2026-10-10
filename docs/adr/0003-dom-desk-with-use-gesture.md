# Hand-made DOM desk with @use-gesture/react

The Desk is built by hand: Cards are ordinary React/HTML elements absolutely positioned inside a world `div` that is moved and scaled with a CSS `transform`. Gestures (drag, pinch, wheel, press and hold) are handled by `@use-gesture/react`. The approved mockup already proved that a DOM desk works and feels right; keeping Cards as real HTML means text editing, checkboxes, focus, screen readers and Tailwind all work normally. The library covers the part that is risky to write by hand: consistent gesture behavior across iOS/Android touch, mouse and trackpads (Safari pinch and wheel events, long press versus scroll).

## Considered Options

- **Fully hand-written pointer handling (as in the mockup)**: rejected. Zero dependencies, but every cross-device gesture edge case would be ours to find and fix.
- **React Flow (@xyflow/react)**: rejected. Gives pan/zoom/drag with React nodes, but it is designed for node-and-edge diagrams; we would fight its look and API, and the Jar and far zoom would still be custom.
- **tldraw**: rejected. A full whiteboard with its own visual language, much larger than needed, and production use requires a license.
- **Konva / PixiJS (pixel canvas)**: rejected. Fast for thousands of shapes, but text editing, checkboxes, accessibility and Tailwind styling would all have to be rebuilt.

## Consequences

- Performance is fine for hundreds of Cards; if a Desk ever holds thousands, virtualize off-screen Cards.
- Pure helpers (screen ↔ world conversion, nearest Area, Jar hit test, tidy layout) are unit-tested; real gestures are covered by Playwright.
- During a drag, the dragged element is updated directly and the store is written on drop, to avoid re-rendering the whole Desk every frame.
