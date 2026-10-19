# Tasks

## 1. Wordmark: MTF By Zynis

- [x] 1.1 In `src/App.tsx`, change the `<h1>` to "MTF" plus a smaller "By Zynis" (a literal, not an i18n key) inside it, and put an `aria-hidden` "·" before the tagline, both inside the wide-screen block that is hidden below 521 px (design decisions 1–3); verify the heading's accessible name is "MTF By Zynis"
- [x] 1.2 Update `src/App.test.tsx`: the wordmark test finds the heading "MTF By Zynis", and the English test checks the heading still reads "MTF By Zynis"; verify `command npm test` passes
- [x] 1.3 Update the wordmark locators in `e2e/base-screen.spec.ts` and `e2e/offline.spec.ts` to `{ name: 'MTF By Zynis', exact: true }`, and in `base-screen.spec.ts` check that the tagline is visible on the `desktop` project and hidden on `phone`; verify `command npm run test:e2e` passes on both projects
- [x] 1.4 Update the wordmark in [KB/frontend/design-system.md](../../../KB/frontend/design-system.md) (Typography line: `MTF` italic, plus "By Zynis" in Figtree and not translated) and the locator note in [KB/frontend/testing.md](../../../KB/frontend/testing.md); verify both match `App.tsx` and the e2e specs

## 2. Installed name and tab title

- [x] 2.1 In `vite.config.ts`, set the manifest `name` and `short_name` to "MTF By Zynis"; verify `command npm run build` and that `dist/manifest.webmanifest` has both values
- [x] 2.2 In `index.html`, set `<title>` to "MTF By Zynis" and add `<meta name="apple-mobile-web-app-title" content="MTF By Zynis" />`; verify the built `dist/index.html` has both
- [x] 2.3 Update the Manifest section of [KB/frontend/pwa.md](../../../KB/frontend/pwa.md) (names, the Apple title meta and why it is there, the "MTF" fallback) and the title of `README.md`; verify they match `vite.config.ts` and `index.html`

## 3. Integration

- [x] 3.1 Run `command npm run lint`, `command npm test`, `command npm run build` and `command npm run test:e2e`; verify all pass with no warnings
- [x] 3.2 Check by hand in the dev server at phone and desktop width, in light and dark, in Spanish and English: "MTF" in capitals, "By Zynis" on the same baseline, the tagline only on wide screens, no accent color, nothing overlapping the top-right tools; adjust the "MTF" size if the capitals look heavy (design decision 3)
- [x] 3.3 Clean-code pass over the changed files (no dead code, comments only where the why is not obvious); fill Technical Context / Modified Files in `KB/developers/active.md`; verify lint and tests still pass
- [x] 3.4 (User) After deploying the branch preview, install MTF on a real Android phone and an iPhone; verify the label under the icon reads "MTF By Zynis". If it is cut, change `short_name` and the Apple title to "MTF", update the `pwa-offline` delta's "Name under the icon" scenario and `KB/frontend/pwa.md`, and re-check

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (merges the `app-shell` and `pwa-offline` deltas into `openspec/specs/`), then the user commits, pushes and opens the PR.
- After the merge, on an up-to-date `main`: `/close-ticket`, then `/select-ticket 28` for the custom domain.
