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
| Examples | finishing a Card when the last Item is checked; Jar refuses a Card with pending Items; win counts for the last 7 days; Backup round trip and every refusal; install mode per device; ES/EN strings | drag a Card to another Area; press-and-hold drag on a phone viewport; pinch/wheel zoom and far-zoom titles; drop a finished Card in the Jar; export → import a real file, also offline |
| How many | many, fast | few, slower |
| Command | `npm test` | `npm run test:e2e` |

jsdom has no layout and no real pointer gestures: never try to test dragging or zooming there. Test the pure functions behind them instead (screen ↔ world conversion, nearest Area, Jar hit test, tidy layout).

## Conventions

- **Co-located tests**: `foo.ts` → `foo.test.ts`, `Foo.tsx` → `Foo.test.tsx`
- **Global setup** in `src/test/setup.ts`: jest-dom matchers; unmount and clear `localStorage` after every test
- **Explicit imports** (`import { describe, it, expect } from 'vitest'`), no globals
- **Storage tests** hit the real `src/lib/storage.ts` against jsdom's `localStorage`, no mocking
- **Dates** (in use since change 3): pin today with `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(...)` for "last 7 days" logic (`stats.test.ts`, `MisLogros.test.tsx`, `WinsCounter.test.tsx`). Faking only `Date` keeps real timers, so `userEvent` still works. Build event times from calendar dates (`new Date(y, m, d - n, 12)`), never `now - n * 86 400 000`. To cross midnight (`useWinStats.test.ts`), fake all timers and `advanceTimersByTime`.
- **Time zones**: a DST test stubs the zone with `vi.stubEnv('TZ', 'Europe/Madrid')` (Node reads `TZ` on every date calculation; `vi.unstubAllEnvs()` restores it) and first asserts that the UTC offset really changes that week, so it cannot pass by accident in a zone without DST (CI runs in UTC)
- **Query by role and visible text**, not class names or test ids
- **Playwright** specs in `e2e/`, projects for desktop Chrome and a phone viewport (Pixel / iPhone); start the Vite preview server via `webServer`
- **Test data builders** in `src/test/fixtures.ts` (`makeArea`, `rowOfAreas`, `makeCard`, `makeItem`, `makeData`, `sequence`): readable ids (`a1`–`a3`, `c1`) so a failing assertion says which entity it is about. `sequence(...)` is a fixed `random` for layouts.
- **App stores are singletons**: component tests call `resetStores(data?)` from `src/test/stores.ts` first (Spanish, the three default Areas, a fresh `deskStore`). `installStore` is reset with `useInstallStore.setState(useInstallStore.getInitialState(), true)`.
- **Browser APIs jsdom lacks** (change 4) are put in place per test and removed in `afterEach`, never in the global setup, so a test that forgets one fails instead of passing on a fake:
  - `matchMedia`: `vi.stubGlobal('matchMedia', (query) => ({ matches: … }))`, removed by `vi.unstubAllGlobals()`
  - `navigator.share` / `canShare` / `storage` / `maxTouchPoints` / `standalone`: `Object.defineProperty(navigator, name, { value, configurable: true })`, removed with `Reflect.deleteProperty(navigator, name)`; `userAgent` with `vi.spyOn(navigator, 'userAgent', 'get')`
  - `URL.createObjectURL` / `revokeObjectURL`: assigned on `URL` and deleted after; the download link's `click()` is spied on `HTMLAnchorElement.prototype`, so jsdom never tries to navigate
  - `src/test/device.ts`: `stubDevice({ userAgent, touchPoints, displayStandalone, iosStandalone })` and `restoreDevice()` for the install tests, with real user agents in `USER_AGENTS` (iPhone, iPad, iPadOS-as-Mac, Android, Windows)
- **Module mocks** only at a seam the test is about: `vi.mock('./deliver')` in `BackupSection.test.tsx` (the share sheet / download is tested on its own), `requestPersistentStorage` in `usePersistentStorage.test.ts`, and `upgradeDocument` in `backup.test.ts` to inject a migration step (at schema version 1 there is no older version to import).
- **File picking**: `userEvent.upload(screen.getByLabelText('Importar copia'), file)` with `new File([text], name, { type: 'application/json' })`. `upload` honors the input's `accept`, so test files are `.json`.
- **Real stores in component tests**: render the component, act through Testing Library, assert on `useAppStore.getState()` / `useDeskStore.getState()`. A 4-Area data set proves the Dock and Place are generic.

## E2E conventions (change 2)

Shared helpers live in `e2e/helpers.ts`:

| Helper | What |
|---|---|
| `openApp(page, { welcome })` | Opens MTF and waits for the Desk's first view (after `document.fonts.ready`). A blank Desk unless `welcome: true` (a first launch, with its Welcome Card) |
| `seedDesk(page, data, { welcome })` | Writes `mtf_data` (default Areas `a1`–`a3` unless given) with `page.evaluate`, reloads, waits. Not `addInitScript` for the data: that would overwrite it on every reload and break "survives a reload" tests. With `welcome: true` it also removes `mtf_welcome_placed` before the reload, so the seeded Desk is a device in use that never had its Welcome Card |
| `waitForDesk(page)` | Waits for an Area label, the fonts and two frames, so the first view has reached the DOM; for a test's own `reload()` |
| `card(...)`, `AREAS` | Builders for seeded data |
| `areaLabel`, `deskCard`, `storedData`, `center`, `deskScale`, `cardColor`, `cssColor` | Locators and reads (scale from the world's computed transform; `--b` resolved to a color) |
| `Touch` | Real touch input through CDP `Input.dispatchTouchEvent`: `drag(from, to, { holdMs })` for hold-then-drag or a quick swipe, `pinch(at, startGap, endGap)`, and `send(type, points)` for custom sequences (a second finger during a drag) |

- **The Welcome Card is marked as placed by default** in `openApp` / `seedDesk` (#20), so every other spec keeps exactly the Desk it seeds. The flag `mtf_welcome_placed = '1'` is written with `page.addInitScript` **before the first `goto`**: written after the first load (as the old hint flag was) it would come too late, because that load already placed a Welcome Card and saved it in `mtf_data`. `addInitScript` is safe here, unlike for `mtf_data`, because it writes only the flag, on every load. Only `e2e/welcome.spec.ts` passes `welcome: true`. Specs that call `page.goto` themselves (`offline.spec.ts`) get a Welcome Card; their locators must not trip over it (the wordmark is `getByRole('heading', { name: 'MTF By Zynis', exact: true })`, since "¡Hola! Esto es MTF" also contains "MTF"; every spec uses that locator).
- **Touch only through CDP.** Playwright has no touch drag or pinch API. Both projects are Chromium and the phone project emulates a touch screen, so Chrome turns CDP touches into touch and pointer events, which is what use-gesture listens to. Mouse and wheel tests skip the phone project, touch tests skip the desktop one (`test.skip(({ isMobile }) => …)`).
- **Desktop opens zoomed out**: on Playwright's 1280 × 720 window the whole Desk, Jar included, fits at ~37%, below the 55% far threshold, where Cards show only their title (their `h3` and Item boxes are `display: none`, with no bounding box). Tests that need a Card's checklist zoom in first with `Ctrl` + wheel (`zoomToNearLook` in `jar.spec.ts`).
- After a wheel, fly (0.55 s) or Tidy up (0.5 s), wait a little before measuring: use-gesture ends a wheel gesture after a short pause.
- Locators that could match both an Area label and its Dock button are scoped (`getByRole('navigation', { name: 'Áreas' })`).
- iOS Safari gestures (`gesture*` pinch, long-press callout, double-tap zoom) cannot run in Playwright; they are checked by hand on a real iPhone.

### The Jar (`e2e/jar.spec.ts`, change 3)

- **Dropping on the Jar**: `towardJar(page, id)` is the pointer movement that puts the Card's center on the Jar's center (the same point the app tests). Cards are grabbed with `grip(page, id)`, a point near their top edge, so the press never lands on an Item box (which never starts a drag) and works in both the near and the far look.
- Mouse drops run on desktop; the phone test flies to the Jar with the Dock's "Frasco" first, then holds 450 ms and drags with `Touch.drag`.
- **Toasts** are read through their always-mounted region: `getByRole('status')`, whose text is the title and the detail run together.
- The Jar is a button named "Frasco: N tarjetas…", so the Dock's "Frasco" needs `exact: true` or the Dock's `navigation` scope.
- A finished Card seeded **without** events (a document from before change 3) gets its Card Win from the Jar, so the counter goes 0 → 1: that is how the "counted once" rule shows in e2e.
- A test on a 360 px viewport (`page.setViewportSize`) checks that the Dock scrolls sideways and still reaches "Frasco".
- The Desk Jar is located by value, `[data-jar=""]`: a bare `[data-jar]` would find the first Area Jar once "Frasco por área" is on (#19).

### Area Jars (`e2e/area-jars.spec.ts`, #19)

- Only the first test turns "Frasco por área" on through Settings; the others seed it (`seedWithAreaJars`: `mtf_area_jars = '1'`, then reload). An Area Jar is `[data-jar="<areaId>"]`, all of them `[data-jar]:not([data-jar=""])`.
- **Area Jars hide in the far look**, where the desktop window opens. `zoomInAround(page, point)` zooms with `Ctrl` + wheel around a **Desk** point (converted with `toScreen`, from the world transform) until the near look; `NEAR_VIDA_JAR` keeps a Card at Trabajo's right edge and Vida's Jar both on screen. A hidden Area Jar has no accessible name: after a reload (far look again) its label is checked with `toHaveAttribute('aria-label', …)`.
- The far-look test drops a Card on the spot where Vida's Jar would be (`toScreen` of its center): no question, the Card is just placed.
- The question is a dialog named by it ("¿Pasarla a Vida y llevarla al frasco?"); while it is open the Card keeps `data-lifted`. No and `Esc` are checked against the stored document (nothing written), Sí against the Mis logros row ("Vida · hoy") and a reload.
- **Phone**: the opening view is the first Area's top-left corner, so the phone tests seed a 520 px wide Trabajo, whose Jar is then on screen; the drop holds 450 ms and drags with `Touch.drag`, and the Jar is tapped with `tap()`.

### The Welcome Card (`e2e/welcome.spec.ts`, #20)

- Its id is a fresh uuid, so the spec finds it in `storedData(page)` by its Spanish title ("¡Hola! Esto es MTF") and then uses `deskCard(page, id)`.
- **Readable on the first launch**, on both projects: the world has no `data-far` and the Card is fully in the viewport (`toBeInViewport({ ratio: 1 })`), with its three Item boxes `aria-pressed="false"`. After a reload the desktop window is back to the far look (the usual whole-Desk view), and the same single Card is still there.
- **The Jar on desktop**: "Ver todo" first, so the Card and the Jar are both on screen (far look), then a mouse drop grabbed near the Card's top edge (`grip`). Unchecked: "Todavía no" + "Te faltan 3 elementos". After checking the three Items at the first view (near look) the counter reads 4 (3 Item Wins + 1 Card Win); the drop puts it in and the counter stays 4.
- **Phone**: press and hold 450 ms on the title, then `Touch.drag`; it moves, and no Item becomes checked.
- Delete through the editor and reload: nothing comes back. Settings → "Ver introducción" on a blank Desk places one and shows it in the near look.

### Backup (`e2e/backup.spec.ts`, change 4)

- **Desktop project only** (`test.skip(({ isMobile }) => isMobile, …)` at file level): the phone project emulates a coarse pointer, where Export opens the system share sheet, which Chromium cannot drive. The share path is covered by `deliver.test.ts` and by hand on real phones.
- **Export**: `page.waitForEvent('download')` before the click; the file name is compared with the page's own local date, and the file is read from `download.path()`.
- **Import**: `page.locator('input[type="file"]').setInputFiles(path)` (the input is hidden; Playwright sets files on it directly), then "Reemplazar mis datos". A refused file is given as a `{ name, mimeType, buffer }`.
- The round trip compares `storedData(page)` with the seeded document with `toEqual`, before and after a reload.
- **Offline**: wait for `navigator.serviceWorker.controller`, `context.setOffline(true)`, reload, then export and import, collecting every request whose origin is not the app's (none expected).

The Backup unit tests: `backup.test.ts` (file name at 23:30 in `America/Argentina/Buenos_Aires`, round trip, every refusal, migration), `validate.test.ts` (one test per entity rule), `deliver.test.ts`, `BackupSection.test.tsx`, plus `upgradeDocument`, `requestPersistentStorage` and the nudge flag in `storage.test.ts`.

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

### Merge gate

A GitHub ruleset, **`main: CI must pass`** (Settings → Rules → Rulesets, active since 2026-10-11), protects the default branch:

- **Required status check `check`** (the job above, source GitHub Actions). A PR cannot be merged until it is green, and a commit cannot reach `main` unless it already passed on another ref, so direct pushes to `main` are rejected.
- Branches do **not** have to be up to date with `main` before merging (one developer; re-running CI on every `main` move buys nothing).
- **Block force pushes** and **restrict deletions** on `main`.
- **No bypass list**: nobody, the repo admin included, pushes straight to `main`. The OpenSpec archive (archived change + synced specs) is done on the ticket branch before the PR, so it reaches `main` with the code (decided 2026-10-12, after a direct archive push for change 4 was rejected). Change 4's archive went through its own PR as a one-off.

If the job is renamed in `ci-frontend.yml`, update the required check in the ruleset too, or every PR stays blocked waiting for a check that never reports.

To reproduce CI locally: `CI=1` and the same commands, starting from `command npm ci` (`--with-deps` is Linux-only; locally `command npx playwright install chromium`).
