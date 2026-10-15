# Tasks

## 1. The Welcome Card (pure) and its copy

- [x] 1.1 Add the ES/EN strings `welcomeTitle`, `welcomeBody`, `welcomeDrag`, `welcomeCheck`, `welcomeJar`, `introduction` (section heading) and `seeIntro` (button), with the copy in design.md §2; verify the i18n key-parity test passes
- [x] 1.2 Create `src/welcome/welcomeCard.ts` with `welcomeCard(area, content, { z, now, newId })` and `src/welcome/welcome.ts` with `welcomeContent(language)` (design.md §1, §2); verify in `welcomeCard.test.ts`: the Card is in the given Area at `(x + 70, y + 150)`, tilt 0, `z` as given, three unchecked Items with distinct ids in order, `jarredAt: null`, not pinned, `createdAt` = `updatedAt` = `now`; `welcomeContent('en')` and `welcomeContent('es')` return the English and Spanish copy
- [x] 1.3 Add `welcomeView(area, card, height, viewport)` to `src/desk/geometry.ts` (design.md §4); verify in `geometry.test.ts`: on a 390 px viewport it equals `areaView(area)` and the Card lies inside the view at ≥ 55%; on 1280 × 720 it equals `cardView(card)` with a scale ≥ 0.55 and the Card fully in view

## 2. Store, device key and start-up

- [x] 2.1 Add `loadWelcomePlaced()` / `saveWelcomePlaced()` for `mtf_welcome_placed` to `src/lib/storage.ts` and remove `HINT_SEEN_KEY`, `loadHintSeen`, `saveHintSeen` (design.md §3); verify in `storage.test.ts`: `'1'` reads placed, missing / junk / a refused read read not placed, a refused write does not throw; no hint test remains
- [x] 2.2 Add `placeWelcomeCard(content)` to `appStore` (design.md §2); verify in `appStore.test.ts`: the Card lands in the first Area on top of every Card, other Cards are unchanged, no event is written, it is saved; checking its three Items records 3 Item Wins and 1 Card Win and no `note`; opening and closing it with `closeCard(id)` records no note; two calls place two Cards
- [x] 2.3 Add `focusCardId` to `deskStore` (default `null`, also reset by `getInitialState`) and `placeWelcomeOnce()` to `src/welcome/welcome.ts`, called from `main.tsx` before rendering (design.md §3, §4); verify in `welcome.test.ts`: with no key it places one Welcome Card in the store's language, saves the key and sets `focusCardId`; with the key set it does nothing; on a store already holding the user's Cards it places one on top and changes none of them
- [x] 2.4 In `Desk.tsx`'s first-view effect, use `welcomeView` when `focusCardId` names a Card on the Desk, then clear it (design.md §4); verify in the dev server with storage cleared: the Welcome Card is in view and readable on a phone width and on a 1280 × 720 window, and a reload shows the usual first view
- [x] 2.5 Update [KB/frontend/storage.md](../../../KB/frontend/storage.md) (new key `mtf_welcome_placed`, `mtf_hint_seen` no longer used, the storage functions, device keys never in the Backup) and [KB/frontend/architecture.md](../../../KB/frontend/architecture.md) (`placeWelcomeCard`, `focusCardId`, the start-up step in `main.tsx`, `src/welcome/` in the folders table); verify every name written exists in the code

## 3. Replace the hint, "Ver introducción"

- [x] 3.1 Remove `FirstRunHint.tsx`, its test, its use in `App.tsx`, and the `hint` / `hintOk` strings; drop `loadHintSeen()` from `InstallNudge`'s condition and update its comment and the `Callout` comment (design.md §6); verify `InstallNudge.test.tsx` still passes and a new case shows that placing a Welcome Card on an iPhone does not show the nudge; `grep -ri hint src` finds no first-run hint left
- [x] 3.2 Add `src/welcome/WelcomeSection.tsx` (heading + "Ver introducción" `Button`, `onShow`) last in the Settings sheet, and the `App.tsx` handler: close Settings, `placeWelcomeCard(welcomeContent(language))`, fly to `welcomeView` (design.md §5); verify in `WelcomeSection.test.tsx` / `App.test.tsx`: activating it closes Settings and adds one Welcome Card on top in the first Area; with one already on the Desk a second is added and the first is unchanged; in English the new Card is in English; the section uses no accent class
- [x] 3.3 Update [KB/frontend/desk.md](../../../KB/frontend/desk.md) (files table without `FirstRunHint`, initial view with `welcomeView` and `focusCardId`), [KB/frontend/pwa.md](../../../KB/frontend/pwa.md) (nudge condition without the hint) and [KB/frontend/design-system.md](../../../KB/frontend/design-system.md) (`Callout` used by the install nudge only); verify no KB still describes the first-run hint as current (`grep -rn "first-run hint" KB`)

## 4. End-to-end

- [x] 4.1 Change `openApp` / `seedDesk` in `e2e/helpers.ts` to `{ welcome = false }`, setting `mtf_welcome_placed` with `page.addInitScript` before the first `goto` unless `welcome` is true; remove the hint test from `base-screen.spec.ts` (design.md §6); verify the existing e2e suite passes unchanged on both projects
- [x] 4.2 Write `e2e/welcome.spec.ts`: a first launch shows the Welcome Card with three unchecked Items, readable (near look), on desktop and phone; a reload keeps exactly one; a device seeded with Cards and no key gets one Welcome Card on top and keeps its Cards; dropping it on the Jar unchecked is refused with "Todavía no"; checking all three Items (counter +4: 3 Items + 1 Card) and dropping it on the Jar puts it in; deleting it and reloading places none; Settings → "Ver introducción" places a new one; a phone test moves it with press and hold (`Touch.drag`); verify `command npm run test:e2e` passes on both projects
- [x] 4.3 Update [KB/frontend/testing.md](../../../KB/frontend/testing.md) (helpers take `welcome`, the flag set by `addInitScript` and why, the Welcome Card e2e notes); verify the helper table matches `e2e/helpers.ts`

## 5. Docs and integration

- [x] 5.1 Check [GLOSSARY.md](../../../GLOSSARY.md) (**Welcome Card**, **Note written**) against the final copy, and tick #20 in [KB/roadmap.md](../../../KB/roadmap.md) (the first-run hint line marked as replaced by the Welcome Card); verify the terms match the UI
- [x] 5.2 Clean-code pass over the new code (one builder for both entry points, no special case for the Welcome Card in drag / check / Jar / Wins code, names consistent with the rest of `src/`, comments only where the why is not obvious); verify lint and tests still pass
- [x] 5.3 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass with no warnings, and fill Technical Context / Modified Files in `KB/developers/active.md`
- [x] 5.4 Check by hand in the dev server at phone and desktop width, in light and dark, in ES and EN: the first view on a cleared device, the Welcome Card's text fits its 236 px width without awkward wrapping, the three steps work, "Ver introducción" from Settings; verify nothing uses the accent before an Item is checked
- [x] 5.5 (User) On a real Android phone and an iPhone, installed, after clearing the site data: the Welcome Card appears and is readable, press and hold moves it, its Items check, it goes into the Jar; on a device that already had data, it appears once

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (creates `openspec/specs/welcome/` and merges the `desk` and `pwa-offline` deltas), then the user commits, pushes and opens the PR.
- After the merge, on an up-to-date `main`: `/close-ticket`.
