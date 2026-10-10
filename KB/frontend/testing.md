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

## CI

`.github/workflows/ci-frontend.yml` (created in change 1): Node 22, npm cache, `npm ci`, `npm run lint`, `npm test`, then Playwright with browsers installed. Triggers on push and PR to `main`.
