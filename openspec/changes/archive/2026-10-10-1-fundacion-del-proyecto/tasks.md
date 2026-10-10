# Tasks

## 1. Project scaffold

- [x] 1.1 Check `vite-plugin-pwa`'s peer range for Vite, then run `command npm create vite@latest` with the `react-ts` template in the scratchpad and copy `package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` and `src/main.tsx` into the repo root without touching `README.md`, `.gitignore` or `LICENSE`; verify with `git status` that only new files appear
- [x] 1.2 Set `name` to `zynis-mtf`, add scripts `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`, `test` (`vitest run`), `test:watch`, `test:e2e`; install with `command npm install` and verify `package-lock.json` exists and no `pnpm-lock.yaml` was created
- [x] 1.3 Remove the template demo (counter, logos, `App.css`), set `<html lang="es">`, `viewport-fit=cover` and the title "MTF — Más Tareas Fáciles"; verify `command npm run dev` serves a blank page and `command npm run build` and `command npm run lint` pass
- [x] 1.4 Record the pinned versions of React, TypeScript, Vite and ESLint in [KB/frontend/stack.md](../../../KB/frontend/stack.md) and fill the "Cómo va a aparecer en MTF" section of `aprendizaje/vite.md`, `typescript.md` and `react.md`; verify the versions match `package.json`

## 2. Test tooling

- [x] 2.1 Install Vitest, jsdom, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`; add the `test` block to `vite.config.ts` (jsdom, `src/test/setup.ts`, `src/**/*.test.{ts,tsx}`) and write `src/test/setup.ts` (jest-dom matchers, unmount + `localStorage.clear()` after each test); verify a throwaway smoke test passes with `command npm test`, then delete it
- [x] 2.2 Install `@playwright/test`, write `playwright.config.ts` (projects Desktop Chrome + Pixel 7, `webServer` = build + preview on port 4173, `e2e/` folder) and install Chromium; verify `command npm run test:e2e` runs (a placeholder spec that loads `/` passes)
- [x] 2.3 Update [KB/frontend/testing.md](../../../KB/frontend/testing.md) with the final config (projects, webServer, commands) and fill the MTF section of `aprendizaje/testing.md`; verify the commands in the KB run as written

## 3. Paper design system

- [x] 3.1 Install `tailwindcss` + `@tailwindcss/vite`; write `src/index.css` with `@import "tailwindcss"`, the Paper tokens in a plain `@theme` block and the dark overrides in `@media (prefers-color-scheme: dark)`; add the light and dark `theme-color` metas to `index.html`; verify in the dev server that `bg-paper` changes when the OS / DevTools color scheme switches
- [x] 3.2 Install `@fontsource-variable/literata` and `@fontsource-variable/figtree`, import Literata normal + italic and Figtree normal in `src/main.tsx`, set `--font-display` / `--font-ui` with the mockup fallbacks; verify in DevTools Network that fonts load from the app origin and none from Google
- [x] 3.3 Install `lucide-react` and build `src/components/ui/` — `Button`, `IconButton`, `Segmented`, `Sheet` — with typed props, no `className` prop and no accent color; verify with co-located tests: `IconButton` exposes its label as accessible name, `Segmented` sets `aria-pressed` and calls `onChange`, `Sheet` closes on `Esc`, close button and scrim click and returns focus to the trigger
- [x] 3.4 Update [KB/frontend/design-system.md](../../../KB/frontend/design-system.md) (token names as `--color-*`, the dark-override pattern and why `@theme inline` is not used, font family names, the four UI components and their props) and fill the MTF section of `aprendizaje/tailwind.md`; verify the token table matches `src/index.css`

## 4. Storage layer and types

- [x] 4.1 Write `src/types/index.ts` with `Language`, `Area`, `Item`, `Card`, `WinEvent` and `MtfData` from storage.md; verify `command npm run build` typechecks
- [x] 4.2 Write `src/lib/id.ts` (`newId()` with `crypto.randomUUID()` and a `getRandomValues` fallback); verify with `id.test.ts`: v4 UUID format, 1 000 ids are unique, the fallback path also produces v4 UUIDs
- [x] 4.3 Write `src/lib/storage.ts` (`loadData`, `saveData`, `loadLanguage`, `saveLanguage`, migration loop, recovery key, try/catch on every access); verify with `storage.test.ts` against jsdom `localStorage`: empty start, round trip, invalid JSON → recovery copy + empty document, wrong shape → recovery, newer `schemaVersion` → recovery, current version loads unchanged, a throwing `localStorage` does not throw out of the layer
- [x] 4.4 Write ADR `docs/adr/0004-versioned-storage-document.md` (one versioned document, migrations, recovery copy) and update [KB/frontend/storage.md](../../../KB/frontend/storage.md) (shapes now final for v1, keys incl. `mtf_data_recovery_<epochMs>`, `crypto.randomUUID`) and stack.md (drop `uuid`, explain why); fill the MTF section of `aprendizaje/localstorage.md`; verify the KB shapes match `src/types/index.ts`

## 5. Store and i18n

- [x] 5.1 Write `src/i18n/locales/es.ts` and `en.ts` (`en: Messages`), and `src/i18n/index.ts` with `detectLanguage` and `useT()`; verify with `i18n.test.ts`: es and en have the same keys, `es-AR` → `es`, `fr-FR` → `en`, an empty list → `en`
- [x] 5.2 Install `zustand` and write `src/store/appStore.ts` (`data`, `language`, `setLanguage`, load on create, save `data` on change, save language on `setLanguage`); verify with `appStore.test.ts`: a stored language wins over the browser language, `setLanguage` writes `mtf_language`, replacing `data` writes `mtf_data`
- [x] 5.3 Update [KB/frontend/architecture.md](../../../KB/frontend/architecture.md) with the real file paths (store, storage, i18n, types) and fill the MTF sections of `aprendizaje/zustand.md` and `aprendizaje/i18n.md`; verify every path in the KB exists

## 6. Base paper screen

- [x] 6.1 Write `src/App.tsx`: paper ground, floating `mtf` wordmark (Literata italic), welcome line in the current language, floating settings `IconButton` opening the Settings `Sheet` with the language `Segmented`; respect `env(safe-area-inset-*)`; keep `<html lang>` in sync with the store; verify with `App.test.tsx`: wordmark and welcome visible, Settings opens, picking English changes the texts and `document.documentElement.lang`, `Esc` closes the sheet
- [x] 6.2 Write `e2e/base-screen.spec.ts`: base screen shows the wordmark with no horizontal scroll, switching to English survives a reload; verify `command npm run test:e2e` passes on both projects
- [x] 6.3 Check the screen by hand in the dev server at phone width and desktop width, light and dark, ES and EN; verify it matches the mockup's look (paper, ink, fonts, floating controls, no header bar)

## 7. PWA

- [x] 7.1 Draw `public/logo.svg` (three overlapping paper cards in sage, sand and sky on paper, no text) and generate the icons with `command npx @vite-pwa/assets-generator --preset minimal-2023 public/logo.svg`; verify the 64, 192, 512, maskable 512, Apple 180 PNGs and `favicon.ico` exist in `public/` and the favicon/apple links are in `index.html`
- [x] 7.2 Install `vite-plugin-pwa` and configure it in `vite.config.ts` (`autoUpdate`, injected register script, no `virtual:pwa-register`, manifest from pwa.md, `globPatterns` for the app shell + latin/latin-ext fonts only, no runtime caching); verify after `command npm run build` that `dist/sw.js` and `dist/manifest.webmanifest` exist and the precache list has no cyrillic/greek/vietnamese font files
- [x] 7.3 Write `e2e/offline.spec.ts`: wait until the service worker controls the page, go offline, reload, wordmark visible and `document.fonts.check` true for Literata and Figtree; and a check that no request leaves the origin while opening Settings and switching language; verify `command npm run test:e2e` passes
- [x] 7.4 Update [KB/frontend/pwa.md](../../../KB/frontend/pwa.md) (update flow decided: silent, no toast; precache patterns; icon source and generator command) and fill the MTF section of `aprendizaje/pwa.md`; verify the checklist items that can be checked locally are ticked

## 8. CI

- [x] 8.1 Write `.github/workflows/ci-frontend.yml` (push + PR to `main`, Node 22, npm cache, `npm ci`, lint, test, build, `npx playwright install --with-deps chromium`, `test:e2e`, upload the Playwright report on failure); verify the same command sequence passes locally from a clean `command npm ci`
- [x] 8.2 Confirm the CI section of [KB/frontend/testing.md](../../../KB/frontend/testing.md) matches the workflow file; verify by reading both side by side

## 9. Integration and first deploy

- [x] 9.1 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e` together; verify all four pass with no warnings left to fix
- [x] 9.2 Update [README.md](../../../README.md) ("Correr el proyecto" is now real; remove "Disponible a partir de la etapa 1") and tick change 1 items in [KB/roadmap.md](../../../KB/roadmap.md); verify the README commands run as written
- [x] 9.3 (User) Push the branch, open the PR and confirm CI is green on GitHub
- [ ] 9.4 (User) Import `GianFaggi/Zynis-MTF` in Vercel (Vite preset, production branch `main`) and open the preview deployment; verify the base paper screen loads over HTTPS and Chrome DevTools → Application shows the manifest as installable
- [ ] 9.5 (User) On the phone: open the deployed URL, install it (Android Chrome; iOS Safari → Share → Add to Home Screen), turn on airplane mode and relaunch; verify the base paper screen opens with its fonts

## Workflow follow-up

- After review and merge: `/opsx:archive` to merge the four specs into `openspec/specs/`, then `/close-ticket`.
