# Proposal

## Why

The only help a new user gets today is a one-line hint above the Dock: "Arrastrá las tarjetas a donde quieras…". It explains dragging but none of the rest of the loop that makes MTF what it is: check Items, finish the Card, drop it in the Jar, see it counted. A hint is read and dismissed; it teaches nothing by doing. Issue #20 replaces it with a **Welcome Card**: a real Card on the Desk whose checklist walks the user through dragging it, checking an Item and dropping it in the Jar.

## What Changes

- **A Welcome Card on a device's first launch.** MTF places one Card in the first Area, on top of the others, written in the current UI language. It has a title, a short line of text and a checklist of three Items: drag me somewhere else (holding first on a phone), check this Item, check everything and drop me in the Jar. Its Items start unchecked.
- **It is an ordinary Card.** Nothing marks it as special in the data. The user can drag it, edit it, pin it, delete it, check its Items and drop it in the Jar like any other Card. The user checks each Item by hand; nothing is checked for them (decided during this proposal). The Jar's usual rule also teaches: dropped with Items still unchecked, it is refused with "Todavía no".
- **It counts like any Card, except as a note.** Checking its Items records Item Wins, finishing it records a Card Win, and the Jar takes it as usual. MTF wrote it, not the user, so it does **not** count as a note written.
- **The first view shows it.** On the launch that placed the Welcome Card, the first view shows the Welcome Card at a zoom where its text and Items are readable (on a desktop window this is closer than the usual whole-Desk view, which shows Cards by their title only).
- **It replaces the first-run hint.** The hint above the Dock, its dismiss button and its device key go away. The install nudge no longer waits for the hint to be dismissed.
- **Existing users see it once too.** Whether a device has had its Welcome Card is a new device setting, separate from the old hint. A device that already uses MTF, with the hint dismissed long ago, gets the Welcome Card once on its next launch, on top of its own Cards. The setting is not part of the data document or the Backup, like the theme.
- **Settings → "Ver introducción"** (EN "See the introduction") places a new Welcome Card in the first Area, in the current language, closes Settings and shows it. It always creates a new one, even if an earlier Welcome Card is still on the Desk (decided during this proposal); the user can delete the extra one.
- Every step works with touch (press and hold, then drag) and with the mouse, and from the keyboard through the editor ("Lugar", "Llevar al frasco"), as for any Card.

### Acceptance criteria → scope

| #20 criterion | Covered by |
|---|---|
| On first launch a Welcome Card appears with a checklist (drag it, check an Item, drop it in the Jar) in the current language | A Welcome Card on a device's first launch; the first view shows it |
| It replaces the first-use hint | It replaces the first-run hint |
| Users who already use the app see it once | Existing users see it once too |
| Checking its Items counts Wins like any Card; it does not count as a note written | It counts like any Card, except as a note |
| Settings → "Ver introducción" creates it again | Settings → "Ver introducción" |
| Tests green | Unit, component and Playwright tasks |

### Out of scope

- **Checking Items automatically** when the user does the step (for example, checking "drag me" after a drag). It would need a marker on the Card and special cases in the drop; the user checks by hand.
- **Translating a placed Welcome Card** when the language changes. Once placed it is the user's Card, with fixed text, like anything they typed. "Ver introducción" writes a new one in the new language.
- **Finding an earlier Welcome Card** instead of creating a new one from "Ver introducción".
- **A guided tour, overlays or arrows** pointing at the Jar, the Dock or Settings. The Card is the whole introduction.
- **Teaching Areas, Tidy up, search or the Backup.** The Welcome Card covers the core loop only.
- **Cleaning up the old `mtf_hint_seen` key** left in existing browsers. It is a harmless leftover that nothing reads.

## Capabilities

### New Capabilities

- `welcome`: the Welcome Card. When it is placed (first launch, once per device, including devices already in use), what it holds and in which language, how its Wins count, and "Ver introducción" in Settings.

### Modified Capabilities

- `desk`: removes the first-run hint requirement; the initial view shows the Welcome Card's Area on the launch that placed it; the accent rule no longer names the hint.
- `pwa-offline`: the install nudge no longer depends on the first-run hint.

## Impact

- **Code**:
  - A new pure module builds the Welcome Card's content and place.
  - `appStore` gets an action that places a Welcome Card in the current language and returns its id.
  - A start-up step in `main.tsx` places it once per device.
  - `deskStore` remembers which Area the first view must show.
  - `Desk.tsx`: the first view uses it.
  - `storage.ts`: a new device key replaces `mtf_hint_seen`.
  - `App.tsx`: "Ver introducción" in Settings; `FirstRunHint` is removed.
  - `InstallNudge.tsx` drops its hint condition.
  - i18n strings in ES and EN.
- **Data**: no schema change, no Backup change. The Welcome Card is a normal Card. One new device key; `mtf_hint_seen` is no longer used.
- **Docs**: KB `desk.md`, `storage.md`, `architecture.md`, `pwa.md`, `testing.md`, `design-system.md`, `roadmap.md`; `GLOSSARY.md` (Welcome Card).
- **Tests**: unit tests for the Welcome Card builder; store tests for the new action (no note written, Wins as usual); a component test for "Ver introducción"; the hint's tests removed; Playwright helpers move from `hintSeen` to the new key, plus e2e tests for the first launch, for an existing device and for completing the Welcome Card on desktop and phone.
- **Dependencies**: none.
