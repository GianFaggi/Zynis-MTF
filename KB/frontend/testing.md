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
