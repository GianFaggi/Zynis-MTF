# Tasks

## 1. Mockup (gate: approved before any app code)

- [x] 1.1 Write `design/mtf-mockup-avion.html` in the shape of `design/mtf-mockup-finished-card.html` (Paper tokens as CSS variables, a light/dark toggle, Spanish copy). It shows: the `PlaneWait` block inside a sheet-like panel, with the plane looping along a soft arc (out on the right, back in on the left) over a dotted pencil trail that draws itself (`fly` + `trail`, design decision 3); buttons that play the timeline (a "x10" speed toggle so 90 s can be watched quickly) and jump to each stage (Entrando, Conectando, Despertando, Ya casi, No pudimos conectar); the tools pill with the 38 px `Send` indicator swaying (`sway`); and a "movimiento reducido" toggle showing the still plane on the whole trail. Verify: no accent anywhere, it reads in both themes, and it works at phone width
- [x] 1.2 Ask the user to open the mockup and approve it (or adjust the arc, timings, sizes and copy until they do); copy the approved keyframe stops and sizes into design.md decision 3 if they changed; verify the user said it is approved before group 2 starts

## 2. Keyframes and the plane

- [x] 2.1 Add `--animate-fly`, `--animate-trail` and `--animate-sway` with their keyframes to the `@theme static` block of `src/index.css`, after the Win keyframes, with the approved stops; verify `command npm run build` passes and the utilities `animate-fly`, `animate-trail`, `animate-sway` exist in the built CSS
- [x] 2.2 Write `src/sync/PaperPlane.tsx`: the inline SVG (ink stroke, `sheet` fill, dotted `pencil` trail, `aria-hidden`) with a `flying` prop that adds the `fly` / `trail` classes; at rest it sits mid-arc with the trail fully drawn (design decision 3). Add `PaperPlane.test.tsx`: verify `flying` adds and removes the animation classes, the SVG is hidden from assistive tech, and no class or style uses `accent`
- [x] 2.3 Add the design-system docs for this group to [KB/frontend/design-system.md](../../../KB/frontend/design-system.md): the three keyframes in the tokens table (as for `rise` … `spark`), and a rule "the paper plane is the sign of sync: ink and paper, never the accent", in the Rules section and next to the accent table; verify the table's format matches its other rows

## 3. The wait timeline

- [x] 3.1 Write `src/sync/wait.ts` with `WAIT_STEPS`, `waitStage(elapsedMs)` and `INDICATOR_DELAY` (design decision 2), and `wait.test.ts`; verify the edges (0, 1 499, 1 500, 7 999, 8 000, 29 999, 30 000, 89 999, 90 000 and far beyond) each return the right stage
- [x] 3.2 Add the six message keys to `src/i18n/locales/es.ts` and `en.ts` (design decision 6); verify `command npm run build` typechecks `en` against `es`
- [x] 3.3 Write `src/sync/useWaitStage.ts` (start recorded once when it mounts, one timeout to the next threshold, stage worked out from `Date.now() - start`, cleared on unmount) and `src/sync/PlaneWait.tsx` (fixed-height stage + always-mounted `<p role="status" aria-live="polite">`, plane hidden during `entering`, flying from `connecting`, still at `failed`; design decision 4)
- [x] 3.4 Write `src/sync/PlaneWait.test.tsx` with `vi.useFakeTimers()` and `act(() => vi.advanceTimersByTime(…))`; verify every scenario of the `server-wait` spec it covers: only "Entrando…" and no plane at 1.4 s; unmounting at 1 s never showed the plane; the plane flies with "Conectando…" at 1.5 s; the waking message at 8 s; "Ya casi…" at 30 s; the plane is still with the positive 90 s message; no progressbar role at any stage; the message sits in a polite live region; English copy at 1.5 s; jumping straight to "Ya casi…" when the clock moves 40 s in one step (background tab); unmounting mid-wait leaves no pending timer (`vi.getTimerCount() === 0`)

## 4. The sync indicator

- [x] 4.1 Write `src/sync/SyncIndicator.tsx`: nothing until `INDICATOR_DELAY`, then a 38 px `span role="img"` named `t('syncing')` with lucide `Send` (ink-2, 18 px) and `animate-sway` (design decision 5)
- [x] 4.2 Write `src/sync/SyncIndicator.test.tsx` with fake timers; verify nothing is rendered at 1 999 ms, the indicator is named "Sincronizando…" at 2 000 ms (and "Syncing…" in English), it never appears when unmounted at 1.5 s, it never uses `accent`, and no timer stays pending after unmount

## 5. Dev-only preview

- [x] 5.1 Write `src/sync/PlanePreview.tsx` (design decision 7): the Despierto (0.8 s), Dormido (40 s) and No contesta buttons; a sheet-like panel showing `PlaneWait` while pending, then "¡Listo!"; a copy of the tools pill holding `SyncIndicator` while pending; the language and theme selectors. No test: it is a dev tool, not shipped
- [x] 5.2 In `src/main.tsx`, when `import.meta.env.DEV` and `?avion` are both present, import `./sync/PlanePreview` dynamically and render it instead of `<App />`, skipping `placeWelcomeOnce()`; keep the normal path unchanged; verify `command npm run dev` opens the preview at `/?avion` and the normal app at `/`
- [x] 5.3 Verify the preview stays out of production: run `command npm run build` and check that `dist/` contains no `PlanePreview` chunk and none of its preview-only strings (e.g. "No contesta"), and that the precache manifest lists no extra chunk

## 6. Docs and glossary

- [x] 6.1 Add `src/sync/` to the files table of [KB/frontend/architecture.md](../../../KB/frontend/architecture.md) (pure `wait`, `useWaitStage`, `PaperPlane`, `PlaneWait`, `SyncIndicator`, the dev-only `PlanePreview` behind `?avion`) and note the `main.tsx` dev branch in the `src/main.tsx` row; verify the links resolve
- [x] 6.2 Add **Paper plane** (ES **avión de papel**) to [GLOSSARY.md](../../../GLOSSARY.md) (design decision 9); add the fake-timers pattern for waits (`vi.useFakeTimers()` + `advanceTimersByTime` + `vi.getTimerCount()`) to the conventions in [KB/frontend/testing.md](../../../KB/frontend/testing.md); mark #35 in [KB/roadmap.md](../../../KB/roadmap.md); verify each entry matches the code as built

## 7. Integration

- [x] 7.1 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e` (no gesture changed, but `main.tsx` did, and e2e runs the production build); verify all pass
- [x] 7.2 Manual check on the phone through the preview (`command npm run dev -- --host`, `http://<pc-ip>:5173/?avion`): Despierto shows no plane; Dormido flies smoothly and shows each message; No contesta reaches the positive 90 s message with the plane at rest; the indicator sways in the pill; both themes, both languages, and reduced motion on (plane still, same messages); verify the user confirms
- [x] 7.3 Clean-code pass over `src/sync/` (naming and comment density match `src/wins/`, no duplicated thresholds outside `wait.ts`, no hex values in TypeScript); fill Technical Context, Modified Files and Pending in `KB/developers/active.md`; verify `openspec validate 35-avion-de-papel --strict` passes

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (merges the new `server-wait` spec into `openspec/specs/`), then the user commits, pushes and opens the PR.
- After the merge, on an up-to-date `main`: `/close-ticket`, then `/select-ticket 36`.
