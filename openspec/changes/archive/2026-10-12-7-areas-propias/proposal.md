# Proposal

## Why

Today the Desk always has the same three Areas (Trabajo, Vida, Recordar), with fixed names, colors and places. The user's life does not fit in three fixed boxes. They want Areas of their own ("Facu", "Casa", "Proyecto X"), and they want to arrange the Desk by hand, as they would a real desk. Change 2 already built every Desk behavior on top of the stored list of Areas (`data.areas`), whatever its length. That makes this mostly UI and gesture work, with no schema change. It needs no server, so it moved from the V2 backlog to the MVP (#7).

## What Changes

- **Area editor**: a sheet for one Area with its name, its color (12 swatches) and **Borrar área**. Two ways open it:
  - a small edit button next to the Area's label on the Desk
  - the Area's row in a new **Áreas** section in Settings
- **Create**: **Nueva área** in the Areas section of Settings creates an Area at once:
  - Placement: the first free slot of a grid of 3 Areas per row, the same row the default Areas use. A slot is free when it overlaps no existing Area.
  - Name and color: a provisional name ("Área nueva" / "New area") and the first color no other Area uses.
  - Then Settings closes, the view flies to the new Area and the Area editor opens with the name selected.
- **Rename**: any Area, the three default ones included. A custom name is shown as typed in both languages. Clearing the name of a default Area brings back its translated name. A custom Area cannot be left without a name.
- **Recolor**: 12 Area colors. The 5 current ones (sage, sand, sky, plum, rose) plus 7 new tones (teal, olive, slate, indigo, turquoise, pine, berry), each with a light and a dark value. All of them, the current five included, are more saturated than before, and the Area and Card tints are a little stronger (asked by the user after seeing the first implementation). Colors may repeat between Areas. The Area's Cards (on the Desk and in the Jar) take the new color at once.
- **Move an Area**: drag it by its label. On a phone, press and hold for 320 ms first; with a mouse, drag after moving more than 4 px. These are the same rules as a Card.
  - A quick tap on the label still flies to the Area, and a quick swipe on it still pans.
  - The Area's Cards on the Desk travel with it. Other Areas' Cards are not touched.
- **Resize an Area**: drag the handle in its bottom-right corner, with a minimum size. The handle is shown at the near zoom, where the Cards show their full text. Cards do not move or change Area.
- **No overlapping Areas**: an Area moved or resized onto another Area slides back to where it was, with a toast. Nothing is saved.
- **Delete**: **Borrar área** asks for confirmation.
  - When the Area holds Cards (on the Desk or in the Jar), the confirmation asks where they go, with the nearest Area preselected. The Desk Cards move inside the chosen Area, the same way the Place selector moves one Card. The Cards in the Jar change Area, so their pieces take the new color.
  - The last Area cannot be deleted.
- **Everywhere**: the Dock, the Place selector, Tidy up, See all, the Jar's place and the initial view already read `data.areas`, so new, moved and resized Areas show up there with no extra rules. The Jar follows the Areas, because its place is derived from them.
- **Saved**: every edit replaces `data` once, with a new `updatedAt` on what it touches, and survives a reload. Moves and resizes are written once, on release, like a Card drag.

### Acceptance criteria → scope

| Issue #7 criterion | Covered by |
|---|---|
| Create a new Area with a name and a color; it appears in a free spot without overlapping the others | `areas`: Create an Area, New Area placement |
| Rename any Area, the default ones included; the custom name reads the same in Spanish and English | `areas`: Rename an Area; `desk`: Default Areas |
| Change an Area's color among the available colors; its Cards take the new color | `areas`: Recolor an Area, Area colors |
| Delete an Area with confirmation and a clear rule for its Cards; the last Area cannot be deleted | `areas`: Delete an Area, The user chooses where a deleted Area's Cards go, The last Area stays |
| The Dock, Place, Tidy up and See all include the new Areas | `desk`: Any number of Areas (already holds); `areas`: scenarios on created Areas |
| Changes are saved and restored after a reload | `areas`: Area edits are saved |
| Moving or resizing an Area stays out, unless the proposal decides otherwise | **Decided in**, at the user's request: `areas`: Move an Area, Resize an Area, Areas never overlap |
| Unit tests for the rules (free spot, delete and reassign Cards) + a Playwright test of create → rename → delete | tasks: `areas.test.ts`, `appStore.test.ts`, new `e2e/areas.spec.ts`, which also covers moving and resizing by gesture |

### Out of scope

- Free colors (a color picker) or a palette beyond the 12 Paper colors.
- Reordering Areas in the Dock by hand. The Dock follows the stored order: the default Areas first, then the custom ones in creation order.
- Resizing from any edge or corner other than bottom-right. Rotated or non-rectangular Areas.
- Undo for deleting an Area. The confirmation is the safeguard, as it is for a Card.
- Moving several Areas at once, and snapping Areas to a grid after the initial placement.
- Sharing an Area with someone (V2 backlog: it needs a server).

## Capabilities

### New Capabilities

- `areas`: managing the Desk's Areas. Covers the Area editor and its two entry points, creating (with free-slot placement), renaming, the color set and recoloring, moving by the label, resizing by the corner handle, the no-overlap rule, deleting with a chosen destination for the Cards, and saving all of it.

### Modified Capabilities

- `desk`: "Default Areas": the names follow the language unless the user renamed the Area, and the defaults are not created again once the user has deleted down to one Area. (Reduced motion for Area moves is part of `areas`, not a change to the Desk requirement.)
- `app-shell`: the Settings sheet also shows the Areas section.

## Impact

- **Code**:
  - `src/desk/areas.ts`: free slot, overlap, minimum size, nearest Area for a delete, next unused color, name rules
  - `src/desk/intent.ts`: a press on a label can become an Area drag
  - `src/desk/Desk.tsx`: Area drag and resize through the one gesture controller; DOM-only while moving, as for Cards
  - `src/desk/AreaRegion.tsx`: edit button, resize handle
  - a new `src/desk/AreaEditor.tsx` and a Settings `AreasSection`
  - `src/store/appStore.ts`: `createArea`, `renameArea`, `recolorArea`, `moveArea`, `resizeArea`, `deleteArea`
  - `src/desk/deskStore.ts`: the open Area editor
  - `src/types/index.ts` and `src/backup/validate.ts`: the 3 new colors
  - `src/index.css`: 3 new tokens, light and dark
  - new ES/EN strings
- **Data**: no schema change and no migration. `Area` already has an optional `name`, an optional `key` and a `rect`; the color union grows. A Backup made by this version with a new color is refused by an older MTF, which is acceptable: the Backup moves data between devices running the same app.
- **Docs**: a new ADR (Areas become editable, movable regions, and their Cards travel with them); updates to GLOSSARY (Area, Area editor), `KB/frontend/desk.md`, `design-system.md`, `storage.md` and `roadmap.md`.
- **Dependencies**: none.
