---
area: pwa
description: Manifest, full offline precache, install flow and iOS specifics for Zynis MTF
---

# PWA

## Goal

MTF is installed on the phone's home screen and on the PC, and **opens with no connection**. This is the main difference from Zynis Pulse, whose service worker deliberately caches nothing.

## Service worker (vite-plugin-pwa)

Configured in `vite.config.ts` (`VitePWA({...})`), strategy `generateSW` (the plugin writes `sw.js`).

- `registerType: 'autoUpdate'`, `injectRegister` left on `'auto'`: since nothing imports `virtual:pwa-register`, the plugin injects `<script src="/registerSW.js">` into `index.html`, which registers `/sw.js` on page load.
- **Precache = the whole app shell.** `workbox.globPatterns`:
  - `**/*.{html,js,css,svg,png,ico}` — `index.html`, the bundle, CSS, `registerSW.js`, logo and icons
  - `**/*-latin-wght-*.woff2`, `**/*-latin-ext-wght-*.woff2` — only the latin / latin-ext font files (Spanish + English). Fontsource also emits cyrillic, greek and vietnamese files; they stay in `dist/` but are not precached.
  - The plugin adds `manifest.webmanifest` itself; `includeManifestIcons: false` because the glob already has the icons (otherwise each one is listed twice).
- `cleanupOutdatedCaches: true`, `skipWaiting: true`, `clientsClaim: true`. The last two matter: the plugin only turns them on by default when `injectRegister` is `'auto'`, and without `clientsClaim` the first visit is never controlled by the worker, so a reload with no connection fails.
- No runtime caching: MTF makes no network requests in the MVP.

### Update flow (decided in change 1): silent, no toast

A new deploy → the browser fetches the new `sw.js` (Vercel serves it with `max-age=0, must-revalidate`) → the new worker installs, activates at once and takes over, and old precaches are removed. The open page is **not reloaded**, so nothing interrupts the user; the next launch runs the new version with the same localStorage data. No "Nueva versión lista" toast in the MVP.

Risk: a page still running old JS that lazy-loads a chunk the new worker removed. MTF has one bundle and no lazy routes; revisit if code splitting is added.

## Address

Added in #28 ([ADR 0008](../../docs/adr/0008-own-address.md)).

- MTF is served at **`https://mtf.zynis.com.ar`**. The old production alias, `zynis-mtf.vercel.app`, redirects every path there (308) through `vercel.json`; preview deployments are not redirected ([stack.md](stack.md#deployment)).
- **A new origin is a new app.** localStorage, the service worker, its precache and an installed app all belong to one origin (scheme + host). On a new address MTF starts with empty storage, its own install and its own Welcome Card; the notes arrive only through a Backup ([storage.md](storage.md#export--import)). On iPhone, Import inside the installed app, since it has storage of its own ([iOS specifics](#ios-specifics)).
- **Apps installed from the old address never see the redirect.** The service worker serves every page load from its precache (`NavigationRoute` → `index.html`), so the page never reaches the server; only the update check asks for `sw.js`, and a service worker update refuses a redirected script. Those apps keep opening with their notes, offline too, on the version they have, and never update. They are a safety copy until their notes are imported on the new address, then uninstalled.
- **The manifest stays origin-free**: `start_url` and `scope` are `/` and there is no `id`, so the same build works on any address. An `id` would not link two installs: an app's identity includes its origin.

## Manifest

- `name` and `short_name`: "MTF By Zynis" (#27), `description` in Spanish, `lang`: `es`. The page `<title>` in `index.html` is the same text, so the browser tab matches
- `<meta name="apple-mobile-web-app-title" content="MTF By Zynis">` in `index.html`: Safari's Add to Home Screen ignores the manifest name and suggests the page `<title>` unless this meta is set, so it is what fixes the label under the icon on iPhone, whatever the title says
- Fallback: at 12 characters "MTF By Zynis" is at the edge of what launchers show under an icon. If a real phone cuts it ("MTF By Zy…"), `short_name` and the Apple title go back to "MTF"; `name` and `<title>` stay "MTF By Zynis"
- A name change reaches installed apps unevenly: Android updates the label from the manifest on its own after a while; iPhone fixes the label when the app is added, so it shows the new one only after adding MTF to the home screen again (same address, so localStorage is kept)
- `start_url` / `scope`: `/`
- `display`: `standalone`, `orientation`: any (the Desk works in landscape too)
- `theme_color` / `background_color`: paper (`#F5F1EA`), fixed at install time, so the splash stays light paper whatever the theme. The app paints the theme itself; the status bar comes from the light/dark `theme-color` metas in `index.html`, which follow the device under System and are set to the chosen paper under Light or Dark by `applyTheme` ([design-system.md](design-system.md#how-the-theme-switches))
- Icons: 64, 192, 512, maskable 512; Apple touch icon 180 (`<link rel="apple-touch-icon">`), `favicon.ico` 48 and `logo.svg` as favicons

## Icons

- Source: `public/logo.svg` — a placeholder mark: three overlapping paper cards in sage, sand and sky on paper, no text (renders without fonts).
- Generated with `@vite-pwa/assets-generator` (devDependency) and committed:
  ```bash
  command npm run generate-pwa-assets   # reads pwa-assets.config.ts
  ```
- `pwa-assets.config.ts` extends the `minimal-2023` preset: no padding on the regular icons (the logo already fills its square with paper), and paper instead of white as the padding of the maskable and Apple icons.
- To redesign the icon: replace `public/logo.svg`, rerun the command, commit the PNGs.

## Install guidance

Added in change 4. Installing is what protects the notes on iPhone (see iOS specifics), so MTF explains it in Settings and nudges once. Code in `src/install/`.

- **Modes** — `installMode()` in `installStore.ts`, in this order of priority:
  | Mode | When | Settings → "Instalar la app" shows |
  |---|---|---|
  | `installed` | `appinstalled` fired in this session, or `isStandalone()` (`(display-mode: standalone)` or iOS's `navigator.standalone`) | the "why" text and "MTF ya está instalada en este dispositivo." |
  | `ios` | `isIos()`: `iPhone`/`iPad`/`iPod` in the user agent, or `Macintosh` with `maxTouchPoints > 1` (iPadOS reports itself as a Mac) | the "why" text and the steps: 1. Tocá Compartir (lucide `Share` icon) 2. Elegí "Agregar a inicio" 3. Abrí MTF desde el ícono |
  | `prompt` | the browser fired `beforeinstallprompt` (Chromium) | the "why" text and an "Instalar MTF" `primary` button that opens the browser's dialog |
  | `manual` | anything else (Firefox, desktop Safari…) | the "why" text and where to look in the browser menu |
- **`beforeinstallprompt` is captured in `main.tsx`**, by `listenForInstall()` before React mounts, because Chromium can fire it early. The handler calls `preventDefault()` (no mini-infobar: Settings offers it) and keeps the event in `installStore`. `install()` calls its `prompt()` once and drops it (an event can be used once). `appinstalled` sets `installed` and drops it.
- **The nudge** (`InstallNudge.tsx`, through the shared `Callout`): "Instalá MTF para que tus notas estén más seguras." with "Cómo" (opens Settings) and "Ahora no". It appears when the number of `note` events grows during the session (a new Card was kept; a reload with notes never triggers it, and neither does a Welcome Card, which writes no `note`) **and** at that moment the mode is `ios` or `prompt` and `mtf_install_nudge_seen` is not set. Until #20 it also waited for the first-run hint to be dismissed. Either button, or `installed` becoming true, writes `mtf_install_nudge_seen = '1'`: once per device.
- **Persistent storage** is asked for from `App` through `usePersistentStorage()`, the first time in a launch that the data holds a Card ([storage.md](storage.md#persistent-storage)). Chrome grants it silently (installed apps and engagement raise the odds), so asking on every launch until granted lets a later install count; Safari grants it mostly to Home Screen apps; Firefox asks the user, which is why it waits for the first Card.

## iOS specifics

- Add to Home Screen is manual in Safari (Share → "Agregar a inicio" / "Add to Home Screen"); the install section in Settings shows these steps on iPhone and iPad, and the nudge points to it once ([Install guidance](#install-guidance)). Safari never fires `beforeinstallprompt`.
- Installed PWAs are not subject to Safari's 7-day storage eviction for websites; this is part of why installing matters ([storage.md](storage.md)). An installed MTF on iOS has its own storage, separate from Safari's: a Backup is how notes written in the Safari tab move into the installed app.
- Use `viewport-fit=cover` and `env(safe-area-inset-*)` for floating controls.
- Disable the long-press callout and text selection on the Desk (press and hold is the drag gesture).

## Tests

`e2e/offline.spec.ts` (Playwright, against the production build): waits for `navigator.serviceWorker.controller`, goes offline, reloads, checks the base screen, Literata and Figtree (Figtree only loads once Settings shows Figtree text on a phone), the language chosen online, and that no request leaves the origin.

## Checklist

- [x] Installable: Chrome reports no installability errors and no manifest errors (`Page.getInstallabilityErrors` on `npm run preview`, change 1). Lighthouse no longer has a PWA category; use DevTools → Application → Manifest.
- [x] Opens offline after first visit — automated in `e2e/offline.spec.ts`
- [ ] Opens offline on a real phone (airplane mode, after deploy) — user check
- [ ] Installs on Android Chrome and iOS Safari — user check, after deploy
- [x] The install section matches the device: Safari's steps on iPhone, "Instalar MTF" opens Chrome's dialog on Android; the nudge appears once after the first kept Card — checked by hand on Android and iPhone (change 4)
- [x] Fonts render offline — automated in `e2e/offline.spec.ts`
