---
area: stack
description: Technology stack decisions and rationale for Zynis MTF
---

# Stack

Versions are pinned when the project is scaffolded in change 1 (foundation) and recorded here then.

## Frontend
- **React** — UI library (components, hooks)
- **TypeScript** — static types everywhere, including tests
- **Vite** — build tool and dev server. MTF is a static, client-only app, which is exactly Vite's case; no SSR framework (Next.js) because there is no server. Same as Zynis Pulse.

## Styling
- **Tailwind CSS v4** — utility-first CSS; no `tailwind.config.js`, design tokens live in the `@theme` block of `src/index.css` → [design-system.md](design-system.md)
- **Fonts via @fontsource** — Literata (titles) and Figtree (UI) bundled with the app, because an offline PWA can't rely on Google Fonts
- **lucide-react** — line icons; only the icons imported get shipped

## Desk (canvas)
- **Hand-made DOM desk** — Cards are real HTML elements placed in a "world" `div` moved with a CSS `transform` (translate + scale). Text editing, checkboxes, accessibility and Tailwind all work normally → [desk.md](desk.md), [ADR 0003](../../docs/adr/0003-dom-desk-with-use-gesture.md)
- **@use-gesture/react** — drag, pinch, wheel and press-and-hold handling across touch, mouse and trackpad. It replaces the hand-written pointer code of the mockup, where the cross-device edge cases live.
- Rejected: React Flow (diagram-oriented look and API), tldraw (whiteboard, own look, production license), Konva/PixiJS (pixel canvas, loses HTML text editing and accessibility)
- Animations: CSS transitions/keyframes in the MVP. **Motion** can be added later if spring physics are needed.

## State
- **Zustand** — one small store for the Desk, Cards and Wins. Dragging updates state many times per second; Zustand lets components subscribe to only the slice they need, and persistence goes through one place (the storage layer) → [architecture.md](architecture.md)

## PWA
- **vite-plugin-pwa** — manifest + service worker. Unlike Pulse, MTF **precaches the full app shell** so it opens offline → [pwa.md](pwa.md)

## Utilities
- **uuid** — ids for every entity (`v4`); sync-ready for the V2 backend

## i18n
- **Custom lightweight solution** — no library; strings in `src/i18n/locales/es.ts` + `en.ts`, language toggle ES · EN (same approach as Pulse)

## Storage
- **localStorage** behind `src/lib/storage.ts` — the only module that touches browser storage → [storage.md](storage.md), [ADR 0002](../../docs/adr/0002-local-first-storage.md)
- **IndexedDB** — only if localStorage proves insufficient

## Testing (dev only)
- **Vitest** — test runner, reuses the Vite config
- **Testing Library** (`@testing-library/react`, `user-event`, `jest-dom`) + **jsdom** — rules, storage and components
- **Playwright** — a few real-browser tests for drag, pan, zoom and the Jar (desktop + phone viewports)
- Conventions → [testing.md](testing.md)

## Code quality
- **ESLint** with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` (same as Pulse)

## CI
- **GitHub Actions** — `.github/workflows/ci-frontend.yml`: `npm ci`, lint, `npm test`, Playwright (created in change 1)

## Package manager
- **npm** — `package-lock.json` is the only lockfile; CI uses `npm ci`. The user's shell aliases `npm` to `pnpm`, so always run `command npm …`. Do not commit `pnpm-lock.yaml` or `yarn.lock`.

## Deployment
- **MVP: Vercel** — static hosting, zero-config deploy for Vite
- **V2: .NET backend** — accounts, phone ↔ PC sync; hosting and database chosen when V2 starts

## Rules
- Do not add libraries outside this stack without explicit justification
- The stack is intentionally minimal for the MVP; resist scope creep
