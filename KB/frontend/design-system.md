---
area: design-system
description: Paper design tokens, fonts, Area colors and component rules for Zynis MTF
---

# Design system — Paper

The look is a calm paper desk: warm paper ground, soft serif titles, one quiet color per Area, and an accent color **reserved for wins** (checked Items, finished Cards, the Jar, Mis logros). Reference: [design/mtf-mockup-desk.html](../../design/mtf-mockup-desk.html).

It is deliberately different from Zynis Pulse's neon look: Pulse should feel energetic, MTF should feel calm.

## Tokens

Live in the `@theme static` block of `src/index.css` (Tailwind v4). TypeScript never holds a hex value; components use Tailwind utilities (`bg-paper`, `text-pencil`, `shadow-paper`) or `var(--color-*)`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#F5F1EA` | `#1C1A18` | Desk ground |
| `--color-sheet` | `#FCFAF6` | `#272421` | Cards, sheets |
| `--color-ink` | `#2A2724` | `#ECE6DE` | Main text, primary button, FAB, focus ring |
| `--color-ink-2` | `#4A4540` | `#CFC7BD` | Card body text, icon buttons |
| `--color-pencil` | `#766E66` | `#A39A90` | Secondary text, counts |
| `--color-rule` | `#E3DCD1` | `#3A3530` | Hairlines, borders |
| `--color-accent` | `#B85A3A` | `#E07B57` | Wins only: checks, chip, jar lid, chart today |
| `--color-accent-ink` | `#9C4527` | `#EE9677` | Accent used as text |
| `--color-on-accent` | `#FFFFFF` | `#1C1A18` | Text/icon on an accent fill |
| `--color-sage` | `#6F8F6B` | `#93B28E` | Area: Trabajo |
| `--color-sand` | `#B8914A` | `#D3AE68` | Area: Vida |
| `--color-sky` | `#5F87AD` | `#86A9CB` | Area: Recordar |
| `--color-plum`, `--color-rose` | `#8E6C9C`, `#B86E7B` | `#B293C0`, `#D8909C` | Spare Area colors |
| `--color-float` | `rgb(252 250 246 / .86)` | `rgb(39 36 33 / .86)` | Floating pills (with backdrop blur) |
| `--color-scrim` | `rgb(40 30 20 / .32)` | `rgb(0 0 0 / .5)` | Behind sheets |
| `--color-hover` | `rgb(70 50 30 / .07)` | `rgb(255 255 255 / .07)` | Hover, quiet fills, segmented track |
| `--color-danger` | `#B3261E` | `#F2948C` | Destructive actions |
| `--shadow-paper` | warm 2-layer | dark 2-layer | Cards, floating pills (`shadow-paper`) |
| `--shadow-lift` | warm, deep | dark, deep | A lifted (dragged) Card |
| `--animate-rise` | `rise .22s ease` | — | Sheets entering |

### How the theme switches

- Tokens are declared once in `@theme static`. A `@media (prefers-color-scheme: dark)` block inside `@layer base` redefines the **same** `--color-*` / `--shadow-*` variables on `:root` and sets `color-scheme: dark`. Utilities read `var(--color-*)`, so the whole UI follows the system theme live, with **no `dark:` variants** anywhere.
- **Not `@theme inline`**: `inline` writes the literal hex into each utility, so the dark override would have nothing to override.
- **`static`**: Tailwind normally emits only the variables it finds used in source. Area colors are picked at runtime from data (`var(--color-${area.color})`), which the scanner cannot see, so every token is always emitted.
- **`--color-*: initial`** removes Tailwind's default palette: `bg-red-500` does not exist, only Paper colors do.
- `index.html` has two `theme-color` metas (light `#F5F1EA`, dark `#1C1A18`) so the phone status bar matches.
- There is no manual light/dark toggle in the MVP.

- Card fill = Area color mixed into `sheet` (`color-mix(in oklab, var(--b) 8%, var(--sheet))`, 11% in dark).
- Area region = soft radial gradient of the Area color, no border.
- A faint paper grain (SVG noise) moves with the Desk.

## Typography

- **Literata** (serif) — Card titles, Area labels (italic), wordmark `mtf` (italic), big numbers in Mis logros
- **Figtree** (sans) — everything else
- Both bundled via `@fontsource` (offline). Tabular numbers wherever digits line up.
- Packages: `@fontsource-variable/literata` (normal + `wght-italic.css`) and `@fontsource-variable/figtree` (normal), imported in `src/main.tsx`. Variable fonts: one file per style covers every weight.
- Family names: `"Literata Variable"` and `"Figtree Variable"`.
  - `--font-display: 'Literata Variable', Georgia, 'Times New Roman', serif` → `font-display`
  - `--font-ui: 'Figtree Variable', system-ui, -apple-system, 'Segoe UI', sans-serif` → `font-ui` (also the `body` default)
- Only the `latin` and `latin-ext` files are precached for offline ([pwa.md](pwa.md)); other subsets fall back to Georgia / system-ui offline.

## UI components (`src/components/ui/`)

Closed API: typed props, no `className`, no accent color.

| Component | Props | Notes |
|---|---|---|
| `Button` | `children`, `onClick?`, `variant?: 'primary' \| 'quiet'` (default `quiet`), `type?`, `disabled?` | `primary` = ink fill, `quiet` = `hover` fill |
| `IconButton` | `label` (required), `icon: LucideIcon`, `onClick?`, `pressed?` | 38px round; `label` → `aria-label`; `pressed` → `aria-pressed` |
| `Segmented<T>` | `label`, `options: { value, label }[]`, `value`, `onChange` | `role="group"`; active option has `aria-pressed="true"` |
| `Sheet` | `open`, `onClose`, `title`, `closeLabel`, `children` | `div role="dialog" aria-modal` over a scrim (not `<dialog>`: jsdom lacks `showModal()`); bottom sheet on phones, centered from 720px; closes on Esc, close button and scrim press; focus moves in on open and back to the trigger on close |

UI components receive their texts as props (e.g. `closeLabel`); they do not read the i18n store.

## Rules

- **Color is information.** Area colors identify Areas; the accent means "you did something". Never use the accent for decoration or navigation — not even the focus ring (the mockup used accent there; the app uses ink).
- **No chrome bars.** Controls float on the paper (pill groups, dock, FAB); there is no header bar and no tab bar.
- **Positive copy only.** Celebrate, never scold ("Los días tranquilos también cuentan").
- Light and dark themes both designed; dark is warm charcoal, not pure black.
- Closed-API UI components in `src/components/ui/`: typed props and `children`, no free `className`, so screens can't override styles one by one (the same approach Zynis Pulse uses for its design system). Defined in change 1.
