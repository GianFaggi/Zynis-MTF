# Design

## Context

The wordmark is a pointer-transparent floating row in `src/App.tsx`: an `<h1>` with `mtf` (Literata, 28 px, semibold, italic) and a `<p>` with the translated tagline, hidden below 521 px. The installed name lives in the manifest options in `vite.config.ts` (`name`, `short_name`). The tab title is a static `<title>` in `index.html`, which has no `apple-mobile-web-app-title` meta yet. Tests find the wordmark as the heading named `mtf` (`src/App.test.tsx`, `e2e/base-screen.spec.ts`, and `e2e/offline.spec.ts` with `exact: true`, because the Welcome Card title "¡Hola! Esto es MTF" also contains "mtf").

## Goals / Non-Goals

**Goals:**
- One accessible heading, "MTF By Zynis", that is the same in every language.
- The same name in the tab, the manifest and the iPhone home screen.

**Non-Goals:**
- No new component, i18n key or design token. The row keeps its place, its safe-area offsets and its pointer transparency.

## Decisions

1. **"By Zynis" goes inside the `<h1>`.** It is part of the name, so the heading's accessible name is "MTF By Zynis" and screen readers read the brand once. The tagline stays a separate `<p>` after it, because it describes the app and is not part of the name. *Alternative:* a separate `<p>` for "By Zynis", which would leave the heading as just "MTF" and read the brand as loose text.

2. **"By Zynis" is a literal, not a translation key.** A brand reads the same in every language, and a key would invite someone to translate it ("Por Zynis"). The English unit test checks the heading so this stays true.

3. **Look.** "MTF" keeps Literata semibold italic. Capitals look larger than the old lowercase at 28 px, so the size may drop to around 26 px after a visual check on phone and PC. "By Zynis" uses the tagline's scale (Figtree, 12.5 px, `pencil`) at a medium weight, so the brand reads a little stronger than the tagline but stays quieter than "MTF". The row keeps `items-baseline`, so all three parts sit on one baseline. On wide screens a `·` (`aria-hidden`) goes before the tagline. No accent color, because the accent is reserved for Wins.

4. **iPhone home-screen label via `apple-mobile-web-app-title`.** Safari's Add to Home Screen suggests the page `<title>` unless this meta is set. The meta makes the label "MTF By Zynis" whatever the title says, and it is the one place to change if the label has to become "MTF".

5. **`short_name` "MTF By Zynis", with a fallback to "MTF".** At 12 characters it is at the edge of what launchers show. The user chose to try the full name. If a real phone cuts it, `short_name` and the Apple title change to "MTF" in this change, and the specs' "Name under the icon" scenario is updated to match.

## Risks / Trade-offs

- [The launcher cuts "MTF By Zynis" under the icon] → Manual check on an Android phone and an iPhone; fall back to "MTF" (decision 5).
- [Already-installed apps keep the old name] → Android updates the name from the manifest on its own after a while. On iPhone the label is fixed when the app is added, so the user re-adds MTF to see it. This is cosmetic and no data is at risk, because a re-add on the same address keeps localStorage.
- [Locators that match "MTF" also match the Welcome Card title] → Tests use the full name "MTF By Zynis" with `exact: true`, which the Welcome Card title never matches.
