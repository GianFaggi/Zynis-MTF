---
area: stack
description: Technology stack decisions and rationale for Zynis MTF
---

# Stack

## Versions

Scaffolded in change 1 with `npm create vite@latest` (`react-ts` template). `package.json` uses caret ranges; `package-lock.json` pins the exact versions below, and CI installs them with `npm ci`.

| Package | Version | Notes |
|---|---|---|
| react, react-dom | 19.3.0 | |
| typescript | 6.0.3 | `~6.0.2` range; `strict` is on by default since TS 6 |
| vite | 8.3.4 | newest major; vite-plugin-pwa 2.x supports `^8` |
| @vitejs/plugin-react | 6.1.2 | |
| eslint | 10.12.0 | flat config in `eslint.config.js` |
| typescript-eslint | 8.71.1 | supports TS `<6.1` |
| eslint-plugin-react-hooks | 7.1.1 | |
| eslint-plugin-react-refresh | 0.5.7 | |
| tailwindcss, @tailwindcss/vite | 4.3.3 | |
| @fontsource-variable/literata, @fontsource-variable/figtree | 5.3.0 | variable fonts, one file per style |
| lucide-react | 1.55.0 | |
| zustand | 5.0.15 | |
| @use-gesture/react | 10.3.1 | added in change 2 with its first use, the Desk ([desk.md](desk.md)) |
| vite-plugin-pwa | 2.0.0 | Workbox 7.4 |
| @vite-pwa/assets-generator | 2.0.0 | dev; `npm run generate-pwa-assets` ([pwa.md](pwa.md)) |
| vitest | 5.0.3 | |
| jsdom | 29.1.1 | |
| @testing-library/react · dom · user-event · jest-dom | 16.3.3 · 10.4.2 · 14.6.7 · 7.0.1 | |
| @playwright/test | 1.64.0 | Chromium only |

Node: 24 locally, 22 in CI.

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
- **No `uuid` package** — ids come from the browser's built-in `crypto.randomUUID()` (Chrome 92+, Safari 15.4+, Firefox 95+) through `newId()` in `src/lib/id.ts`, with a `crypto.getRandomValues()` fallback for insecure contexts (phone testing over plain `http://192.168.x.x`). Same v4 UUIDs the V2 sync expects, without a dependency for ~10 lines of code (decided in change 1).

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
- The current Vite template ships **oxlint** instead; MTF keeps ESLint (decided in change 1) to match Pulse and the most mature React Hooks rules. `eslint.config.js` is the standard Vite React flat config, written by hand.

## CI
- **GitHub Actions** — `.github/workflows/ci-frontend.yml`: `npm ci`, lint, `npm test`, Playwright (created in change 1)

## Package manager
- **npm** — `package-lock.json` is the only lockfile; CI uses `npm ci`. The user's shell aliases `npm` to `pnpm`, so always run `command npm …`. Do not commit `pnpm-lock.yaml` or `yarn.lock`.

## Deployment
- **MVP: Vercel** — static hosting, zero-config deploy for Vite (Vercel project `zynis-mtf`, production branch `main`, a preview per PR)
- **Production address: `https://mtf.zynis.com.ar`** (#28) — a production domain of the Vercel project, pointed at it by a `CNAME mtf` record in the Don Web DNS of `zynis.com.ar` (like `cal.zynis.com.ar`); Vercel issues the HTTPS certificate. The address is chosen once, because the notes live on it ([ADR 0008](../../docs/adr/0008-own-address.md), [pwa.md](pwa.md#address))
- **`vercel.json`** holds only two redirects, both from the old alias `zynis-mtf.vercel.app` to `https://mtf.zynis.com.ar` (308) and conditioned on that host so preview deployments and the new domain are untouched: the root `/` → `/` (#31), and every other path (`/:path*`) → the same path (#28). The root needs its own rule because Vercel does not match `/:path*` against the bare `/`; the query string is kept by Vercel on both. Vite detection, `dist/` and the default headers (`sw.js` with `max-age=0, must-revalidate`) stay as Vercel sets them
- **V2: .NET backend** — accounts, phone ↔ PC sync; hosting and database chosen when V2 starts

## Rules
- Do not add libraries outside this stack without explicit justification
- The stack is intentionally minimal for the MVP; resist scope creep
