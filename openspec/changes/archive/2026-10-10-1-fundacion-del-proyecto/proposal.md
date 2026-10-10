# Proposal

## Why

MTF exists today only as decisions, KBs and a vanilla HTML mockup; there is no app to build the Desk on. Change 1 sets up the technical base every later change depends on (project, Paper design tokens, offline PWA, storage layer and store, ES · EN, tests, CI, deploy), so that change 2 can go straight to the Desk instead of mixing gesture work with tooling.

## What Changes

- New Vite + React + TypeScript project at the repo root, with ESLint (`typescript-eslint`, `react-hooks`, `react-refresh`). Scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:e2e`.
- Tailwind CSS v4 with the Paper tokens from the design system (light and dark, following the system theme) and Literata + Figtree bundled through `@fontsource` (no Google Fonts).
- A first set of closed-API UI components in `src/components/ui/` (button, icon button, segmented control, sheet).
- A **base paper screen**: the paper ground, the `mtf` wordmark, a short welcome line, and a floating settings button that opens a Settings sheet with the language selector. No Desk, Areas or Cards yet.
- vite-plugin-pwa: manifest, app icons, and a service worker that precaches the whole app shell so MTF opens with no connection after the first visit.
- Storage layer `src/lib/storage.ts` (the only module that touches `localStorage`), base types (`Area`, `Card`, `Item`, `WinEvent`, the stored document) and a Zustand store skeleton that loads from and saves through the storage layer.
- Language selector ES · EN, remembered across launches.
- Vitest + Testing Library + jsdom and Playwright set up, with real tests in each.
- GitHub Actions CI (`ci-frontend.yml`) running lint, unit tests, build and Playwright on push and PR to `main`.
- First deploy on Vercel showing the base paper screen.

### Acceptance criteria → scope

| Issue #1 criterion | Covered by |
|---|---|
| Vite + React + TypeScript with ESLint; `npm run dev` and `npm run build` work | Project scaffold, scripts |
| Tailwind v4 with Paper tokens (light and dark) and Literata + Figtree bundled | `app-shell` capability, design system tokens |
| Installable PWA that opens offline after the first visit | `pwa-offline` capability |
| Storage layer (`src/lib/storage.ts`) + Zustand store + base types (Area, Card, Item, WinEvent) | `local-storage` capability, types, store skeleton |
| Language selector ES · EN that is remembered | `i18n` capability |
| Vitest + Testing Library and Playwright set up, at least one test each | Test setup; unit tests for storage/i18n/app, Playwright for the base screen and offline launch |
| CI on GitHub Actions running lint + tests | `ci-frontend.yml` |
| First deploy on Vercel with a base paper screen | Vercel project connected by the user; base paper screen |

### Out of scope

- The Desk itself: pan/zoom, Areas, Cards, drag, dock, search, first-run hint (change 2).
- Win events logic, finished Cards, the Jar, Mis logros, wins counter (change 3).
- Export / Import, persistent storage request, install guidance (change 4).
- A manual light/dark theme toggle (the app follows the system theme).
- A "new version ready" toast (updates apply silently on the next launch).
- Anything that needs a server: accounts, sync, sharing (V2 backlog).

## Capabilities

### New Capabilities

- `app-shell`: the base paper screen MTF opens to: Paper look in light and dark following the system, bundled fonts, wordmark, and the Settings sheet as the place for app settings.
- `pwa-offline`: installing MTF and opening it with no connection; what the service worker precaches and how updates arrive.
- `local-storage`: how user data is kept in the browser: one versioned document read and written only through the storage layer, safe defaults, and protection against losing unreadable data.
- `i18n`: the app language (Spanish or English): initial choice, switching it, and remembering it.

### Modified Capabilities

(none — there are no existing specs yet)

## Impact

- **New code**: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `playwright.config.ts`, `src/**` (app, UI kit, i18n, storage, store, types, test setup), `e2e/**`, `public/` icons, `.github/workflows/ci-frontend.yml`.
- **New dependencies** (all already listed in [KB/frontend/stack.md](../../../KB/frontend/stack.md)): react, react-dom, zustand, lucide-react, @fontsource fonts, tailwindcss + @tailwindcss/vite, vite-plugin-pwa; dev: vite, typescript, eslint and plugins, vitest, jsdom, Testing Library, Playwright. `@use-gesture/react` waits until change 2, when it is first used. The planned `uuid` package is replaced by the browser's built-in `crypto.randomUUID()` (see design.md).
- **Docs**: stack.md (pinned versions, uuid decision), design-system.md, storage.md, pwa.md, testing.md, architecture.md, roadmap.md, README; a new ADR for the stored document format; `aprendizaje/` notes filled with how each tool appears in MTF.
- **External**: a Vercel project linked to `GianFaggi/Zynis-MTF` (set up by the user); GitHub Actions starts running on the repo.
