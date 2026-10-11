---
area: testing
description: Frontend test stack, what goes in Vitest vs Playwright, conventions and CI for Zynis MTF
---

# Testing

Set up in change 1. Conventions follow Zynis Pulse, plus Playwright for gestures.

## Two layers

| | Vitest + Testing Library (jsdom) | Playwright (real browser) |
|---|---|---|
| What | rules, storage, store actions, components | real flows with gestures |
| Examples | finishing a Card when the last Item is checked; Jar refuses a Card with pending Items; win counts for the last 7 days; Export/Import round trip; ES/EN strings | drag a Card to another Area; press-and-hold drag on a phone viewport; pinch/wheel zoom and far-zoom titles; drop a finished Card in the Jar |
| How many | many, fast | few, slower |
| Command | `npm test` | `npm run test:e2e` |

jsdom has no layout and no real pointer gestures: never try to test dragging or zooming there. Test the pure functions behind them instead (screen ↔ world conversion, nearest Area, Jar hit test, tidy layout).

## Conventions

- **Co-located tests**: `foo.ts` → `foo.test.ts`, `Foo.tsx` → `Foo.test.tsx`
- **Global setup** in `src/test/setup.ts`: jest-dom matchers; unmount and clear `localStorage` after every test
- **Explicit imports** (`import { describe, it, expect } from 'vitest'`), no globals
- **Storage tests** hit the real `src/lib/storage.ts` against jsdom's `localStorage`, no mocking
- **Dates**: pin today with `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` for "last 7 days" logic
- **Query by role and visible text**, not class names or test ids
- **Playwright** specs in `e2e/`, projects for desktop Chrome and a phone viewport (Pixel / iPhone); start the Vite preview server via `webServer`
- **Test data builders** in `src/test/fixtures.ts` (`makeArea`, `rowOfAreas`, `makeCard`, `makeItem`, `makeData`, `sequence`): readable ids (`a1`–`a3`, `c1`) so a failing assertion says which entity it is about. `sequence(...)` is a fixed `random` for layouts.
- **App stores are singletons**: component tests call `resetStores(data?)` from `src/test/stores.ts` first (Spanish, the three default Areas, a fresh `deskStore`).
- **Real stores in component tests**: render the component, act through Testing Library, assert on `useAppStore.getState()` / `useDeskStore.getState()`. A 4-Area data set proves the Dock and Place are generic.

## E2E conventions (change 2)

Shared helpers live in `e2e/helpers.ts`:

| Helper | What |
|---|---|
| `openApp(page, { hintSeen })` | Opens MTF and waits for the Desk's first view (after `document.fonts.ready`) |
| `seedDesk(page, data, { hintSeen })` | Writes `mtf_data` (default Areas `a1`–`a3` unless given) with `page.evaluate`, reloads, waits. Not `addInitScript`: that would overwrite the data on every reload and break "survives a reload" tests |
| `card(...)`, `AREAS` | Builders for seeded data |
| `areaLabel`, `deskCard`, `storedData`, `center`, `deskScale`, `cardColor`, `cssColor` | Locators and reads (scale from the world's computed transform; `--b` resolved to a color) |
| `Touch` | Real touch input through CDP `Input.dispatchTouchEvent`: `drag(from, to, { holdMs })` for hold-then-drag or a quick swipe, `pinch(at, startGap, endGap)`, and `send(type, points)` for custom sequences (a second finger during a drag) |

- **The first-run hint is marked seen by default** in `openApp` / `seedDesk`, so it never covers a gesture; only the hint's own test passes `hintSeen: false`.
- **Touch only through CDP.** Playwright has no touch drag or pinch API. Both projects are Chromium and the phone project emulates a touch screen, so Chrome turns CDP touches into touch and pointer events, which is what use-gesture listens to. Mouse and wheel tests skip the phone project, touch tests skip the desktop one (`test.skip(({ isMobile }) => …)`).
- **Desktop opens zoomed out** (the whole Desk fits at ~46%, below the 55% far threshold), so tests that need a Card's checklist zoom in first with `Ctrl` + wheel.
- After a wheel, fly (0.55 s) or Tidy up (0.5 s), wait a little before measuring: use-gesture ends a wheel gesture after a short pause.
- Locators that could match both an Area label and its Dock button are scoped (`getByRole('navigation', { name: 'Áreas' })`).
- iOS Safari gestures (`gesture*` pinch, long-press callout, double-tap zoom) cannot run in Playwright; they are checked by hand on a real iPhone.

## Setup

**Vitest** — `test` block in `vite.config.ts` (one config for app and tests; `/// <reference types="vitest/config" />` types it):

| Option | Value |
|---|---|
| `environment` | `jsdom` |
| `setupFiles` | `src/test/setup.ts` — imports `@testing-library/jest-dom/vitest`, then `cleanup()` + `localStorage.clear()` in `afterEach` |
| `include` | `src/**/*.test.{ts,tsx}` |

Test files live in `src/`, so `tsc -b` typechecks them in the build too.

**Playwright** — `playwright.config.ts`:

| Option | Value |
|---|---|
| `testDir` | `e2e` (typechecked through `tsconfig.node.json`, which includes the `DOM` lib for `page.evaluate` callbacks) |
| `projects` | `desktop` = `devices['Desktop Chrome']`, `phone` = `devices['Pixel 7']` — both Chromium, one browser to install |
| `webServer` | `npm run build && npm run preview -- --port 4173 --strictPort`, `baseURL` `http://localhost:4173`; reuses a running server locally, never in CI |
| CI only | `forbidOnly`, 1 retry, trace on first retry, HTML report in `playwright-report/` |

E2E runs against the **production build**, not the dev server, because the service worker (offline tests) only exists in the build.

## Commands

```bash
command npm test                        # Vitest, once
command npm run test:watch              # Vitest, re-runs on save
command npm run test:e2e                # Playwright (builds first)
command npx playwright install chromium # once per machine, after installing deps
```

## CI

`.github/workflows/ci-frontend.yml` (created in change 1). Triggers on push and PR to `main`; one job on `ubuntu-latest`, 15-minute timeout:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 22, `cache: npm`
3. `npm ci`
4. `npm run lint`
5. `npm test`
6. `npm run build`
7. `npx playwright install --with-deps chromium` (Chromium only: both projects use it)
8. `npm run test:e2e` (its `webServer` builds again and serves on 4173; `CI` is set, so no server reuse, 1 retry, HTML report)
9. On failure: upload `playwright-report/` as the `playwright-report` artifact (7 days)

To reproduce CI locally: `CI=1` and the same commands, starting from `command npm ci` (`--with-deps` is Linux-only; locally `command npx playwright install chromium`).
