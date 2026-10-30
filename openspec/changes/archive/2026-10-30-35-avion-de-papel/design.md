# Design

## Context

See proposal.md (Why). Nothing in MTF talks to a server yet: #36 (Accounts) and #37 (Sync) will be the first. This change builds what they will put on screen and nothing that needs the backend.

What is already in place and shapes the approach:

- **Keyframes** live as `--animate-*` tokens in the `@theme static` block of `src/index.css` (`rise`, `drop`, `bump`, `pop`, `stamp`, `spark`), which gives Tailwind utilities such as `animate-rise`. A global `@media (prefers-reduced-motion: reduce)` rule sets `animation: none !important` on every element ([design-system.md](../../../KB/frontend/design-system.md)).
- **The accent is reserved for Wins.** Feature components that use it live outside `src/components/ui/`. The plane must never use it.
- **Live regions**: `Toast` keeps its `role="status" aria-live="polite"` region always mounted, so each new message gets announced. The wait copies that pattern.
- **Feature components read `useT()`**; the closed-API kit gets its texts as props. The plane pieces are feature components.
- **Timers in tests**: the testing KB already fakes all timers and uses `advanceTimersByTime` for time-driven logic (`useWinStats.test.ts`).
- **The tools pill** in `App.tsx` holds 38 px round items (`IconButton`, `WinsCounter`). The indicator is designed for that slot, but this change does not mount it.

## Goals / Non-Goals

**Goals:**
- Pieces that #36 and #37 can drop in with no extra wiring: mounting one starts its wait and unmounting it ends the wait.
- All motion in CSS, so reduced motion needs no JavaScript and the global rule covers it.
- A timeline that is easy to test, written as a pure function of elapsed time.
- A way to watch it in the real app before the backend exists, with nothing of it in production.

**Non-Goals:**
- Making requests, retrying, cancelling, or deciding what happens after the 90 s message. Those belong to the caller.
- A full-screen loading screen. MTF opens offline from the precache and never waits for the server to start.

## Decisions

### 1. Mounted means waiting

`PlaneWait` and `SyncIndicator` take no `active` prop. The wait starts when the component mounts and ends when it unmounts. #36 will render `{pending && <PlaneWait />}` in its sign-in sheet, and #37 will do the same in the tools pill.

- *Why*: this way there is no start/stop state to get out of step with the request, and a remount restarts the timeline on its own. The same approach is already used to replay the wins counter's bump.
- *Alternative*: an `active` boolean plus internal reset logic. It adds one more state to keep in step and buys nothing.

### 2. The timeline is a pure function of elapsed time

`src/sync/wait.ts` holds a `WAIT_STEPS` table (`entering` 0 ms, `connecting` 1 500, `waking` 8 000, `almost` 30 000, `failed` 90 000) and `waitStage(elapsedMs)`, which returns the last step reached. A hook, `useWaitStage()`, records `Date.now()` once when it mounts (`useState` initializer, so StrictMode's second effect run keeps the same start). It then schedules **one** `setTimeout` to the next threshold and, when that fires, works the stage out again from `Date.now() - start`.

- *Why elapsed time, not chained delays*: a phone throttles timers in a background tab. Working the stage out from the clock means that when the user comes back after 40 s, the wait jumps straight to "Ya casi…" without going through every message on the way.
- *Why one timeout, not an interval*: five renders in 90 s instead of 90.
- `nextStepAt(elapsedMs)`, also in `wait.ts`, gives the hook the next threshold (or `null` after 90 s), so no threshold is written anywhere else.
- Tests drive `waitStage` directly at the edges (1 499 / 1 500 ms…), and drive the components with `vi.useFakeTimers()` (all timers, which also fakes `Date`) and `act(() => vi.advanceTimersByTime(…))`, in 100 ms steps: the hook schedules its next timeout from a render, and a test renders only when an `act` ends.

`SyncIndicator` needs only "past 2 s". It keeps its own single timeout (`INDICATOR_DELAY = 2000`, exported from `wait.ts`) and renders nothing until it fires.

### 3. The plane is inline SVG moved by CSS keyframes

`PaperPlane` is an inline SVG: a folded plane with `stroke: var(--color-ink)` and `fill: var(--color-sheet)`, plus a dotted trail path in `--color-pencil`. The dots come from `stroke-dasharray: 0 6` with `stroke-linecap: round`. Three new tokens go in `@theme static`, next to the Win keyframes:

| Token | What |
|---|---|
| `--animate-fly` | `fly`, 3.2 s, linear, infinite. Eleven stops of `translate` + `rotate`, sampled at equal arc length on the curve `M-20 58 C70 6 230 6 340 44` (constant speed), trace a soft arc from 0 % to 88 %: it enters from beyond the left edge at −30°, passes the middle almost level and glides out past the right edge at +19°. From 88 % to 100 % it waits off-screen, so the loop reads "out on the right, back in on the left". |
| `--animate-trail` | `trail`, same duration and timing as `fly`. It reveals the dotted arc just behind the plane by animating `clip-path: inset(0 R% 0 0)` from 100 % to 0 % at the same stops (R = 100 − (x − 14) / 320), then fades to opacity 0 between 88 % and 96 % while the plane is away, so a full trail never vanishes at once. |
| `--animate-sway` | `sway`, about 1.6 s, ease-in-out, infinite alternate. A small `rotate` (±8°) and `translate` (±1 px) on the indicator's icon. |

The issue names only `fly`. `trail` and `sway` are added because a dotted trail and a sway cannot share one keyframe. They follow the same naming and the same reduced-motion rule.

- **One coordinate system (approved in the mockup).** The plane and the trail live in a 320 × 72 scene (`viewBox="0 0 320 72"`), `width: min(100%, 320px)` with `aspect-ratio: 320 / 72`, so on a narrow sheet everything scales evenly and the plane and its trail cannot drift apart. The plane is a `<g>` inside the scene's SVG, drawn around (0, 0) with its nose to the right (about 24 units wide: a `sheet` wing and a `paper` keel, 1.4 ink stroke), so `translate` in the keyframes is in scene units. The trail is a second SVG with the same `viewBox` stacked on top, clipped as a whole. A `mask-image` gradient (transparent → black at 12 % and 88 % → transparent) fades the scene's edges, so the plane fades out on the right and back in on the left instead of being cut.
- **Resting state = the reduced-motion picture.** With no animation, the plane's own style puts it in the middle of the arc and the trail is fully drawn. The global rule removes the animations, so reduced motion shows a still plane on a whole trail with no extra code. The 90 s "failed" stage drops the animation classes, so the plane comes to rest in that same position.
- *Why not `offset-path`*: it follows a path naturally, but it is newer on iOS Safari, and stepped keyframes are enough for a soft arc. The mockup tunes the stops.
- *Why not a library (Lottie, Framer Motion)*: the stack rules say no new library without a reason, and three keyframes are enough.

### 4. `PlaneWait` is a block, not a screen

`PlaneWait` renders the plane's scene (decision 3: at most 320 × 72, centered, soft edges) and under it the message. It is meant to sit inside a sheet. The message sits in an always-mounted `<p role="status" aria-live="polite">`, so every stage change is announced. The SVG is `aria-hidden`.

- During `entering` the stage keeps its height but stays empty. That way the message does not jump when the plane appears at 1.5 s.
- Message styles: Figtree 15 px in `ink-2`. The 90 s message uses the same style: there is no danger red and no warning icon, because it is not an error the user caused.

### 5. `SyncIndicator` is a quiet 38 px slot

It is a `span` with `role="img"` and `aria-label={t('syncing')}`, the size of an `IconButton`, holding lucide's `Send` icon (stroke ink-2, 18 px) with `animate-sway`. It is not a button: there is nothing to press while syncing.

### 6. Copy

The keys go in `src/i18n/locales/es.ts` (`en.ts` is typed from it):

| Key | es | en |
|---|---|---|
| `waitEntering` | Entrando… | Signing in… |
| `waitConnecting` | Conectando… | Connecting… |
| `waitWaking` | El servidor se está despertando. La primera vez del día puede tardar hasta un minuto. | The server is waking up. The first time each day it can take up to a minute. |
| `waitAlmost` | Ya casi… | Almost there… |
| `waitFailed` | No pudimos conectar ahora. Tu escritorio sigue funcionando; probá en un rato. | We couldn't connect right now. Your desk still works; try again in a while. |
| `syncing` | Sincronizando… | Syncing… |

### 7. A dev-only preview behind `?avion`

`src/main.tsx` checks `import.meta.env.DEV && new URLSearchParams(location.search).has('avion')` first. When both are true, it imports `./sync/PlanePreview` dynamically and renders it **instead of** `<App />`. It skips `placeWelcomeOnce()`, so trying the preview never places a Welcome Card in the dev data. In a production build Vite replaces `import.meta.env.DEV` with `false`, Rollup removes the dead branch, and the preview chunk is never emitted. So it cannot reach the precache or users. A task checks `dist/` for this.

`PlanePreview` is a paper page with:
- three buttons that simulate a server: **Despierto** (answers in 0.8 s, which proves there is no flicker), **Dormido** (answers in 40 s) and **No contesta** (never answers, which reaches the 90 s message);
- a sheet-like panel that shows `PlaneWait` while the simulated request is pending, then "¡Listo!";
- a copy of the tools pill holding `SyncIndicator` while the request is pending;
- the language and theme selectors (the existing `Segmented`, `setLanguage`, `applyTheme`), so you can check both languages and both palettes.

To check it on a phone: `command npm run dev -- --host`, then open `http://<pc-ip>:5173/?avion`.

- *Alternative rejected*: a hidden button in Settings. It would ship to users and have to be removed in #36.

### 8. Where it lives

There is a new folder, `src/sync/`, which #36 and #37 will grow: `wait.ts` (pure), `useWaitStage.ts`, `PaperPlane.tsx`, `PlaneWait.tsx`, `SyncIndicator.tsx`, `PlanePreview.tsx`, with tests next to each piece, following the existing folders.

### 9. Glossary

**Paper plane** (ES **avión de papel**) is the sign that the Desk is travelling between devices, or that MTF is waiting for its server. It is ink and paper, never the accent. *Avoid*: spinner, loader, progress bar.

There is no ADR: nothing here is hard to reverse, with no data, storage or library choice involved.

## Risks / Trade-offs

- [The keyframe arc can look stiff with stepped stops] → The mockup is a gate: the stops get tuned there and copied as they are.
- [`clip-path` on the trail and `translate` on the plane can drift apart on a slow phone] → Both use the same duration and linear timing on the same element tree, and nothing breaks if they drift a little. Checked on the phone through the preview.
- [The 2 s indicator threshold and the 1.5 s plane threshold differ] → This is on purpose: the indicator appears in a corner during normal use, so it waits a bit longer than a wait the user started themselves. Both are constants in `wait.ts`.
- [A timeout keeps running after unmount] → The hooks clear their timeout on cleanup. A test unmounts mid-wait and advances the timers with no warnings.

## Migration Plan

None. The pieces ship unused, apart from the dev preview, and production behavior does not change.
