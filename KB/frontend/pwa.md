---
area: pwa
description: Manifest, full offline precache, install flow and iOS specifics for Zynis MTF
---

# PWA

## Goal

MTF is installed on the phone's home screen and on the PC, and **opens with no connection**. This is the main difference from Zynis Pulse, whose service worker deliberately caches nothing.

## Service worker (vite-plugin-pwa)

- `registerType: 'autoUpdate'`; Workbox **precaches the app shell**: `index.html`, JS, CSS, bundled fonts, icons.
- No runtime caching of external URLs: MTF makes no network requests in the MVP.
- Update flow: a new version activates on the next launch; a small "Nueva versión lista" toast is optional (decided in change 1).

## Manifest

- `name`: "MTF — Más Tareas Fáciles", `short_name`: "MTF"
- `display`: `standalone`, `orientation`: any (the Desk works in landscape too)
- `theme_color` / `background_color`: paper (`#F5F1EA`); dark handled by the app
- Icons: 192, 512, maskable 512; Apple touch icon 180

## iOS specifics

- Add to Home Screen is manual in Safari (Share → Add to Home Screen); the app should explain it once.
- Installed PWAs are not subject to Safari's 7-day storage eviction for websites; this is part of why installing matters ([storage.md](storage.md)).
- Use `viewport-fit=cover` and `env(safe-area-inset-*)` for floating controls.
- Disable the long-press callout and text selection on the Desk (press and hold is the drag gesture).

## Checklist (to verify in change 1)

- [ ] Lighthouse PWA installable
- [ ] Opens offline after first visit (airplane mode test on phone)
- [ ] Installs on Android Chrome and iOS Safari
- [ ] Fonts render offline
