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
| `--color-accent-soft` | `color-mix(in oklab, accent 14%, paper)` | (follows) | Soft accent fill: wins counter, finished-Card chip |
| `--color-bar` | `color-mix(in oklab, accent 30%, rule)` | (follows) | Past days in the Mis logros chart |
| `--color-glass` | `rgb(255 255 255 / .45)` | `rgb(255 255 255 / .05)` | The Jar's glass and neck |
| `--color-sage` | `#5F9460` | `#8FC289` | Area color; Trabajo by default |
| `--color-sand` | `#C29236` | `#E2B55A` | Area color; Vida by default |
| `--color-sky` | `#4C84C2` | `#7DB0E6` | Area color; Recordar by default |
| `--color-plum`, `--color-rose` | `#8F5CAB`, `#C45A82` | `#BB88D6`, `#EC88A8` | Area colors |
| `--color-teal`, `--color-olive`, `--color-slate` | `#2F8F86`, `#858C32`, `#5D7193` | `#5CC3B7`, `#BFC866`, `#92A8CC` | Area colors (added in #7) |
| `--color-indigo`, `--color-turquoise`, `--color-pine`, `--color-berry` | `#5B62C7`, `#2595B3`, `#34875A`, `#AD4688` | `#979CF2`, `#5BC6E2`, `#6CC690`, `#E477BD` | Area colors (added in #7) |
| `--color-float` | `rgb(252 250 246 / .86)` | `rgb(39 36 33 / .86)` | Floating pills (with backdrop blur) |
| `--color-scrim` | `rgb(40 30 20 / .32)` | `rgb(0 0 0 / .5)` | Behind sheets |
| `--color-hover` | `rgb(70 50 30 / .07)` | `rgb(255 255 255 / .07)` | Hover, quiet fills, segmented track |
| `--color-danger` | `#B3261E` | `#F2948C` | Destructive actions |
| `--shadow-paper` | warm 2-layer | dark 2-layer | Cards, floating pills (`shadow-paper`) |
| `--shadow-lift` | warm, deep | dark, deep | A lifted (dragged) Card |
| `--animate-rise` | `rise .22s ease` | — | Sheets and toasts entering |
| `--animate-drop` | `drop .6s` (from `translateY(-190px)`) | — | A paper piece falling into the Jar |
| `--animate-bump` | `bump .5s ease` (scale 1.14 at 30%) | — | The wins counter on each new Win |
| `--animate-spark` | `spark .75s … forwards` (to `translate(var(--dx), var(--dy)) scale(.4)`, opacity 0) | — | One spark of a celebration (`src/wins/sparks.ts`) |
| `--animate-pop` | `pop .6s` (scale 1.06 at 35%, a fading accent glow) | — | A Card just finished by checking its last Item (`data-celebrate`); uses `scale`, not `transform`, so it never fights the tilt or a drag |
| `--animate-stamp` | `stamp .45s`, 0.12 s delay (from `scale(2.2)`, faded, `rotate(-30deg)`) | — | The finished Card's seal landing on its corner |

**Area colors.** There are 12, listed in swatch order by `AREA_COLORS` in `src/desk/areas.ts` (sage, sand, sky, plum, rose, teal, olive, slate, indigo, turquoise, pine, berry); `AreaColor` in `src/types` is the same union. The user picks one per Area in the Area editor, and two Areas may share one. None of them is the accent, which stays reserved for wins: there is no orange, and rose and berry lean pink and magenta, away from the terracotta. During #7, after seeing the Desk, the user asked for **more colors and stronger ones**: the palette went from 8 to 12 (indigo, turquoise, pine and berry fill the empty parts of the hue wheel) and every Area color, the original five included, got more saturated in both themes, together with stronger `--card-tint` and `--area-tint`. Checked on a Desk with 12 Areas in light and dark (tint, label, Card, Jar piece, swatch). Hex values live only in `src/index.css`, never in TypeScript.

`--color-accent-soft` and `--color-bar` are built with `var()` from other tokens, so the dark block needs no lines for them: they follow the dark `accent`, `paper` and `rule` on their own. Lightning CSS adds a static light fallback before each one for browsers without `color-mix`.

An animation restarts when its element remounts: the wins counter keys its number by `deskStore.winsBump`, so each bump is a new element and the keyframe plays again, with no timers. The global reduced-motion rule (`animation: none`, `transition: none`) covers every keyframe above; JS-timed effects (sparks, the Jar drop waits) check `prefersReducedMotion()` from `src/desk/dom.ts`.

### How the theme switches

The user picks **Sistema · Claro · Oscuro** in Settings (change 5); System is the default. The choice is the device setting `mtf_theme` ([storage.md](storage.md#keys)), held in `appStore.theme`.

- Tokens are declared once in `@theme static`. One block in `@layer base`, `:root { @variant dark { … } }`, redefines the **same** `--color-*` / `--shadow-*` variables and the strength variables, and sets `color-scheme: dark`. Utilities read `var(--color-*)`, so the whole UI switches with **no `dark:` variants** anywhere.
- **The `dark` custom variant.** `src/index.css` redefines Tailwind's `dark` variant with two branches:
  - `:root:where([data-theme='dark'])` — the user chose Dark;
  - `@media (prefers-color-scheme: dark)` + `:root:where(:not([data-theme='light']))` — the device prefers dark and the user did not choose Light.

  Tailwind emits the block's lines under both branches, so the dark values are written **once** in the source and cannot drift between two copies. `:where()` adds no specificity, so the dark rules win over the light `:root` by order. Redefining the built-in name (not a new one) means even a stray `dark:` utility would follow the user's choice; the rule against `dark:` utilities stays.
- **`data-theme` only for a manual choice.** Under System `<html>` has no attribute: the media query alone decides, before any script runs, and switches live with the device. So a phone in dark mode never gets a light first paint. Light and Dark set `data-theme="light"` / `"dark"`.
- **`applyTheme(theme)`** in `src/lib/theme.ts` holds the only DOM writes. `main.tsx` calls it before React renders (a stored Light or Dark is in place before the first commit), and an `App` effect calls it on every change. A deferred module can still let the browser paint one frame of the system palette first; if that shows on a phone, the fix is an inline head script (a storage-layer exception), not done yet.
- **Status bar.** `index.html` has two `theme-color` metas (light `#F5F1EA`, dark `#1C1A18`), each with a `media` query, so under System the status bar follows the device on its own. `applyTheme` saves each meta's original `content` in `data-system-content` the first time; under Light or Dark it sets **both** metas to the computed `--color-paper` (so whichever `media` matches shows the chosen paper); under System it puts the originals back. No hex value lives in TypeScript. An empty computed value (jsdom, no CSS) leaves the metas alone.
- The install splash and the manifest's `theme_color` / `background_color` stay light paper: browsers read them at install time only ([pwa.md](pwa.md#manifest)).
- **Not `@theme inline`**: `inline` writes the literal hex into each utility, so the dark override would have nothing to override.
- **`static`**: Tailwind normally emits only the variables it finds used in source. Area colors are picked at runtime from data (`var(--color-${area.color})`), which the scanner cannot see, so every token is always emitted.
- **`--color-*: initial`** removes Tailwind's default palette: `bg-red-500` does not exist, only Paper colors do.
- *Rejected*: copying the dark block under a `[data-theme='dark']` selector (two lists of ~30 values kept equal by hand); CSS `light-dark()` per token (colors only, so the shadows and strength percentages would still need a block, and it needs Safari 17.5).

### Area paint

Components set the Area color as the custom property `--b` (`var(--color-sage)`, built from data) and paint with four `@utility` rules in `src/index.css`. They are named utilities because the gradients, the SVG and the halo read too poorly as arbitrary values.

| Utility | What | Strength variable (light / dark) |
|---|---|---|
| `card-tint` | Card and editor fill: `color-mix(in oklab, var(--b) var(--card-tint), var(--color-sheet))` | `--card-tint` 10% / 14% (8% / 11% before #7) |
| `area-tint` | Area region: soft, slightly irregular radial gradient of `--b`, no border | `--area-tint` 17% / 14% (13% / 10% before #7); `--tint-boost` 1.7 while lifted |
| `paper-grain` | Faint SVG noise, 220 px tiles. Painted once on its own layer, one tile larger than the screen; the Desk moves it with a `transform` by the pan modulo 220 px, so panning never repaints it. It does not scale with the zoom: resizing the SVG noise every frame was ~85% of the paint work while moving (measured in change 2) | `--paper-grain-opacity` 0.05 / 0.07 |
| `card-won` | A finished Card (`data-finished:card-won`): the Area tint warmed with 10% accent, a 1.5 px border at 70% accent, and a 4 px halo at 12% accent drawn as `::after` (inset −5.5 px, radius 18 px), so it never fights the Card's own shadows (lifted, search hit) or the ink focus ring | — |

The strength variables live on `:root` in `@layer base` (they are not theme colors, so not in `@theme`) and the dark block redefines them.

Other Desk paint, as arbitrary values in the components: Card border `color-mix(in oklab, var(--b) 18%, transparent)`; Area label `color-mix(in oklab, var(--b) 75%, var(--color-ink))`. A dragged Card previews its new Area through `--b-preview` (the Card's `--b` is `var(--b-preview, var(--color-…))`), so the drag code never touches a style React owns.

**Search** outlines matching Cards with a 3 px **ink** ring and dims the rest to 18%. The mockup used the accent there; the app does not, because the accent is reserved for wins.

**Where the accent is allowed** (change 3) — only on things the user did:

| Place | How |
|---|---|
| A checked Item's box | `accent` fill, `on-accent` check |
| A finished Card | `card-won` (warm fill, accent border and halo); its title, near and far, in `accent-ink`; the "Llevala al frasco" chip filled (`accent` fill, `on-accent` text, `JarIcon`) in place of `n/m`; a 34 px `accent` seal with a check, tilted −12°, on its top-right corner (also when zoomed out). Nothing on it fades: the mockup's 62% fade read as "switched off" on a real phone (change 3, decision 12) |
| The Jar | lid `color-mix(in oklab, accent 70%, ink)`; the label number in `accent-ink`; `data-over` outline in `accent` while a Card is over it |
| The wins counter | `accent-soft` pill, `accent-ink` star and number |
| Mis logros | the big number in `accent-ink`; today's bar in `accent` (past bars `bar`); today's weekday initial in `accent-ink` |

Everything else stays ink, pencil and paper: the Dock (its "Frasco" button included), the editor's "Llevar al frasco" button, toasts and the rest of Mis logros.

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
| `Button` | `children`, `onClick?`, `variant?: 'primary' \| 'quiet' \| 'danger'` (default `quiet`), `type?`, `disabled?`, `pressed?` | `primary` = ink fill, `quiet` = `hover` fill (ink fill when `pressed`), `danger` = danger text, no fill. `pressed` → `aria-pressed`, for toggles such as the editor's Pin. `danger` and `pressed` were added in change 2; a pressed toggle uses ink, never the accent |
| `Callout` | `message`, `actions: { label, onClick }[]` | The ink note above the Dock (bottom 84 px + safe area): ink fill, paper text, small buttons with a 16% paper fill. `role="note"`. Moved out of `FirstRunHint` in change 4, so the install nudge shares it |
| `IconButton` | `label` (required), `icon: LucideIcon`, `onClick?`, `pressed?` | 38px round; `label` → `aria-label`; `pressed` → `aria-pressed` |
| `Segmented<T>` | `label`, `options: { value, label }[]`, `value`, `onChange` | `role="group"`; active option has `aria-pressed="true"` |
| `Sheet` | `open`, `onClose`, `title`, `closeLabel`, `children`, `tint?: AreaColor`, `actions?: ReactNode`, `hideTitle?: boolean`, `wide?: boolean` | `div role="dialog" aria-modal` over a scrim (not `<dialog>`: jsdom lacks `showModal()`); bottom sheet on phones, centered from 720px; closes on Esc, close button and scrim press; focus moves in on open and back to the trigger on close. `tint` fills the panel with `card-tint` in that Area color; `actions` render in the header before the close button; `hideTitle` keeps the `h2` for screen readers only (`sr-only`), so the dialog is still named. Change 2 added `tint`, `actions` and `hideTitle` for the Card editor; change 3 added `wide` (panel `min(880px, 100%)`) for Mis logros |
| `Toast` | `message: { id, title, detail? } \| null` | Fixed pill above the Dock (bottom 92 px + safe area), ink fill and paper text, title in Literata 16 px, detail 13 px; enters with `animate-rise`, keyed by `id`. A `role="status" aria-live="polite"` region that is **always mounted** (empty when `null`) so screen readers announce each message; `pointer-events: none`. Added in change 3; `App` renders it from `deskStore.toast` |

UI components receive their texts as props (e.g. `closeLabel`); they do not read the i18n store.

Feature pieces that use the accent live outside the kit, which never does: `ItemCheck` in `src/desk/` (an Item's 19 px box with a widened touch target; checked = accent fill), shared by `DeskCard` and `CardEditor`; and the Win components in `src/wins/` (`Jar`, `WinsCounter`, `WinsChart`, `MisLogros`, `JarIcon`).

## Rules

- **Color is information.** Area colors identify Areas; the accent means "you did something". Never use the accent for decoration or navigation — not even the focus ring (the mockup used accent there; the app uses ink).
- **No chrome bars.** Controls float on the paper (pill groups, dock, FAB); there is no header bar and no tab bar.
- **Positive copy only.** Celebrate, never scold ("Los días tranquilos también cuentan").
- Light and dark themes both designed; dark is warm charcoal, not pure black. The user can follow the system or pick one in Settings.
- Closed-API UI components in `src/components/ui/`: typed props and `children`, no free `className`, so screens can't override styles one by one (the same approach Zynis Pulse uses for its design system). Defined in change 1.
