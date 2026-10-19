# Proposal

## Why

MTF is a Zynis app, but nothing in it says so: the floating wordmark reads `mtf` in lowercase, and the installed app is called "MTF — Más Tareas Fáciles". Issue #27 brands it: the name is written **MTF** in capitals with **By Zynis** beside it, inside the app and wherever the device shows the installed app's name. It should be done now, before the custom domain (#28) puts MTF in front of people at a Zynis address.

## What Changes

- **Wordmark**: the floating `mtf` becomes **MTF** (capitals, still Literata italic) with a small **By Zynis** beside it on the same line, on phones and PCs. On wide screens the tagline "más tareas fáciles" / "more easy tasks" still follows, after a "·". The heading is named "MTF By Zynis".
- **"By Zynis" is the brand**: the same words in Spanish and English, not translated.
- **Installed app name**: the manifest `name` and `short_name` both become "MTF By Zynis", so that is the name under the home-screen icon.
- **Browser tab and iPhone home screen**: the page `<title>` becomes "MTF By Zynis", and an `apple-mobile-web-app-title` meta with the same text sets the label under the icon on iPhone.
- **Fallback**: if a real phone cuts "MTF By Zynis" under the icon (for example "MTF By Zy…"), `short_name` and the Apple title go back to "MTF" in this same change; the full name stays "MTF By Zynis".

### Acceptance criteria → scope

| Issue #27 criterion | Covered by |
|---|---|
| The header says "MTF" in capitals (today `mtf`), with a smaller "By Zynis" beside or below it | `app-shell`: Base paper screen (wordmark) |
| The browser tab and the installed app's full name say "MTF By Zynis" | `pwa-offline`: Installable app (`name`); `<title>` in `index.html` |
| Under the phone icon it says "MTF By Zynis" (or "MTF" if it does not fit) | `pwa-offline`: Installable app (`short_name`, Apple title); manual phone check with the fallback |
| It looks right in light and dark themes, on phone and PC, in Spanish and English | `app-shell`: Base paper screen scenarios; manual check |
| Tests stay green | updated `App.test.tsx`, `e2e/base-screen.spec.ts`, `e2e/offline.spec.ts` |

### Out of scope

- The app icon and the Zynis logo: only the text changes, the icon stays as it is.
- The tagline wording, and the in-app texts that say "MTF" (install section, backup messages, Welcome Card). They name the app, and "MTF" is still its name.
- The custom domain `mtf.zynis.com.ar` (#28, the next ticket).
- Renaming the repository, the storage keys (`mtf_*`) or the backup file format. Those are internal names and stay `mtf`.

## Capabilities

### New Capabilities

None. The wordmark belongs to `app-shell` and the installed name to `pwa-offline`.

### Modified Capabilities

- `app-shell`: "Base paper screen" now has the **MTF** wordmark with **By Zynis** beside it, and the tagline on wide screens.
- `pwa-offline`: "Installable app" now has the manifest name and short name "MTF By Zynis", plus a matching page title and iPhone home-screen title.

## Impact

- **Code**: `src/App.tsx` (wordmark markup), `vite.config.ts` (manifest `name`, `short_name`), `index.html` (`<title>`, `apple-mobile-web-app-title` meta).
- **Tests**: the heading locator changes from `mtf` to `MTF By Zynis` in `src/App.test.tsx`, `e2e/base-screen.spec.ts` and `e2e/offline.spec.ts`. The English test also checks the heading, since "By Zynis" is not translated.
- **Docs**: `KB/frontend/design-system.md` (the wordmark), `KB/frontend/pwa.md` (manifest names, Apple title), `KB/frontend/testing.md` (the wordmark locator note), `README.md` (title).
- **Installed apps**: Android picks up the new name the next time Chrome updates the installed app from the manifest. iPhone keeps the label it got when the app was added, so the new label shows only after adding MTF to the home screen again.
- **Data**: none. No schema change and no new storage key.
- **Dependencies**: none.
