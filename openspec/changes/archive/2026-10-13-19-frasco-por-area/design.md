# Design

## Context

See [proposal.md](proposal.md) for why, and the delta specs for the behavior ([jar](specs/jar/spec.md), [wins](specs/wins/spec.md)).

What already exists and shapes the approach:

- **"In the Jar" is one field**: `Card.jarredAt` (null = on the Desk). A Card's Area is `Card.areaId`. So "the Cards in Vida's Jar" is already derivable, with no new data: `jarredAt !== null && areaId === vida.id`.
- **The Desk Jar is derived and drawn once**: `jarRect(areas)` in `src/wins/jarLayout.ts`, `Jar.tsx` in the world `div` after the Areas and before the Cards. The Desk finds it with `document.querySelector('[data-jar]')` (highlight, sparks) and `beginPress` recognizes a press on it by `closest('[data-jar]')`.
- **A drop on the Jar is decided in `Desk.tsx`**: `drop()` checks `isOverJar(jarRect, center)`, then `dropOnJar` runs `jarVerdict` before anything moves. Refused: slide back (`data-returning`). Accepted: the shrink animation, then `appStore.jarCard(id)`, then `useWinFeedback().jarred()`.
- **Each Area is one wrapper** (`AreaRegion.tsx`) at its rect's top-left, sized by `--w` / `--h`. An Area move writes one `translate` on the wrapper, and a resize writes `--live-w` / `--live-h`. Anything inside the wrapper, placed from `--w`, follows both for free.
- **The far look** is `s < FAR_SCALE` (0.55). The Desk writes `data-far` on the world `div`, and the edit button and resize handle already hide with `group-data-far:hidden`.
- **Device settings** (`mtf_language`, `mtf_theme`, `mtf_arrangement`, …) are keys of their own behind `src/lib/storage.ts`, held by `appStore`, outside `mtf_data` and the Backup.
- **Win events carry an `areaId` snapshot** (`src/wins/rules.ts`). Every event of a Card that still exists also has its `cardId`. `deleteCard` removes them all, so only an imported file can hold an event whose Card is missing.
- **Mis logros** reads `useWinStats()` (all events) and lists `cards.filter(jarredAt !== null)`. It opens through `deskStore.openWins()`.

## Goals / Non-Goals

**Goals:**

- No schema change: Area Jars and the filter are views computed from `jarredAt`, `areaId` and `events`.
- One drop rule: a single pure function decides which Jar, if any, a released Card is over, and both Jars share the accept / refuse / animate path.
- An Area Jar needs no geometry kept in step: it lives in the Area's wrapper, so it moves and resizes with the Area by itself.

**Non-Goals:**

- No new gesture: the drag, the hold and the release are the same, only the drop target grows.
- No change to the editor's "Llevar al frasco", to "Devolver", or to the Desk Jar's place.
- No ADR: nothing here is hard to reverse. The setting is one device key, attributing Wins to the current Area is a read-time filter, and no stored shape changes.

## Decisions

### 1. Area Jar geometry: top-right, inside the Area, 104 × 120

`areaJarRect(rect)` in `jarLayout.ts`: `{ x: rect.x + rect.w - 128, y: rect.y + 16, w: 104, h: 120 }`, which is 40% of the Desk Jar (260 × 300) with 24 px of paper on the right and 16 px on top. `isOverAreaJar(jar, point)` grows it by 30 px on every side (the Desk Jar's margins, scaled down).

- *Why top-right?* Top-left holds the label and its pencil, and bottom-right holds the resize handle. Tidy up starts Cards 140 px below the Area's top, and the Jar ends at 136 px, so tidied Cards never cover it. Bottom-left would sit under the columns of a full Area.
- *Why inside the wrapper?* `AreaRegion` places it at `left: calc(var(--w) - 128px)`, so it follows a live move (`translate`) and a live resize (`--live-w`) with no code in the Desk. The pure `areaJarRect` uses the same numbers for the hit test, which only runs on a Card drop, when no Area is moving.
- *Alternative considered:* outside the Area's rect, above its top-right corner. Rejected: Tabla rows are 160 px apart, so a 120 px Jar above an Area would crowd the row above it, and `deskBounds` would have to include it.

### 2. One SVG, two sizes

The glass, lid, shine, pieces and label move out of `Jar.tsx` into `JarGlass` (same file, or `src/wins/JarGlass.tsx`). It takes `cards`, `colorOf` and `compact`. `Jar` (Desk) renders it with the "Logros" label and its caption, as today. `AreaJar` renders it compact, with the count only, because "Logros" at 40% would be about 4 Desk px.

- The `<clipPath>` id comes from `useId()`. Today it is the fixed `jar-glass`, which would collide with several Jars on the page.
- `useFreshIds` stays per instance, so a Card dropped in Vida's Jar plays the drop animation both there and in the Desk Jar.
- `data-jar` carries the Area id on an Area Jar and `""` on the Desk Jar. Every DOM lookup becomes `[data-jar="<id>"]` or `[data-jar=""]`. A bare `[data-jar]` would now find the first Area Jar, since the Areas come before the Desk Jar in the DOM.
- Accessible name: `t('areaJarName', name, n)`, which reads "Frasco de Vida: 2 tarjetas. Abrir Mis logros". Only the Area Jar's `onClick` handles the keyboard (`event.detail === 0`), as the Desk Jar's does.
- Hidden in the far look with `group-data-far:hidden`, like the edit button. The Desk also skips Area Jars as targets when `view.s < FAR_SCALE` (decision 3), so a hidden Jar never catches a Card.

### 3. Which Jar is the Card over: `jarTarget`

A pure `jarTarget(areas, point, { areaJars, far })` in `jarLayout.ts` returns `{ areaId: string }` for an Area Jar, `{ areaId: null }` for the Desk Jar, or `null`. It checks Area Jars first, only when `areaJars && !far`, and then the Desk Jar. `follow()` and `drop()` both call it, so the highlight and the drop always agree.

- **Highlight**: `follow()` toggles `data-over` on `[data-jar="<target>"]` and clears it from any other Jar. `settle()` clears it from every `[data-jar][data-over]`. The Card's color preview stays `areaForPoint`, so over another Area's Jar the Card already shows that Area's color, a hint that it would change Area. Over the Desk Jar there is no preview, as today.
- **Drop** (`drop()` → `dropOnJar(press, card, target)`):
  - `jarVerdict` first. Refused → slide back and the "Todavía no" toast, whatever the target, with no question asked.
  - Desk Jar or own Area Jar → the existing accept path, shrinking toward the target's center (`jarRect` or `areaJarRect`).
  - Another Area's Jar → ask (decision 4).
- `releaseOutcome` is unchanged. `beginPress` records `jarAreaId` (`dataset.jar || null`) next to `onJar`, and the `'jar'` outcome calls `openWins(jarAreaId)`.

### 4. The question is a Sheet owned by the Desk

`JarMoveSheet` (`src/wins/`) is a small `Sheet` titled "¿Pasarla a Vida y llevarla al frasco?", tinted in the target Area's color, with **Sí** (`primary`) and **No**. Its `onClose` (`Esc`, scrim, close button) is No.

- The Desk keeps the pending drop in React state, `asking: { press, card, areaId } | null`. While it is set, the Card stays where it was released, still `data-lifted` with its `translate`, so the user sees what is being asked about.
  - **Sí** → the accept path with the target Area: shrink toward that Area Jar, then `jarCard(id, { areaId })`, `settle`, `jarred(areaId)`.
  - **No** → the refused slide back without the toast: `data-returning`, clear the `translate`, `settle` after 380 ms.
- *Why a Sheet?* The user chose it during the proposal. It is the app's one modal pattern, and it gives focus handling, `Esc` and screen-reader naming for free. Its scrim also blocks the Desk, so no second drag can start while the first one waits.
- *Alternative considered:* a bubble next to the Jar on the Desk. Rejected: a new component, small to hit on a phone, and it would scale with the zoom.

### 5. `jarCard(id, { areaId? })`: move and jar in one write

`jarCard` gains an optional target Area. When it is given, exists and differs from the Card's own, the same `withCard` replacement sets `areaId` and `jarredAt`, and `cardJarred` sees the Card already in its new Area (a new Card Win gets the new `areaId` snapshot). The refusal rules are unchanged and checked first. The position is untouched, as today: "Devolver" uses `spotIn` in the Card's current Area anyway.

*Alternative considered:* `placeCard` then `jarCard`. Rejected: two saves, and a reload in between would leave the Card on the Desk of the wrong Area.

### 6. Wins by Area are filtered at read time, by the Card's current Area

`eventsOfArea(events, cards, areaId)` in `stats.ts` keeps an event when its Card's current `areaId` is `areaId`. For an event whose Card is missing (only possible from an imported file), it falls back to the event's own `areaId` snapshot. `useWinStats(areaId?: string | null)` runs `winStats` over that list, and with no Area it behaves as today. The wins counter and the Desk Jar caption keep calling it without an Area.

- *Why the current Area, not the snapshot?* The user chose it during the proposal. It makes the Areas add up to "Todas", it lets Sí in decision 4 bring a Card's Wins along, and it follows `deleteArea`, which moves Cards but leaves `events` untouched. With the snapshot, a deleted Area's Wins would show in no Area at all.
- The orphan-event fallback is why the wins spec says the Areas add up "for every Win whose Card still exists".

### 7. The filter in Mis logros

- `deskStore` gains `winsAreaId: string | null`. `openWins(areaId = null)` sets it and `setWinsArea(id)` changes it. The counter and the Desk Jar call `openWins()`, and an Area Jar calls `openWins(area.id)`.
- `MisLogros` derives the effective Area: `areaJars && areas.some(id) ? winsAreaId : null`. So with the option off there is no filter at all. An Area id left over after an Import or a deletion reads as "Todas", and nothing needs resetting.
- The control is `Segmented`, under the sheet title, with "Todas" and then the Areas in Settings order. Two small, backward-compatible additions to the closed UI kit:
  - Options may carry `dot?: AreaColor`, a 7 px dot before the label, as in the Dock.
  - The group wraps (`flex-wrap`, `max-w-full`) instead of `w-max`, so 12 Areas fit a phone. Language and theme still fit on one line.
- Everything in the sheet reads the filtered `useWinStats(areaId)`, and the "En el frasco" list also filters `card.areaId`.

### 8. The device setting

- `storage.ts`: `AREA_JARS_KEY = 'mtf_area_jars'`. `loadAreaJars()` is `true` only for `'1'` (anything else, or a refused read, is off), and `saveAreaJars(on)` writes `'1'` or `'0'`.
- `appStore`: `areaJars: boolean` (loaded on create) and `setAreaJars(on)`. `replaceData` leaves it alone, like `theme` and `arrangement`.
- UI: in `AreasSection`, after "Acomodar áreas", the label "Frasco por área" with a `Segmented` No / Sí, the pattern Language and Theme use. Settings stays open, and the Area Jars appear behind the scrim.

### 9. Strings (ES / EN)

`areaJarsOption` "Frasco por área" / "A jar per area"; `no` / `yes` "No" / "Sí", "No" / "Yes"; `areaJarName(name, n)`; `jarMoveQuestion(name)` "¿Pasarla a {name} y llevarla al frasco?" / "Move it to {name} and put it in the jar?"; `allAreas` "Todas" / "All"; `winsFilter` "Área" / "Area" (the filter group's accessible name).

## Risks / Trade-offs

- [A long Area name in a narrow Area runs under the Area Jar] → A label is never clipped (areas spec). At the 520 px minimum width the Jar starts 392 px from the left, so a long name with its pencil can meet it. The Jar is drawn after the label and stays on top, and the pencil is still reachable from Settings → Áreas. It only shows with the option on.
- [A Card dropped by hand on top of an Area Jar hides it] → Cards are drawn above the Areas, as they are above the Desk Jar. The drop target is geometric, so the Jar still receives Cards. Tidy up never places a Card there (decision 1).
- [Two Jars play the drop animation for one Card] → Intended: the Card is in both views. Sparks burst only from the Jar that received it (`jarred(areaId)`).
- [The pending Card waits lifted while the Sheet is open] → The scrim blocks every other gesture. A reload while asking writes nothing, so the Card is simply back on the Desk.
- [Attributing Wins by the current Area rewrites history] → A Win's moment never changes, only the Area it shows under. This is the behavior the user chose. The snapshot `areaId` is kept in `events`, so the other reading stays possible later without a migration.
- [`Segmented` changes for every screen] → Both additions are optional and backward compatible. Its existing tests and the Settings tests guard Language and Theme.

## Migration Plan

None. No schema change and no Backup change. On first launch after the update `mtf_area_jars` is missing, which reads as off, so nothing changes until the user turns it on. Rolling back leaves a harmless unused key.
