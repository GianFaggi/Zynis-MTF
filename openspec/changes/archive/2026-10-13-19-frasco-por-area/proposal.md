# Proposal

## Why

The Jar sits in one place, below the Areas or in their middle. On a phone the user zooms in to read a list, and then the Jar is far from the Card they just finished (found in change 3's phone check, #10). Mis logros also counts everything together, so there is no way to see how much got done in Trabajo compared with Vida. Issue #19 asks for an option that gives each Area its own small Jar, next to its Cards, and a per-Area view of Mis logros.

## What Changes

- **A device option, "Frasco por área"** (EN "A jar per area"), in Settings → Áreas. It is off by default. Like the theme and "Mi disposición" it belongs to the device: it is kept across reloads, is not part of the data document or the Backup, and an Import leaves it as it was.
- **An Area Jar in each Area** while the option is on: a small Jar in the Area's top-right corner. It shows the pieces of that Area's Cards in the Jar and their number. It is a view of the same Jar, not a second store. The Desk's Jar stays where it is and keeps every Card, and the Dock's "Frasco" still flies to it.
- **Dropping on your own Area Jar** works like dropping on the Desk's Jar. A finished Card or a Card without Items goes in, with the same animation, toast, sparks and counter bump. A Card with unchecked Items is refused and slides back with "Todavía no".
- **Dropping on another Area's Jar asks first.** A refused Card is refused as above, with no question. Otherwise the Card waits over the Jar and a small sheet asks "¿Pasarla a Vida y llevarla al frasco?" with **Sí** and **No**. Sí moves the Card to that Area and puts it in the Jar, in one write. No, `Esc` or tapping outside puts it back where the drag started, in its own Area, and writes nothing.
- **Area Jars hide when zoomed out.** In the far look (below 55% zoom), where the edit button and the resize handle already hide, an Area Jar is too small to read or hit, so it is not drawn and is not a drop target. The Desk's Jar is always there.
- **Tapping an Area Jar opens Mis logros already filtered to that Area.** The Desk's Jar and the wins counter open it on "Todas", as today.
- **Mis logros by Area**, only while the option is on: a filter with "Todas" plus one choice per Area. With an Area chosen, every number in the sheet counts that Area only: things done in the last 7 days and their breakdown, notes written, the bars, the best day, the total since you started, and the list of Cards in the Jar. The wins counter and the Jar caption stay global.
- **Wins count in the Card's current Area.** A Win counts for the Area the Card belongs to now, not the one it was in when the Win happened. So the Areas always add up to "Todas", a Card moved by the confirmation above brings its Wins along, and the Wins of a deleted Area's Cards follow them to the Area that received them.
- It works with touch (press and hold, then drag) and with the mouse. The option, the filter and the confirmation are buttons, so they work from the keyboard too. With reduced motion every outcome is the same, without animation.

### Acceptance criteria → scope

| #19 criterion | Covered by |
|---|---|
| Settings has "Frasco por área", a device setting not in the Backup, off by default | The device option |
| With the option on, each Area shows a small Jar in a corner with its Cards; the Desk's Jar stays and the Dock's "Frasco" goes to it | An Area Jar in each Area |
| Dropping a Card on its own Area's Jar follows the same accept / refuse rules | Dropping on your own Area Jar |
| Dropping it on another Area's Jar asks; Sí moves it to that Area and into the Jar, No puts it back | Dropping on another Area's Jar asks first |
| Mis logros has a filter by Area besides "Todas" | Mis logros by Area; Wins count in the Card's current Area |
| When zoomed out, a small Jar that cannot be seen well is hidden | Area Jars hide when zoomed out |
| Tests green (Vitest + Playwright) | Unit, component and Playwright tasks |

### Out of scope

- **Separate contents per Jar.** A Card in the Jar is in exactly one Area's Jar and in the Desk's Jar. There is no second "jarred" state and no data change.
- **Moving an Area Jar or choosing its corner.** It is always top-right, derived from the Area's rect.
- **A per-Area wins counter or Jar caption.** The tools pill counter and the Desk Jar's caption stay global.
- **The Mis logros filter while the option is off.** With the option off, Mis logros looks exactly as it does today (decided during this proposal).
- **Changing "Llevar al frasco" in the editor or "Devolver".** They keep their behavior. A Card taken out goes back to its current Area.
- **The welcome Card** (#20): its own ticket.

## Capabilities

### New Capabilities

None. Area Jars are part of the Jar, and the filter is part of Mis logros.

### Modified Capabilities

- `jar`: adds the "Frasco por área" device option, the Area Jar in each Area, dropping on your own and on another Area's Jar (with the confirmation), Area Jars hiding in the far look, and tapping an Area Jar.
- `wins`: adds the Mis logros filter by Area (shown only while the option is on) and the rule that a Win counts for its Card's current Area.

## Impact

- **Code**:
  - `src/wins/jarLayout.ts`: the Area Jar's rect and hit test.
  - New `AreaJar` and `JarMoveSheet` in `src/wins/`.
  - `Jar.tsx` shares its glass with `AreaJar`.
  - `AreaRegion.tsx` draws the Area Jar inside the Area's wrapper, so it moves and resizes with the Area.
  - `Desk.tsx`: picks the drop target and asks before a move.
  - `appStore.jarCard` gets an optional target Area, and the store gets the `areaJars` device setting.
  - `storage.ts`: a new device key.
  - `deskStore`: the Area that Mis logros is filtered to.
  - `stats.ts`: the events of one Area.
  - `MisLogros.tsx`: the filter.
  - `Segmented` wraps on narrow screens and can show a color dot.
  - i18n strings in ES and EN.
- **Data**: no schema change, no Backup change. One new device key, `mtf_area_jars`.
- **Docs**: KB `desk.md`, `storage.md`, `architecture.md`, `design-system.md` (Segmented), `testing.md`; `GLOSSARY.md` (Area Jar, Mis logros by Area); `KB/roadmap.md`.
- **Tests**: unit tests for the layout and the Area filter; store tests for `jarCard` with a target and for the setting; component tests for the Area Jar, the confirmation sheet, Settings and Mis logros; Playwright for drops on Area Jars (own, other with Sí and No, refused, far zoom) on the desktop and phone projects.
- **Dependencies**: none.
