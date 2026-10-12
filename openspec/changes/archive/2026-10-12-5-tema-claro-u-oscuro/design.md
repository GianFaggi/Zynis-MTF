# Design

## Context

- **Tokens** live once in `@theme static` in [src/index.css](../../../src/index.css). A `@media (prefers-color-scheme: dark)` block in `@layer base` redefines the same `--color-*` / `--shadow-*` variables and the three strength variables (`--card-tint`, `--area-tint`, `--paper-grain-opacity`) on `:root`, and sets `color-scheme: dark`. Utilities read `var(--color-*)`, so nothing else in the app knows about dark mode, and there are no `dark:` variants.
- **`index.html`** has two `theme-color` metas, light `#F5F1EA` and dark `#1C1A18`, each with a `media` query, so the status bar follows the system on its own.
- **The language** is the model to copy: `Language` in `src/types`, `loadLanguage` / `saveLanguage` in `src/lib/storage.ts` (unknown value → `null`), `language` / `setLanguage` in `appStore`, a `Segmented` in the Settings sheet in `App.tsx`, and an `App` effect that writes `<html lang>`.
- **Device settings** (`mtf_language`, `mtf_hint_seen`, `mtf_install_nudge_seen`) are separate keys, never in `mtf_data` or the Backup. `replaceData` only swaps `data`, so anything outside it survives an Import.
- **Tailwind 4.3.3.** `@custom-variant` with a block body that holds two `@slot` branches compiles as expected: checked in a scratch build, the values written once come out under both conditions.

## Goals / Non-Goals

**Goals:**
- The dark values stay written **once** in the source; adding the manual choice does not create a second copy that can drift.
- System, the default, renders exactly as today, from the first paint and with no JavaScript needed.
- No component changes, apart from the new selector in Settings.
- No hex value in TypeScript (design-system.md).

**Non-Goals:**
- No new palette and no change to any token value.
- No runtime change to the manifest (`theme_color`, `background_color`): browsers read it at install time only.

## Decisions

### 1. `data-theme` only for a manual choice
`<html>` carries `data-theme="light"` or `data-theme="dark"` when the user picked one, and **no attribute** under System. The CSS then reads:

- dark when `data-theme="dark"`, or
- dark when the system prefers dark **and** `data-theme` is not `"light"`.

Under System the page is exactly what it is today: the media query decides, before any script runs, and switches live with the device.
*Alternative*: JavaScript always writes the resolved theme (`light` / `dark`) and listens to `matchMedia` for System. Rejected: every user on a dark phone, the default case, would see a light first paint until the script runs. It also adds a listener that CSS already does for free.

### 2. One dark block, through a custom `dark` variant
`src/index.css` declares:

```css
@custom-variant dark {
  &:where([data-theme='dark']) { @slot; }
  @media (prefers-color-scheme: dark) {
    &:where(:not([data-theme='light'])) { @slot; }
  }
}
```

The current dark block becomes `:root { @variant dark { … } }` with the same lines (`color-scheme: dark`, the strength variables, the colors and shadows). Tailwind emits those lines under both branches, so the source keeps one copy. `:where()` adds no specificity, so the dark rules still win over the light `:root` by order, as today.

It redefines Tailwind's built-in `dark` variant instead of adding a new name. Then even a stray `dark:` utility would follow the user's choice rather than only the system. The rule against `dark:` utilities stays; this only removes a way for them to disagree.
*Alternatives*:
- Copy the dark block under a `[data-theme='dark']` selector. Rejected: two lists of ~30 values that have to be kept equal by hand.
- CSS `light-dark()` on each token. Rejected: it only takes colors, so the shadows and the strength percentages would still need a block, and it needs Safari 17.5, which cuts off older iPhones.

### 3. `Theme` type, storage and store, like the language
- `src/types/index.ts`: `export type Theme = 'system' | 'light' | 'dark'`.
- `src/lib/storage.ts`: `THEME_KEY = 'mtf_theme'`, `loadTheme(): Theme | null` (unknown or unreadable → `null`), `saveTheme(theme)`. These go through the same wrapped `read` / `write`, so a refused storage only logs.
- `appStore`: `theme: loadTheme() ?? 'system'`, and `setTheme(theme)` sets the state and saves it, mirroring `setLanguage`. `theme` lives outside `data`, so it never reaches `mtf_data`, the Backup, or `replaceData`.

`'system'` is stored too when the user picks it. The value is then explicit, and `loadTheme` treats a missing key and `'system'` the same.

### 4. `applyTheme` in `src/lib/theme.ts`
One function with the only DOM writes:

- `theme === 'system'` → remove `data-theme`. Otherwise → set it.
- **Status bar.** Each `meta[name="theme-color"]` keeps its original `content`, saved the first time in a `data-system-content` attribute.
  - Under Light or Dark, both metas get the chosen paper color, read with `getComputedStyle(document.documentElement).getPropertyValue('--color-paper')` right after the attribute is set. Both metas get it, so whichever one's `media` matches shows the same color.
  - Under System, each meta gets its original back, and its `media` query follows the device again.

  The hex values stay in `index.html` and `index.css`. If the computed value is empty (jsdom, which loads no CSS), the metas are left unchanged.

It is called in two places:
- **`main.tsx`**, before `createRoot(...).render`, with the stored theme. A manual choice is then in place before React's first commit, the same way `listenForInstall()` already runs there.
- **An `App` effect** on `theme`, next to the one that writes `lang`, for changes made in Settings.

*Alternative*: an inline script in `index.html` that reads `mtf_theme` before the CSS paints. Rejected for now: it would be a second place that reads `localStorage`, against the storage-layer rule, and a second copy of the value check. See Risks.

### 5. Selector in Settings
In `App.tsx`, right after the language block, the same layout: a small uppercase label (`t('theme')`) and `<Segmented label={t('theme')} options={…} value={theme} onChange={setTheme} />`. The options are built inside the component from `t('themeSystem')`, `t('themeLight')` and `t('themeDark')`, because unlike the language names they are translated. New keys in `es.ts` and `en.ts`:

| Key | es | en |
|---|---|---|
| `theme` | Tema | Theme |
| `themeSystem` | Sistema | System |
| `themeLight` | Claro | Light |
| `themeDark` | Oscuro | Dark |

`Segmented` already uses ink and sheet, never the accent.

### 6. Tests
- `storage.test.ts`: `loadTheme` returns the stored value, `null` when unset or unknown; `saveTheme` writes `mtf_theme`; a refused storage does not throw.
- `appStore.test.ts`: the default is `'system'`; a stored theme is used; `setTheme` updates the state and the key; it does not write `mtf_data`; `replaceData` keeps the theme.
- `theme.test.ts` (new): `applyTheme` sets and removes `data-theme`, and puts back the metas' original `content` under System.
- `App.test.tsx`: Settings shows the "Tema" group with System active; choosing Oscuro sets `data-theme="dark"` and writes `mtf_theme`; the English labels.
- `BackupSection.test.tsx`: an Export with the theme set to Dark has no theme in the file, mirroring the language test.
- `e2e/base-screen.spec.ts` with `colorScheme: 'light'`: choosing Oscuro makes the body background the dark paper and the `theme-color` the dark color, and both survive a reload. A second test with `colorScheme: 'dark'` checks that Claro gives the light paper.

## Risks / Trade-offs

- **[Risk] One frame of the system palette before a manual choice applies.** `main.tsx` is a deferred module, so a browser may paint once before it runs (for example Dark chosen on a light phone). → `applyTheme` runs before React renders, and the app shell is precached, so the gap is short. If it shows up on a real phone, a follow-up can add an inline head script, accepting the storage-layer exception.
- **[Trade-off] The install splash and the manifest stay paper.** A Dark user's installed app still opens on a light splash for a moment. The manifest is read at install time, and there is no API to change it. → Out of scope (proposal).
- **[Risk] iOS standalone status bar.** In an installed PWA, iOS reads the `theme-color` it finds at launch and may not repaint when the meta changes later. → Part of the manual phone check. The choice is still right after the next launch, because `main.tsx` applies it early.
- **[Risk] Tailwind changes how `@custom-variant` handles two branches.** → `npm run build` in CI compiles it, and the e2e test checks the dark paper in both directions.

## Migration Plan

Nothing to migrate. With no `mtf_theme`, the theme is System, which is today's behavior. Rollback is reverting the change; a leftover `mtf_theme` key is ignored by older code.
