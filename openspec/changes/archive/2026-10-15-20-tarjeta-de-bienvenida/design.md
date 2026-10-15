# Design

## Context

- The first-run hint is `src/desk/FirstRunHint.tsx`, a `Callout` above the Dock, shown while `mtf_hint_seen` is not `'1'` (`loadHintSeen` / `saveHintSeen` in `storage.ts`). `InstallNudge` also reads `loadHintSeen()` so it never shows on top of the hint. `Callout` stays: the install nudge still uses it.
- `appStore` is created at module load. `createAppStore()` runs `ensureDefaultAreas()`, so by the time anything else runs there is always at least one Area. Notes written are recorded only by `closeCard(id, { isNew: true })`, from the editor of a Card the user created.
- `i18n/index.ts` imports `useAppStore` (for `useT`), so `appStore` cannot import `translate` without a cycle.
- The first view is set in `Desk.tsx` after `document.fonts.ready`, with `initialView(areas, cards, heights, viewport)`. On Playwright's 1280 × 720 window the whole Desk fits at ~37%, and fitting one 980 × 1000 Area gives 56%, right at the far threshold (55%) where Cards show their title only.
- e2e helpers (`openApp`, `seedDesk`) mark the hint as seen by default so it never covers a gesture.

## Goals / Non-Goals

**Goals:**
- The Welcome Card is a plain `Card` built by MTF: no new field, no schema change, no special case in drag, check, Jar or Wins code.
- One place decides "first launch on this device", outside React, so StrictMode and re-renders cannot place it twice.
- The existing unit and e2e tests keep a blank Desk unless a test asks for the Welcome Card.

**Non-Goals:**
- Remembering which Card is the Welcome Card after it is placed.
- Removing the leftover `mtf_hint_seen` value from existing browsers.

## Decisions

### 1. A plain Card, built by a pure function

`src/welcome/welcomeCard.ts` exports `welcomeCard(area, content, { z, now, newId })`, which returns a `Card`: `areaId = area.id`, the content's `title` and `body`, three Items from `content.items` (unchecked, each with its own id and timestamps), `pinned: false`, `jarredAt: null`, tilt 0, and position `(area.x + 70, area.y + 150)`. That spot is the top-left of what `spotIn` uses: inside the part of the Area that `areaView` shows on a phone, and below the label. `content` is `{ title, body, items: [string, string, string] }`.

- *Why not a `kind: 'welcome'` field on `Card`?* It would be a schema change (a migration, Backup validation, ADR 0006 tests) only to support behavior we decided not to build (auto-checking, finding the earlier one). A plain Card also travels in a Backup and behaves on another device exactly like any Card.
- *Why tilt 0?* The first thing a new user reads should sit straight. The first drag gives it a random tilt like any Card.

### 2. Content translated by the caller, placed by the store

`appStore` gets `placeWelcomeCard(content): string | undefined`. It puts `welcomeCard(data.areas[0], content, …)` on top (`topZ`) in one `data` replacement and returns its id (`undefined` with no Area, which `ensureDefaultAreas` prevents). It writes **no event**: placing is not a note written, and there is nothing to check yet. Checking, finishing, jarring and deleting it then go through the existing actions and Win rules, untouched.

The content is built by the caller with `translate(language, …)` from five new keys (`welcomeTitle`, `welcomeBody`, `welcomeDrag`, `welcomeCheck`, `welcomeJar`). This keeps the store free of the i18n import cycle and makes the "current language" rule explicit at the call site. Proposed copy:

| | ES | EN |
|---|---|---|
| Title | ¡Hola! Esto es MTF | Hi! This is MTF |
| Text | Tu escritorio para anotar. Probá esto: | Your desk for notes. Try this: |
| Item 1 | Arrastrame a otro lugar (en el celu, mantené apretado y mové) | Drag me somewhere else (on a phone, press and hold, then move) |
| Item 2 | Tildá este ítem | Check this item |
| Item 3 | Tildá todo y llevame al frasco | Check everything and drop me in the jar |

- *Why the first Area?* It is the one `initialView` and the Dock list first, and it exists on every Desk. The Area at the center of the view would depend on the viewport, which is not known before the first render.

### 3. Once per device: a start-up step, a new device key

`src/welcome/welcome.ts` exports `welcomeContent(language)` and `placeWelcomeOnce()`. `main.tsx` calls `placeWelcomeOnce()` before rendering, next to `listenForInstall()`. If `loadWelcomePlaced()` is false it calls `placeWelcomeCard(welcomeContent(store.language))`, then `saveWelcomePlaced()`, and sets `deskStore.focusCardId` to the new id.

The key is `mtf_welcome_placed` (`'1'` once placed), a device setting like `mtf_theme`: not in `mtf_data`, not in the Backup, and an Import leaves it alone. `HINT_SEEN_KEY`, `loadHintSeen` and `saveHintSeen` are removed.

- *Why a new key instead of reusing `mtf_hint_seen`?* Devices that dismissed the hint must still get the Welcome Card once (acceptance criterion). Reusing the key would skip them.
- *Why outside React?* A `useEffect` in `App` runs twice under StrictMode in development and runs in every `App` component test. A module-level step runs once per page load, and component tests (which never import `main.tsx`) keep their blank Desk with no setup.
- *Why not in `createAppStore()`?* Every store test creates a store on empty storage and would get an unexpected Card.

### 4. The first view frames the Welcome Card

`deskStore` gets `focusCardId: string | null` (unsaved, `null` by default), "the Card the first view shows". `Desk.tsx`'s first-view effect uses `welcomeView(area, card, height, viewport)` when `focusCardId` names a Card on the Desk, then clears it; otherwise it uses `initialView` as today.

`welcomeView` (in `geometry.ts`, next to `areaView` and `cardView`): on a phone-width viewport (`< PHONE_WIDTH`) it is `areaView(area)`, which shows the Area's top-left corner at 62–100% zoom, where the Card sits. Wider, it is `cardView(card, height)` (the Card with 200 / 120 px of paper around it, capped at 100%). On 1280 × 720 that is about 0.9, well into the near look.

- *Why not `areaView` everywhere?* On 1280 × 720 it fits the Area at 56%, at the far threshold: one small window resize and the Card shows only its title.
- *Why `focusCardId` and not a flag?* The id is what the Desk needs, and "Ver introducción" can reuse the same function directly.

### 5. "Ver introducción" in Settings

A new `src/welcome/WelcomeSection.tsx`, last in the Settings sheet after Install, following `BackupSection` / `InstallSection`: a group heading ("Introducción" / "Introduction") and a `Button` "Ver introducción" / "See the introduction", with an `onShow` prop. `App.tsx` passes a handler that closes Settings, calls `placeWelcomeCard(welcomeContent(language))` and flies to `welcomeView(…)` with the Card's measured height (the fallback 160 px if it is not rendered yet). It does not touch `mtf_welcome_placed` and always places a new Card.

### 6. Install nudge and tests

- `InstallNudge` drops `loadHintSeen()` from its condition. The Welcome Card writes no `note` event, so it cannot trigger the nudge; the nudge still waits for a Card the user keeps.
- `FirstRunHint.tsx`, its test, the `hint` / `hintOk` strings, and the e2e hint test are removed.
- e2e: `openApp` and `seedDesk` take `{ welcome = false }`. Unless it is `true`, they set `mtf_welcome_placed` with `page.addInitScript` **before** the first `goto`. Setting it after the first load (as the hint was) would be too late: that first load would already have placed and saved a Welcome Card in `mtf_data`. `addInitScript` is safe here because it only writes the flag, never the data (the testing KB's warning is about `mtf_data`).

## Risks / Trade-offs

- [The Welcome Card covers the user's own Cards in the first Area on an existing device] → It is placed on top in the Area's top-left spot on purpose, so it is seen. One drag, Tidy up, or the Jar clears it. It is placed once.
- [Storage refuses to write] → `mtf_welcome_placed` is not saved, so each launch places a Welcome Card again. But `mtf_data` is not saved either, so each launch starts from the same in-memory Desk: there is never more than one.
- ["Ver introducción" tapped several times leaves several Welcome Cards] → Accepted in the proposal; each one is an ordinary Card the user can delete or finish.
- [The Card's text stays in the language it was placed in] → Accepted in the proposal; it is the user's Card from then on.
- [A Backup made on a device with a Welcome Card carries it to another device, which places its own too] → Two Welcome Cards there, both ordinary. Rare, harmless, and deleting one is enough.

## Migration Plan

No data migration. On the first load of the new version, every device without `mtf_welcome_placed` (all of them) gets one Welcome Card. `mtf_hint_seen` stays in old browsers, unread. Rolling back leaves the Welcome Card as an ordinary Card; the old hint would come back only on devices that never dismissed it.
