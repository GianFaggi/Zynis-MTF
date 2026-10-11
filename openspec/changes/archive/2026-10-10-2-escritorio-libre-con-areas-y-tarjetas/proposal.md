# Proposal

## Why

After change 1, MTF opens to an empty paper screen with a welcome line: there is nowhere to write yet. Change 2 builds the Desk itself (one free surface with soft Areas, where Cards are written, moved and found) so that MTF is usable as a notepad on phone and PC. It is the base that the Jar (change 3) and Backup (change 4) build on.

## What Changes

- The base paper screen's welcome line is replaced by the **Desk**: one surface the user pans and zooms, with a faint paper grain that moves with it. **BREAKING** for the change-1 e2e tests that look for the welcome line.
- **Pan and zoom** on touch (one finger on empty paper, pinch) and on PC (drag empty paper, two-finger scroll, `Ctrl`/`Cmd` + wheel, trackpad pinch). When zoomed far out, Cards show only their title.
- **Default Areas** Trabajo / Vida / Recordar are created on first launch as soft colored regions with their name and Card count. Tapping a label flies to that Area. Every Desk behavior works over the stored list of Areas, whatever its length. Nothing assumes there are three, so custom Areas can follow as a small ticket.
- **Cards**: create (`+` button, or double-click on empty paper), edit in a sheet (title, text, checklist, pin), check Items directly on the Desk, and delete with a second-tap confirmation. A new Card left empty is discarded when the editor closes.
- **Move Cards** by dragging with the mouse, or on the phone by pressing and holding the Card for a moment. A quick swipe on a Card still pans. On drop the Card takes the Area it landed in (or the nearest one) and its color. The last Card moved stays on top.
- **Place** selector in the editor to move a Card to another Area without dragging. This is the non-gesture path.
- **Dock**: jump to each Area, **See all**, **Tidy up** (loose columns per Area, pinned first, then newest). **Search** dims non-matching Cards, outlines matches, and `Enter` flies to the first match.
- **First-run hint** explaining drag and press-and-hold, dismissed once per device.
- Positions, Areas and Cards are saved and come back after a reload.
- `@use-gesture/react` is installed (already chosen in stack.md and ADR 0003).
- Product decision recorded during this ticket: **custom Areas** (create, rename, recolor, delete) move from the V2 backlog to an MVP ticket of their own after this change.

### Acceptance criteria → scope

| Issue #2 criterion | Covered by |
|---|---|
| Desk with pan and zoom (pinch on phone, `Ctrl` + wheel or trackpad on PC); far away Cards show only the title | `desk`: pan, zoom, far zoom |
| Areas Trabajo / Vida / Recordar as soft colored zones with name and Card count | `desk`: default Areas, Area regions |
| Create, edit and delete Cards: title, text, checklist and pin | `cards`: create, edit, checklist, pin, delete |
| Drag Cards with the mouse, and on the phone by pressing and holding; on drop the Card takes the Area and its color | `cards`: move by dragging, Area on drop |
| "Lugar" selector in the editor to move a Card without dragging | `cards`: Place selector |
| Dock: go to each Area, See all and Tidy up; search that highlights and flies to the Card | `desk`: Dock, See all, Tidy up, search |
| Positions are saved and restored on reload | `cards`: the Desk survives a reload |
| Tests for the Desk functions (coordinates, nearest Area, tidy up) and Playwright tests for drag and zoom | Unit tests for the pure Desk helpers; Playwright for mouse drag, press-and-hold drag, wheel/pinch zoom, far zoom |

### Out of scope

- Win events, finished-Card styling, the Jar, Mis logros and the wins counter (change 3). Checking an Item here only marks it done; nothing is counted yet.
- Export / Import, persistent storage request, install guidance (change 4).
- Creating, renaming, recoloring, moving, resizing or deleting Areas (the new "Áreas propias" ticket, after this change).
- Remembering the last pan/zoom per device; reminders; sharing; anything needing a server (V2).

## Capabilities

### New Capabilities

- `desk`: the free surface itself: pan and zoom on touch and PC, far zoom, the Areas as soft regions, navigation (Dock, See all, Tidy up, initial view), search, and the first-run hint.
- `cards`: Cards on the Desk: creating, editing (title, text, checklist, pin), deleting, checking Items, moving them by drag or with the Place selector, the Area they take on drop, and keeping all of it across reloads.

### Modified Capabilities

- `app-shell`: the base paper screen now opens to the Desk instead of a welcome line.
- `i18n`: the language-switch scenario no longer refers to the welcome line, which no longer exists.

## Impact

- **New code**: `src/desk/` (pure Desk helpers, view state, Desk components), Card editor, Dock, search box, first-run hint; new store actions for Areas and Cards in `src/store/appStore.ts`; `mtf_hint_seen` in `src/lib/storage.ts`; new i18n keys; `Sheet` gains an Area tint and a header actions slot.
- **Changed tests**: `src/App.test.tsx` and `e2e/base-screen.spec.ts` drop the welcome line; new Playwright specs for drag, press-and-hold, zoom and far zoom.
- **Dependency**: `@use-gesture/react` (already in stack.md; no new library).
- **Data**: no schema change. `MtfData` v1 already has Area rects, Card positions, Items and `pinned`; default Areas are written into the existing `areas` list.
- **Docs**: desk.md, architecture.md, storage.md, design-system.md, testing.md, stack.md, roadmap.md (custom Areas moved into the MVP), GLOSSARY.md (Area sharpened, Place), `aprendizaje/use-gesture.md`.
