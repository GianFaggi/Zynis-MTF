# Proposal

## Why

After change 2, MTF works as a free notepad, but checking an Item only flips a box: nothing records what the user got done, and there is nowhere for finished Cards to go. Change 3 adds the half of the idea that makes MTF more than a notepad. Every Item checked and every Card finished counts as a Win, finished Cards go into a Jar that fills up, and Mis logros shows the week's effort. It only ever counts up; nothing punishes quiet days.

## What Changes

- **Win events**: checking an Item, finishing a Card and writing a new Card are recorded as events in the existing `events` list (`item`, `card`, `note`). Unchecking an Item removes its event. A Card has a Card Win only while it is finished: adding an unchecked Item takes it away, and finishing the Card again brings it back, once. The checked Items keep their Wins, which is the partial credit for a half-done Card. Wins go away with what they count: deleting a Card removes all its Wins and its note, and removing a checked Item removes its Win. (Decided with the user after the first review.)
- **Finished Cards**: a Card whose Items are all checked shows a "Llevala al frasco" chip in the accent color instead of `n/m`. Finishing one shows a short celebration (toast and sparks).
- **The Jar** sits on the Desk below the Areas. Dropping a Card on it:
  - **accepts** finished Cards and Cards without Items. The Card shrinks into the Jar, a paper piece in its Area color drops in, there are sparks and a toast, and the counter bumps.
  - **refuses** Cards with unchecked Items. The Card slides back to where the drag started, with "Todavía no · Te faltan N elementos".
  Cards in the Jar leave the Desk but are kept. Tapping the Jar opens Mis logros, and the Dock gets a "Frasco" button that flies to it.
- **Non-drag path**: the Card editor gets a "Llevar al frasco" button with the same accept / refuse rules, so keyboard users can use the Jar too, the same way Place lets them move Cards without dragging. (Decided with the user while proposing.)
- **Mis logros** sheet: things done in the last 7 days (big number), with items checked, Cards finished and notes written (shown more quietly); a bar per day for the last 7 days, today in the accent; the best day plus "Los días tranquilos también cuentan"; the total since you started; and the list of Cards in the Jar, each with **Devolver** to take it back out to its Area.
- **Wins counter**: always visible in the top-right tools pill, showing things done in the last 7 days. It opens Mis logros and bumps on each new Win. It uses the 7-day number, like the mockup and the Mis logros hero number; the all-time total is in Mis logros. (Decided with the user while proposing.)
- **Toast**: a new closed-API UI kit component for the short messages above (ink fill, never the accent), announced to screen readers.
- `prefers-reduced-motion` also turns off sparks, the Card going into the Jar, the slide back, the piece drop and the counter bump.

### Acceptance criteria → scope

| Issue #3 criterion | Covered by |
|---|---|
| Each checked Item, finished Card and new note records a Win (and unchecking an Item removes it) | `wins`: win events |
| A Card with all its Items checked becomes finished, with the "Llevala al frasco" notice | `cards`: Finished Card, Card on the Desk |
| The Jar accepts finished Cards or Cards without Items, and refuses those with pending Items (they go back with a notice) | `jar`: drop a Card on the Jar, refused Cards go back, Put in the Jar from the editor |
| The Jar fills with one paper piece in the Area color per Card, with an animation on entry | `jar`: the Jar fills up |
| Mis logros: things done in the last 7 days, bars per day, notes written and total since you started | `wins`: Mis logros |
| List of Cards in the Jar with "Devolver" to take them out | `jar`: take a Card out of the Jar |
| Wins counter always visible | `wins`: wins counter |
| Tests for the Win and Jar rules, and a Playwright test that drops a Card in the Jar | Unit tests for the pure Win, stats and Jar helpers and the store actions; Playwright for mouse drop, refusal, touch hold-and-drop and Devolver |

### Out of scope

- Export / Import and the persistent storage request (change 4, #4). Win events are already part of `mtf_data`, so the Backup will carry them.
- Custom Areas (#7). The Jar's position is derived from the stored Areas, so it follows them when they change.
- Editing a Card while it is in the Jar. It has to be taken out first.
- Streaks, goals, notifications, or any message about days with no Wins (against the "positive only" rule).
- Exporting Wins to a sheet / CSV, and syncing events between devices (V2 backlog).

## Capabilities

### New Capabilities

- `wins`: what counts as a Win and when it is recorded or removed, the always-visible wins counter, and the Mis logros view (last 7 days, per-day bars, notes written, best day, total since you started).
- `jar`: the Jar on the Desk: where it is, dropping Cards on it (accept / refuse), how it fills up, opening Mis logros from it, flying to it from the Dock, putting a Card in from the editor, and taking Cards back out with Devolver.

### Modified Capabilities

- `cards`: new Finished Card requirement; Card on the Desk shows the "Llevala al frasco" chip on a finished Card and leaves Cards in the Jar off the Desk.
- `desk`: See all also fits the Jar; the accent rule now allows the Jar, finished-Card chips and checked Items; reduced motion also covers the new animations.
- `app-shell`: the accent rule now allows the wins counter in the floating tools pill.

## Impact

- **New code**: `src/wins/` (pure Win rules, weekly stats, Jar geometry and fill, plus the `Jar`, `WinsCounter`, `MisLogros` and chart components), `src/components/ui/Toast.tsx`, new `appStore` actions (`jarCard`, `returnCard`) and Win logic inside `toggleItem` / `closeCard`, toast / Mis logros / bump state in `deskStore`, a Jar drop branch in `Desk.tsx`, a chip in `DeskCard.tsx`, a "Frasco" button in `Dock.tsx`, a "Llevar al frasco" button in `CardEditor.tsx`, the counter in `App.tsx`, new ES/EN strings.
- **Paint**: `--color-accent-soft` and a chart-bar token (light + dark), keyframes for drop, pop, bump and sparks in `src/index.css`.
- **Data**: no schema change. `MtfData` v1 already has `events: WinEvent[]` and `Card.jarredAt`. No migration.
- **Dependencies**: none. The chart is hand-drawn SVG and the animations are CSS (stack.md: a motion library is V2, and only if CSS falls short).
- **Tests**: new unit tests for the pure helpers, store and components; new `e2e/jar.spec.ts`; `See all` / initial-view e2e expectations may shift because the Jar is part of the Desk bounds.
- **Docs**: desk.md (the Jar section becomes real), architecture.md (Win rules, new actions, `src/wins/`), storage.md (how events are written), design-system.md (new tokens, Toast, accent uses), testing.md, roadmap.md, GLOSSARY.md (Win and Finished Card sharpened).
