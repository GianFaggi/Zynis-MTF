# Proposal

## Why

V2 puts the backend on Render Free ([ADR 0009](../../../docs/adr/0009-v2-backend-hosting.md)). After 15 minutes without use the server falls asleep, and the first request then takes about a minute. Without good feedback, signing in (#36) or syncing (#37) will look broken right when the user first tries it. MTF needs one calm, recognizable sign for "your desk is travelling between devices": a **paper plane**. It should be built and tested now, front-end only with a simulated delay, so #36 and #37 can simply use it.

## What Changes

- **Mockup first**: a local `design/mtf-mockup-avion.html` (light and dark) showing the plane looping with a dotted pencil trail, the message timeline and the small indicator. The user approves it before any app code is written.
- **The paper plane**: an inline SVG drawn with an ink stroke and a paper fill, **no accent** (travelling is not a Win). A new CSS keyframe `fly` moves it along a soft arc: it leaves on the right and comes back in from the left. The dotted trail and the indicator's sway get their own keyframes (`trail`, `sway`) in `src/index.css`.
- **The wait** (`PlaneWait`): the block the sign-in sheet will show while it waits for the server. It follows a timeline of messages and never shows a progress bar:
  - 0–1.5 s: "Entrando…" with no animation, so a server that is already awake causes no flicker
  - 1.5 s: the plane appears with "Conectando…"
  - 8 s: "El servidor se está despertando. La primera vez del día puede tardar hasta un minuto."
  - 30 s: "Ya casi…"
  - 90 s: "No pudimos conectar ahora. Tu escritorio sigue funcionando; probá en un rato." The plane stops. The message stays positive and never blames the user.
- **The sync indicator** (`SyncIndicator`): a small lucide `Send` icon with a gentle sway, made for the floating tools pill. It appears only when a wait passes about 2 s.
- **Reduced motion**: the plane stays still, the trail shows in full, and the indicator does not sway. The messages are the same. The global reduced-motion rule already turns the keyframes off.
- **Accessibility and languages**: the messages live in an `aria-live="polite"` region, in Spanish and English.
- **Tests**: Vitest + Testing Library tests of the timeline with fake timers (every threshold, no flicker on a quick answer, the indicator's 2 s delay).
- **Dev-only preview**: running `npm run dev` and opening `/?avion` shows a page that simulates a server that answers quickly, one that is slow, and one that never answers, with the wait and the indicator. Vite drops it from the production build.
- **Docs**: `KB/frontend/design-system.md` gets the new keyframes in its animation table and the rule "the paper plane is the symbol of sync". `KB/frontend/architecture.md` gets the new `src/sync/` folder. `GLOSSARY.md` gets **Paper plane**.

### Acceptance criteria → scope

| Issue criterion | Where |
|---|---|
| Local mockup `design/mtf-mockup-avion.html`, light and dark, approved before implementing | Mockup task (first task, a gate) |
| `fly` keyframe in `src/index.css`, ink stroke + paper fill, no accent, soft arc, out right, back in left | Paper plane |
| Wait timeline 0 / 1.5 / 8 / 30 / 90 s, no progress bar | `PlaneWait` + `server-wait` spec |
| Small indicator with `Send` and a gentle sway, only after ~2 s | `SyncIndicator` |
| Reduced motion: plane still, same messages | Reduced-motion requirement |
| Messages in `aria-live="polite"`, Spanish and English | Accessibility requirement + i18n dictionaries |
| Timeline tests with fake timers | Tests |
| `design-system.md`: new keyframe and the plane rule | Docs |

### Out of scope

- Any real request, the sign-in sheet and accounts (#36), and syncing, the offline queue and the "Tu escritorio está al día" toast (#37). They need the .NET backend and stay in the V2 backlog. This change only builds the pieces they will put on screen.
- Mounting the indicator in the real tools pill. Nothing waits for a server yet, so #37 mounts it.
- Retry buttons, cancel, or a countdown. The caller (#36) decides what happens after the 90 s message.
- New libraries. It uses inline SVG, CSS keyframes and the lucide-react already installed.

## Capabilities

### New Capabilities
- `server-wait`: how MTF shows that it is waiting for the server. Covers the paper plane as the sign of travel between devices, the timeline of wait messages, the small sync indicator, reduced motion and how the messages are announced. #36 and #37 will add their own requirements on top.

### Modified Capabilities
<!-- None: no existing requirement changes. The accent rule (app-shell) and the global reduced-motion rule (desk) already cover the plane, which follows them. -->

## Impact

- **New code**: `src/sync/` (pure timeline helpers, a timeline hook, `PaperPlane`, `PlaneWait`, `SyncIndicator`, the dev-only `PlanePreview`) and its tests.
- **Changed code**: `src/index.css` (the `fly`, `trail` and `sway` keyframes), `src/i18n/locales/es.ts` and `en.ts` (wait messages), `src/main.tsx` (renders the preview only when `import.meta.env.DEV` and `?avion` are both present).
- **New file**: `design/mtf-mockup-avion.html`.
- **Docs**: `KB/frontend/design-system.md`, `KB/frontend/architecture.md`, `GLOSSARY.md`, `KB/roadmap.md` (mark #35).
- **No** new dependencies, no storage changes, no change to what users see in production.
