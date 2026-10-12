# Tasks

## 1. Theme setting: type, storage and store

- [x] 1.1 Add `export type Theme = 'system' | 'light' | 'dark'` to `src/types/index.ts`; verify `command npm run build` type-checks
- [x] 1.2 Add `THEME_KEY = 'mtf_theme'`, `loadTheme(): Theme | null` (unknown value → `null`) and `saveTheme(theme)` to `src/lib/storage.ts`, through the wrapped `read` / `write`; verify in `storage.test.ts`: each of the three values round-trips, unset and `'sepia'` → `null`, a throwing `localStorage` neither throws nor breaks the return
- [x] 1.3 Add `theme: loadTheme() ?? 'system'` and `setTheme(theme)` to `appStore`, mirroring `setLanguage`; verify in `appStore.test.ts`: default `'system'`, a stored `'dark'` is used, `setTheme('light')` updates the state and `mtf_theme`, it does not write `mtf_data`, and `replaceData` keeps the theme
- [x] 1.4 Add `mtf_theme` to the Keys table and `loadTheme` / `saveTheme` to the API table in [KB/frontend/storage.md](../../../KB/frontend/storage.md), and name the theme among the device settings left out of the Backup; verify every function named exists in `src/lib/storage.ts`

## 2. Paint: one dark block for System and Dark

- [x] 2.1 In `src/index.css`, declare `@custom-variant dark` with the two branches (`[data-theme='dark']`, and `prefers-color-scheme: dark` without `[data-theme='light']`), and move the dark values from the `@media` block into `:root { @variant dark { … } }` with no value changed; update the header comment; verify `command npm run build` passes and the built CSS has the dark `--color-paper` under both the `data-theme` selector and the media query
- [x] 2.2 Write `src/lib/theme.ts` with `applyTheme(theme)`: set or remove `data-theme` on `<html>`; save each `theme-color` meta's original `content` in `data-system-content` the first time; under Light / Dark set both metas to the computed `--color-paper` (leave them alone when it is empty); under System put the originals back. Verify in `theme.test.ts`: `'dark'` sets the attribute, `'system'` removes it, and the metas get their original `content` back after a manual theme
- [x] 2.3 Call `applyTheme(useAppStore.getState().theme)` in `src/main.tsx` before `createRoot(...).render`, and add an `App` effect on `theme` next to the `lang` effect; verify in `App.test.tsx` that a stored `'dark'` gives `data-theme="dark"` after render
- [x] 2.4 Rewrite "How the theme switches" in [KB/frontend/design-system.md](../../../KB/frontend/design-system.md): the `dark` custom variant and why (one copy of the dark values, no light first paint under System), `data-theme` only for a manual choice, how `applyTheme` handles the `theme-color` metas, and remove "There is no manual light/dark toggle in the MVP"; update the `theme-color` line in [KB/frontend/pwa.md](../../../KB/frontend/pwa.md); verify the KB matches `src/index.css`

## 3. Selector in Settings

- [x] 3.1 Add the `theme`, `themeSystem`, `themeLight` and `themeDark` keys to `src/i18n/locales/es.ts` and `en.ts` (Tema / Sistema / Claro / Oscuro, Theme / System / Light / Dark); verify the i18n test that both dictionaries share every key passes
- [x] 3.2 Add the "Tema" block to the Settings sheet in `App.tsx`, right after the language one, with the same label and a `Segmented` built from the translated options; verify in `App.test.tsx`: the "Tema" group shows Sistema active by default, choosing "Oscuro" sets `data-theme="dark"` and `mtf_theme`, choosing "Sistema" removes the attribute, the English labels read Theme / System / Light / Dark, and the Settings order test includes the theme after the language
- [x] 3.3 Add a test to `BackupSection.test.tsx` that an Export with the theme set to Dark has no theme in the file, next to the language one; verify it passes

## 4. End to end and integration

- [x] 4.1 Add to `e2e/base-screen.spec.ts`: with `colorScheme: 'light'`, choosing "Oscuro" turns the body background into the dark paper and the `theme-color` into the dark color, and both survive a reload; with `colorScheme: 'dark'`, choosing "Claro" gives the light paper; verify `command npm run test:e2e` passes on both projects
- [x] 4.2 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass with no warnings
- [x] 4.3 Update the Backup entry in [GLOSSARY.md](../../../GLOSSARY.md) ("device settings such as the language or the theme"), tick #5 in [KB/roadmap.md](../../../KB/roadmap.md), and fill Technical Context / Modified Files in `KB/developers/active.md`; verify every path named exists
- [x] 4.4 Add a short section on `@custom-variant` / `@variant` (one rule, two conditions) to `aprendizaje/tailwind.md`; no new library is introduced, so no new note; verify it is linked from `aprendizaje/index.md`
- [x] 4.5 Clean-code pass over the theme code (naming consistent with the language setting, no dead code, comments only where the why is not obvious); verify lint and tests still pass
- [x] 4.6 Check by hand in the dev server at phone and desktop width, with the system in light and in dark: each of the three choices, live switch under System (DevTools rendering emulation), the status bar color, and that no control uses the accent; verify the palettes match today's light and dark exactly
- [x] 4.7 (User) On a real Android phone and an iPhone, installed: choose the theme opposite to the phone's, close and reopen; verify the app and the status bar open in the chosen theme with no noticeable flash, and note what the splash and the iOS status bar do

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (merges the `app-shell` and `backup` deltas into `openspec/specs/`), then the user commits, pushes and opens the PR.
- This branch was cut from `chore/archive-4-copia-de-seguridad`; merge that archive PR first so this PR carries only change 5.
- After the merge, on an up-to-date `main`: `/close-ticket`.
