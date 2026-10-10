# Design

## Context

The repo has docs, KBs, ADRs 0001–0003 and two vanilla HTML mockups, but no code, no `package.json` and no CI (see proposal.md — Why). The KBs already fix most choices: the stack ([stack.md](../../../KB/frontend/stack.md)), the data flow components → Zustand store → `src/lib/storage.ts` → localStorage ([architecture.md](../../../KB/frontend/architecture.md)), the Paper tokens ([design-system.md](../../../KB/frontend/design-system.md)), the draft entity shapes ([storage.md](../../../KB/frontend/storage.md)), full offline precache ([pwa.md](../../../KB/frontend/pwa.md)) and the two test layers ([testing.md](../../../KB/frontend/testing.md)). This design settles the points those KBs left open for change 1 and the details needed to build it.

Constraints: the user's shell aliases `npm` to `pnpm`, so every install runs as `command npm …`; Claude never commits or pushes, so CI and Vercel only run once the user pushes; Node 24 locally, Node 22 in CI.

## Goals / Non-Goals

**Goals:**
- A project where `npm run dev`, `build`, `lint`, `test` and `test:e2e` all work from a clean `npm ci`.
- Design tokens, fonts, i18n, storage and store shaped the way changes 2–4 will use them, so they only add to them.
- Real proof of the offline promise: an automated test that loads MTF, goes offline and reloads.

**Non-Goals:**
- No Desk code, no `@use-gesture/react` install yet (it arrives with its first use in change 2).
- No data actions in the store beyond loading, saving and language; Card/Area/win actions come with the features that need them.
- No default Areas seeded yet: the Desk change decides their rects.
- No paper grain texture yet (it belongs to the Desk surface).

## Decisions

### 1. Scaffold with create-vite in a temp folder, then merge
Run `command npm create vite@latest` with the `react-ts` template in a scratch folder and copy its config and `src/` entry files into the repo root. Running it in the root would trip over the non-empty folder and could overwrite `README.md` and `.gitignore`. Dependencies are installed at their current stable versions and the exact versions are recorded in stack.md. Before choosing the Vite major, check `vite-plugin-pwa`'s peer range; if it does not yet support the newest Vite, use the newest Vite it supports.
*Found while implementing*: the current `react-ts` template ships oxlint instead of ESLint and has no `eslint.config.js`. The user chose to keep ESLint (issue criteria, stack.md, same as Pulse); `eslint.config.js` is the standard Vite React flat config written by hand.
*Alternative*: hand-write every config file: more error-prone, no benefit.

### 2. Tokens in `@theme`, dark mode by overriding the same variables
`src/index.css` imports Tailwind and declares the Paper tokens in a plain `@theme` block (`--color-paper`, `--color-sheet`, `--color-ink`, `--color-ink-2`, `--color-pencil`, `--color-rule`, `--color-accent`, `--color-accent-ink`, `--color-on-accent`, the five Area colors, `--color-float`, `--color-scrim`, `--color-hover`, `--color-danger`, shadows, `--font-display`, `--font-ui`), with values from the mockup. A `@media (prefers-color-scheme: dark)` block redefines the same `--color-*` variables on `:root`. Because Tailwind utilities (`bg-paper`, `text-ink`) read `var(--color-*)`, the whole UI switches theme with no `dark:` variants anywhere.
- Use `@theme`, **not** `@theme inline`: `inline` writes the hex values into each utility, which would stop the dark override from working.
- *Refined while implementing*: `@theme static`, so every token is emitted even when no utility uses it (Area colors are picked from data at runtime, which Tailwind's scanner cannot see), and `--color-*: initial` to drop Tailwind's default palette.
- `index.html` gets two `theme-color` metas (light and dark media) so the phone status bar matches.
*Alternative*: Tailwind's `dark:` variant on every element: doubles every class list and lets screens drift from the palette.

### 3. Fonts: variable @fontsource packages, latin subsets precached
Use `@fontsource-variable/literata` (normal + italic) and `@fontsource-variable/figtree` (normal). Variable fonts ship one file per style for all weights, fewer files to precache than static weights 400/500/600/700. The family names are `"Literata Variable"` and `"Figtree Variable"`, with the mockup's fallbacks. Fontsource's CSS lists every subset (cyrillic, greek, vietnamese…); the browser downloads only what text needs, but Workbox would precache every emitted `.woff2`. The PWA config precaches only the `latin` and `latin-ext` files, which cover Spanish and English.
*Alternative*: static `@fontsource/literata` weights: more files, same result.

### 4. Closed-API UI kit: four components
`src/components/ui/` gets `Button` (variants `primary` = ink fill, `quiet`), `IconButton` (required `label` used as `aria-label`, icon from lucide-react), `Segmented` (options + value + onChange, `aria-pressed` on each option) and `Sheet` (title, `open`, `onClose`, children). Props are typed and there is **no `className` prop**, so screens cannot restyle them one by one. No component uses the accent color (it is reserved for wins).
`Sheet` is a `div role="dialog" aria-modal="true" aria-labelledby` over a scrim, not a native `<dialog>`: jsdom does not implement `showModal()`, which would make every sheet untestable in Vitest. It moves focus into the sheet on open, returns focus to the trigger on close, closes on `Esc`, on the close button and on a scrim click/tap (pointer and touch both produce `click`).

### 5. i18n: typed dictionaries + a `useT()` hook
`src/i18n/locales/es.ts` defines the messages object (strings, or functions for strings with values). `en.ts` is typed as `Messages = typeof es`, so a missing or extra English key fails `tsc` — enforced at build time, plus a unit test comparing keys. `src/i18n/index.ts` exports `detectLanguage(navigator.languages)` (`es*` → `es`, else `en`) and `useT()`, which reads the language from the store and returns `t(key, ...args)`. The `<html lang>` attribute is set from the store on start and on every change.
*Alternative*: i18next / react-intl: rejected in stack.md as more than two small dictionaries need.

### 6. Storage layer: one versioned document, recovery copy, never throws
`src/lib/storage.ts` is the only module that touches `localStorage`. Keys: `mtf_data` (`{ schemaVersion: 1, areas, cards, events }`), `mtf_language`, and `mtf_data_recovery_<epochMs>` for unreadable data. API:
- `loadData(): MtfData` — missing → empty v1 document; invalid JSON, wrong shape (not an object, `schemaVersion` not a number, lists not arrays) or `schemaVersion` above the current one → copy the raw string to a recovery key, return an empty document; older version → run `migrations[v]` step by step up to current (the map is empty at v1, but the loop and its test exist now).
- `saveData(data)`, `loadLanguage(): Language | null`, `saveLanguage(lang)`.
- Every access is wrapped in `try/catch`; failures are logged with `console.warn` and the app carries on in memory.
Recorded as **ADR 0004** (stored document format), since the schema is the part that is hard to change once users have data.
*Alternative*: one key per entity: more writes to coordinate, and the Backup in change 4 wants the whole document anyway.

### 7. Ids: built-in `crypto.randomUUID()` instead of the `uuid` package
`src/lib/id.ts` exports `newId()`, which uses `crypto.randomUUID()` (Chrome 92+, Safari 15.4+, Firefox 95+). `randomUUID` only exists in secure contexts (HTTPS or `localhost`), and phone testing against `vite --host` over plain `http://192.168.x.x` is not one, so `newId()` falls back to building a v4 UUID from `crypto.getRandomValues`, which works everywhere. This removes one dependency planned in stack.md; the ids are the same v4 UUIDs the V2 sync expects.
*Alternative*: the `uuid` package: works everywhere, but adds a dependency for about ten lines of code.

### 8. Store skeleton
`src/store/appStore.ts` creates one Zustand store `{ data: MtfData, language: Language, setLanguage }`. On creation it reads `loadData()` and `loadLanguage() ?? detectLanguage(...)`. A `subscribe` saves `data` through `saveData` whenever its reference changes (debouncing while dragging comes with change 2); `setLanguage` saves through `saveLanguage`. View state is never stored in `data`. Base types (`Area`, `Card`, `Item`, `WinEvent`, `MtfData`, `Language`) live in `src/types/index.ts`, copied from storage.md's draft, which becomes final for these shapes.

### 9. PWA: generateSW, autoUpdate, no page reload
vite-plugin-pwa with `registerType: 'autoUpdate'`, the plugin's injected registration script, and **no** import of `virtual:pwa-register`. The new service worker installs in the background and takes over; the open page is not reloaded, so the user is never interrupted, and the next launch runs the new version. Workbox `globPatterns` covers `html, js, css, svg, png, ico, webmanifest` plus the latin font files; `cleanupOutdatedCaches` stays on; no runtime caching (MTF makes no requests). Manifest values as in pwa.md. Decides pwa.md's open point: **no "new version" toast** in the MVP.
*Alternative*: `prompt` mode with a toast: more UI to build for an update that can safely wait.

### 10. App icons: one SVG source, generated once
A simple geometric mark (three overlapping paper cards in sage, sand and sky on the paper color; no text, so it renders without fonts) is drawn as `public/logo.svg`. The PNGs (64, 192, 512, maskable 512, Apple 180, `favicon.ico`) are generated once with `command npx @vite-pwa/assets-generator --preset minimal-2023 public/logo.svg` and committed. The generator is run with npx, not added to `package.json`. The mark is a placeholder the user can redesign later.
*Changed while implementing*: the bare preset pads the maskable and Apple icons with white (a white ring around the paper icon on Android). A `pwa-assets.config.ts` extending `minimal-2023` sets paper as the padding color, which needs the generator as a devDependency; it runs as `npm run generate-pwa-assets`.

### 11. Tests and CI
- **Vitest** is configured in `vite.config.ts` (`test`: jsdom, `setupFiles: src/test/setup.ts`, `include: src/**/*.test.{ts,tsx}`); setup adds jest-dom matchers, then unmounts and clears `localStorage` after each test. Unit tests: storage (empty, round trip, corrupt → recovery, newer version, throwing storage), id uniqueness and format (incl. fallback), i18n (same keys, detection), App (opens Settings, switches language, `<html lang>`).
- **Playwright** in `e2e/`, projects Desktop Chrome and Pixel 7 (both Chromium, so CI installs one browser), `webServer` = `npm run build && npm run preview`. Specs: base screen + language persists after reload; offline launch (wait for the service worker to control the page, `context.setOffline(true)`, reload, wordmark visible, `document.fonts.check` for Literata); no request leaves the origin.
- **CI** `.github/workflows/ci-frontend.yml` on push and PR to `main`: Node 22, npm cache, `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run test:e2e`; uploads the Playwright report on failure.

### 12. Vercel
No `vercel.json`: Vercel detects Vite (`npm run build`, `dist/`). Its default `Cache-Control: public, max-age=0, must-revalidate` on static files means browsers always check for a new `sw.js`, which is what the update flow needs. The user imports the GitHub repo in Vercel (production branch `main`; previews for PRs), which needs their account.

### Glossary
No domain term is introduced or sharpened: Settings, theme and language are app terms, not domain terms. GLOSSARY.md is unchanged.

## Risks / Trade-offs

- [vite-plugin-pwa may lag behind the newest Vite major] → check its peer range before installing (Decision 1).
- [A user with MTF open during a deploy keeps old JS while the new service worker removes old precached files; a lazy-loaded chunk could then fail] → MTF has a single bundle and no lazy routes now; revisit if code splitting is added.
- [Testing offline with Playwright depends on the service worker controlling the page first] → the spec waits for `navigator.serviceWorker.controller` before going offline.
- [Fonts outside latin/latin-ext are not precached] → characters outside them fall back to Georgia/system-ui offline; acceptable for ES/EN.
- [localStorage is per browser and can be evicted (Safari)] → known and accepted in ADR 0002; mitigations ship in change 4.
- [Placeholder icon] → easy to replace: swap `public/logo.svg` and rerun the generator.

## Migration Plan

New project, no data to migrate. Rollout: the user pushes the branch and opens a PR (CI runs), links the repo in Vercel, merges to `main` → production deploy. Rollback: Vercel's instant rollback to the previous deployment; an older service worker is replaced by whichever version is deployed next.

## Open Questions

- Final app icon design (placeholder until the user wants a real one).
- Whether to use Literata's optical-size axis (`opsz`) for big titles; only matters once the Desk renders Card titles.
