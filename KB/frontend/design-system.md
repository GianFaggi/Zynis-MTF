---
area: design-system
description: Paper design tokens, fonts, Area colors and component rules for Zynis MTF
---

# Design system — Paper

The look is a calm paper desk: warm paper ground, soft serif titles, one quiet color per Area, and an accent color **reserved for wins** (checked Items, finished Cards, the Jar, Mis logros). Reference: [design/mtf-mockup-desk.html](../../design/mtf-mockup-desk.html).

It is deliberately different from Zynis Pulse's neon look: Pulse should feel energetic, MTF should feel calm.

## Tokens

Live in the `@theme` block of `src/index.css` (Tailwind v4). TypeScript never holds a hex value; components use `var(--color-*)` or Tailwind utilities.

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#F5F1EA` | `#1C1A18` | Desk ground |
| `sheet` | `#FCFAF6` | `#272421` | Cards, sheets |
| `ink` | `#2A2724` | `#ECE6DE` | Main text, FAB |
| `ink-2` | `#4A4540` | `#CFC7BD` | Card body text |
| `pencil` | `#766E66` | `#A39A90` | Secondary text, counts |
| `rule` | `#E3DCD1` | `#3A3530` | Hairlines, borders |
| `accent` | `#B85A3A` | `#E07B57` | Wins only: checks, chip, jar lid, chart today |
| `accent-ink` | `#9C4527` | `#EE9677` | Accent used as text |
| `sage` | `#6F8F6B` | `#93B28E` | Area: Trabajo |
| `sand` | `#B8914A` | `#D3AE68` | Area: Vida |
| `sky` | `#5F87AD` | `#86A9CB` | Area: Recordar |
| `plum`, `rose` | `#8E6C9C`, `#B86E7B` | `#B293C0`, `#D8909C` | Spare Area colors |

- Card fill = Area color mixed into `sheet` (`color-mix(in oklab, var(--b) 8%, var(--sheet))`, 11% in dark).
- Area region = soft radial gradient of the Area color, no border.
- A faint paper grain (SVG noise) moves with the Desk.

## Typography

- **Literata** (serif) — Card titles, Area labels (italic), wordmark `mtf` (italic), big numbers in Mis logros
- **Figtree** (sans) — everything else
- Both bundled via `@fontsource` (offline). Tabular numbers wherever digits line up.

## Rules

- **Color is information.** Area colors identify Areas; the accent means "you did something". Never use the accent for decoration or navigation.
- **No chrome bars.** Controls float on the paper (pill groups, dock, FAB); there is no header bar and no tab bar.
- **Positive copy only.** Celebrate, never scold ("Los días tranquilos también cuentan").
- Light and dark themes both designed; dark is warm charcoal, not pure black.
- Closed-API UI components in `src/components/ui/`: typed props and `children`, no free `className`, so screens can't override styles one by one (the same approach Zynis Pulse uses for its design system). Defined in change 1.
