# Design

## Context

See `proposal.md` for the why and the scope. The facts below are the ones that shape the approach.

- **Card content today** is `title`, `body` and `items` (`src/types/index.ts`). `isEmptyCard` and `displayTitle` (`src/desk/cardText.ts`) decide when a Card is blank and how it is named on one line. `DeskCard.tsx` renders a Card at a fixed 236 px width. `CardEditor.tsx` (`EditorBody`) is a column: title input, text area, Items, "Añadir elemento", then the Place / Jar / Delete / Save row.
- **Every store action copies the Card** with `{ ...card, ...patch }` (`src/store/appStore.ts`), and the Backup check keeps unknown fields (`src/backup/validate.ts`). So a field this version adds is carried, not dropped, by a device still on the previous version.
- **Sync records are opaque and carry no schema version** (`src/sync/records.ts`, ADR 0012). A Card record is the whole `Card` object. A device on an older deploy can push a Card without any new field at any time, so this version must read a Card without the field no matter what `SCHEMA_VERSION` says.
- **Sheets are outside the Desk.** `CardEditor` is mounted by `App`, not inside the Desk's `useGesture` element. `Sheet` closes on an outside tap only when the press both starts and ends on the scrim, so a stroke that starts in the sheet never closes it.
- **The Desk treats `pen` as `mouse`** (`src/desk/intent.ts`: drag after 4 px). Nothing in this change touches that.
- **Limits that handwriting meets:** localStorage ~5 MB for the whole `mtf_data`; Backup files up to 5 MB; sync push chunks of 512 KB (server limit 1 MB); the leave send is one `keepalive` fetch only up to 60 KB, else ordinary pushes.

## Goals / Non-Goals

**Goals:**
- One storage format for handwriting that is small, exact, theme-aware and the same on every screen.
- Drawing that feels immediate with a Pencil (coalesced points, no store write per move).
- Zero effect on Desk gestures, on devices that keep the setting off, and on Cards without handwriting.

**Non-Goals:**
- Handwriting recognition, colors, widths, selection or moving strokes, or zooming inside the box.
- A pen mode on the Desk.
- Partial (pixel) erasing: the eraser removes whole strokes.

## Decisions

### D1. The box lives in the editor, never on the Desk

The handwriting box is a block in `EditorBody`, between the text area and the Items. Writing on the Card on the Desk was rejected: with a graphics tablet the pen *is* the pointer, so a pen press on the Desk cannot mean both "move this Card" and "write". Keeping it in the sheet also means the Desk's gesture code needs no change at all. "A mano" sits beside "Añadir elemento", with the same quiet dashed-box look.

### D2. `Card.ink` is optional; no schema bump

```ts
interface Ink {
  height: number          // box height in ink units; the width is always INK_WIDTH (1000)
  strokes: number[][]     // each stroke is flat [x, y, p, x, y, p, ...], all integers
}
interface Card { /* … */ ink?: Ink }
```

A missing `ink` means no handwriting. A Card never stores `ink` with zero strokes: `closeCard` removes it, the way it drops blank Items.

**Why no `SCHEMA_VERSION` bump.** A bump would make an older MTF refuse a new Backup as "newer". But sync cannot enforce versions anyway (records carry none), so the reading side must accept a Card without `ink` regardless. With the bump we would pay for a migration that does nothing and get a refusal we do not need. It also follows the pattern of every change since #7, which all added optional fields with no bump. ADR 0013 records this, and the format, since both are hard to change once Cards with handwriting exist on several devices.

**Alternatives considered:**
- **A PNG data URL:** 50–200 KB per Card, blurry when zoomed in, fixed color (breaks the dark theme), and no stroke erasing or undo. Rejected.
- **Nested points `[[x, y, p], …]`:** about 30% bigger in JSON for the same data. Rejected.
- **A delta-encoded string:** about 40% smaller, but opaque to read and debug, and the limit (D7) already bounds the size. Rejected for now. Because `ink` is versionless, switching later would need a new field name, which is the hard-to-reverse part ADR 0013 notes.

### D3. Box coordinates, so handwriting is the same on every screen

Points are stored in a box that is always 1000 units wide (`INK_WIDTH`). `x` is 0–1000, `y` is 0–`height`, both rounded to integers and clamped to the box (a stroke that leaves the box keeps drawing along its edge). `p` is pressure 0–100. A device that reports no real pressure (mouse, finger, or a pen reporting 0) gets 50, so its stroke has an even thickness. The box renders as an SVG with `viewBox="0 0 1000 {height}"` at 100% width, so the same handwriting fits a 600 px editor, a 340 px phone sheet and a 206 px Card.

- New box: `height` 400 (2.5 : 1).
- Grows: when a stroke ends with any point below `height - 120`, `height += 250`, up to `INK_MAX_HEIGHT` 2500. Existing strokes keep their coordinates (growing only adds room below).
- Kept points: a pointer move closer than 2 units to the last kept point is skipped. On stroke end the stroke is simplified (Ramer–Douglas–Peucker, tolerance ~0.8 unit on x/y). This keeps a typical handwritten line at about 1–2 KB.

### D4. Drawing: own Pointer Events, commit on stroke end

The box (`src/ink/InkBox.tsx`) handles raw Pointer Events itself. `@use-gesture` is built for drag/pinch of elements; here we need one pointer, `pointerType`, `pressure`, `buttons` (the eraser end) and `getCoalescedEvents()` (the Pencil reports ~240 Hz, the browser delivers ~60 events/s, and coalesced events recover the in-between points so curves stay round).

- `pointerdown` in the box: decide whether this pointer draws (D5). If it does, `preventDefault()` (no text selection, no iOS callout) and `setPointerCapture`, so the stroke keeps receiving moves after leaving the box and nothing underneath reacts. The box has `touch-action: none`, `user-select: none` and `-webkit-touch-callout: none`.
- `pointermove`: append the coalesced points to a ref, and redraw the live stroke in a `requestAnimationFrame`. No store write per move, as with Desk drags.
- `pointerup`: simplify, then `appStore.setInk(cardId, nextInk)` writes once: one `data` replacement, saved by the storage layer and recorded by the sync outbox like any edit. `pointercancel` drops the live stroke.
- One stroke at a time. A second pointer while one is drawing is ignored, except a pen arriving during a finger stroke (D5).

**Store API:** `setInk(id, ink: Ink | null)`. `null` removes the field. `closeCard` removes an `ink` with no strokes. `isEmptyCard` treats `ink?.strokes.length > 0` as content.

### D5. The finger draws until a pen is seen

The box keeps a `penSeen` flag in component state. It resets when the editor closes, because `EditorBody` is keyed by Card and unmounts. The rules, in `src/ink/input.ts` (pure, unit-tested):

| Pointer | `penSeen` false | `penSeen` true |
|---|---|---|
| pen | draws, sets `penSeen` | draws |
| mouse | draws | draws |
| touch | draws | ignored (no `preventDefault` either) |

A pen `pointerdown` while a touch stroke is live discards that stroke, because the palm usually lands a moment before the Pencil. iPadOS already rejects most palm touches while the Pencil is in use. This rule covers the ones that get through. The flag is per editor, not per device: a phone never sees a pen, and an iPad turns it on with the first Pencil touch.

### D6. Undo, eraser, clear: snapshots in the box

The box holds an undo stack of previous `Ink` values (at most 50) for the editor session. Every committed action (stroke, erase pass, clear) pushes the value before it and calls `setInk`. Undo pops and calls `setInk` with the popped value. Snapshots are cheap: `strokes` arrays are immutable and shared between snapshots.

- **Eraser:** a mode toggle (`aria-pressed`). In eraser mode, or for a pen whose `buttons & 32` is set (the eraser end of a Wacom-style pen; this needs no mode change), the pointer path is hit-tested against each stroke's polyline (point-to-segment distance under 14 units). Strokes it touches disappear live, and one `setInk` commits on `pointerup` as one undo step.
- **Borrar todo:** the editor's second-tap pattern ("¿Borrar todo? Tocá otra vez"). Any other action, or drawing, resets it.
- The Apple Pencil's double tap and squeeze are not exposed to the web, so on the iPad the eraser is the button.

### D7. A size limit per Card

`INK_MAX_POINTS` = 12 000 points (about 150 KB of JSON at the worst, usually far less after D3's simplification). A stroke that would pass it is dropped on `pointerup`, and the box shows "Esta escritura está completa" until something is erased. Why a limit: one runaway Card could otherwise eat the shared 5 MB localStorage and push every Card's save past quota. A Card at the limit still fits sync's 512 KB chunks.

### D8. Rendering with perfect-freehand, memoized

`perfect-freehand` turns a list of `[x, y, pressure]` points into the outline of a variable-width stroke. We fill that outline as an SVG `<path>` with `fill: currentColor`, and the box and Card set `color` to the ink token, so the color follows the theme. Options: `size` 7 units, `thinning` 0.6, `smoothing` 0.5, `streamline` 0.4, `simulatePressure: false` (our `p` is real or a flat 50).

- `inkPaths(ink)` (`src/ink/render.ts`) returns the `d` strings and is cached in a `WeakMap` keyed by each stroke array. A Desk with many handwritten Cards computes each outline once, and pan/zoom only moves the world `div`.
- `InkView` (`src/ink/InkView.tsx`) is the read-only SVG used by `DeskCard`: `max-height` 180 px with a bottom fade mask when the handwriting is taller. In the far look, a Card whose `displayTitle` is empty and has `ink` shows `InkView` filling the Card instead of the empty title.
- Naming: `cardText.ts` gains `hasInk(card)`. Callers that fall back to `t('card')` (`DeskCard` aria-label, the `MisLogros` Jar list) use `t('handwriting')` first when `hasInk`.

**Why perfect-freehand** (against `KB/frontend/stack.md`'s "justify before adding"): MIT, zero dependencies, ~2 KB gzipped, a pure function (no DOM, easy to test), and the standard solution for pressure-sensitive ink (tldraw and Excalidraw use it). Alternatives:
- **A constant-width SVG polyline:** no library, but loses pressure, which is the point of a Pencil.
- **Writing the outline algorithm ourselves:** about 200 lines of geometry to maintain for no gain.
- **Canvas 2D instead of SVG:** pixel-based, so it needs redrawing on zoom and theme change. SVG scales for free inside the Desk's CSS transform.

### D9. The setting is a device key

`mtf_handwriting` is `'1'` or `'0'`, missing reads as off. It works exactly like `mtf_area_jars`: `loadHandwriting()` / `saveHandwriting()` in `src/lib/storage.ts`, `appStore.handwriting` + `setHandwriting`, and a `Segmented` No / Sí row "Escritura a mano" in Settings right after Tema. It is not in `mtf_data`, so Backup, Import and sync ignore it with no code.

### D10. Sync and Backup need no new code paths

- **Sync:** `ink` rides inside the Card record. Merge, held records for the open Card (an incoming change to the Card being written in waits until the editor closes) and tombstones all work per Card already. A Card over ~60 KB makes the leave send fall back to ordinary pushes (existing behavior).
- **Backup:** `isCard` gains an optional `ink` check: when present, an object with `height` an integer in 1–`INK_MAX_HEIGHT` and `strokes` an array of number arrays, each with length a multiple of 3 and at least 3, with finite numbers only. Points outside the box are not refused (the renderer clamps). Round trip stays exact.

### D11. Glossary

`GLOSSARY.md` gains **Handwriting** (ES "Escritura a mano"): ink a user writes by hand in a Card's handwriting box, kept as drawn, never as text. _Avoid_: drawing, sketch, canvas, ink (in UI copy). The code calls it `ink`.

## Risks / Trade-offs

- **An older deploy deletes a handwriting-only Card when its editor closes** (its `isEmptyCard` does not know `ink`). → The window is short: the PWA updates on the next launch, and the user deploys both. ADR 0013 notes it. Cards with any text are safe on an older deploy (the field is kept by `...card`).
- **A graphics tablet on macOS may report `mouse`, not `pen`.** → The mouse draws too, so writing works; only pressure and the eraser end are lost there. Checked on a real device during apply (task).
- **Leave send over 60 KB.** → A large Card falls back to ordinary pushes on leave. If the page dies first, the change stays pending in `mtf_sync` and goes on the next launch (existing guarantee: nothing is lost). Covered by an engine test with a big Card.
- **Storage pressure.** → D7 caps each Card. The existing quota handling (log, keep working in memory) still applies.
- **jsdom has no `setPointerCapture`, `getCoalescedEvents` or real pressure.** → The logic lives in pure modules (`input.ts`, `geometry.ts`, `erase.ts`, `render.ts`) with unit tests. Component tests stub capture. Playwright draws with the mouse and touch. A pen is simulated through Chromium's CDP `Input.dispatchMouseEvent` with `pointerType: 'pen'`, since Playwright has no pen API.
- **Performance with many handwritten Cards.** → Memoized outlines (D8) and the point limit (D7). If a Desk ever feels slow, far-zoom Cards could skip rendering ink, a local change.

## Migration Plan

No data migration. Deploy as usual. Rollback: an older deploy keeps `ink` fields untouched, but can delete handwriting-only Cards when their editor closes (see Risks), so roll back only together with a Backup.

## Open Questions

- Exact feel constants (`size`, `thinning`, growth step, eraser radius, fade height) are tuned on the iPad and on a tablet during apply. They do not change specs or tasks.
