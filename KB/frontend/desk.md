---
area: desk
description: Desk mechanics for Zynis MTF — coordinates, pan/zoom, drag, press-and-hold, Areas, far zoom and the Jar
---

# Desk

Reference implementation: [design/mtf-mockup-desk.html](../../design/mtf-mockup-desk.html) (vanilla JS mockup; the React version uses `@use-gesture/react` instead of hand-written pointer code). Why a DOM desk → [ADR 0003](../../docs/adr/0003-dom-desk-with-use-gesture.md).

## Coordinates

- **Desk coordinates** (world): where Cards, Areas and the Jar live. Stored in data. Independent of zoom and screen size.
- **Screen coordinates**: pixels on the device.
- View transform: `screen = world * s + (x, y)`; `world = (screen - (x, y)) / s`.
- The world `div` gets `transform: translate(x, y) scale(s)` with `transform-origin: 0 0`.
- Zoom range: `s` in `[0.08, 1.8]`.

## Gestures

| Action | Touch | Mouse / trackpad |
|---|---|---|
| Pan the Desk | one finger on empty paper | drag empty paper; two-finger scroll |
| Zoom | pinch (around the fingers' midpoint) | `Ctrl`/`Cmd` + wheel, trackpad pinch (around the cursor) |
| Move a Card | **press and hold ~320 ms**, then drag | drag after moving > 4 px |
| Open a Card | tap | click |
| Check an Item | tap its box (never starts a drag) | click |
| New Card | `+` button (center of view) | `+` button, or double-click empty paper |

- A touch that moves > 9 px before the hold timer fires becomes a **pan**, not a drag. This is what keeps scrolling the Desk natural on phones.
- Short vibration (`navigator.vibrate`) when a hold picks a Card up, where supported.
- While lifted: no tilt, scale 1.04, larger shadow, on top (`z` raised and persisted so the last moved Card stays on top).

## Areas

- Fixed regions of the Desk (MVP: Trabajo, Vida, Recordar side by side), drawn as soft radial tints with a large italic label and a Card count. Not containers: no borders, no clipping.
- A Card's Area is decided **on drop**, by the nearest Area center (horizontal). While dragging, the Card previews the target Area's color.
- Tapping an Area label flies the view to that Area.

## Far zoom (semantic zoom)

- Below `s < 0.55` Cards collapse to their **title only** (large serif), so a zoomed-out Desk reads like a map.
- A Card without a title shows its first text line, or its Items joined.

## The Jar

- Lives on the Desk below the middle Area; tapping it opens Mis logros.
- Dropping a Card whose center lands on the Jar:
  - **has unchecked Items** → refused: the Card slides back to where the drag started, toast "Todavía no · Te faltan N elementos".
  - **finished, or has no Items** → accepted: the Card shrinks into the Jar, a paper piece in the Area color drops in, sparks, toast, the wins counter bumps.
- Jarred Cards leave the Desk but are kept; Mis logros lists them with **Devolver** (take back out to their Area).

## Navigation helpers

- Dock: jump to each Area, the Jar, **See all** (fit the whole Desk), **Tidy up** (loose columns per Area, pinned first, then newest; animated).
- Search: dims non-matching Cards, outlines matches; `Enter` flies to the first match.
- Initial view: whole Desk if it fits at `s ≥ 0.34`, otherwise the first Area at a readable phone scale.
- `Esc` closes the open sheet.

## Accessibility

- Cards are focusable; `Enter` opens the editor. The editor's **Place** selector moves a Card to another Area without dragging; this is the non-gesture path and must always exist.
- `prefers-reduced-motion` disables fly-to animations, sparks and drops.
