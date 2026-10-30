---
area: roadmap
description: MVP changes 1–4 and the V2 backlog for Zynis MTF
---

# Roadmap

The MVP is split into four changes, each a ticket + OpenSpec change. After change 2, MTF is already usable as a free notepad; after change 3 it counts and celebrates what you finish.

## Phase 0 — Exploration ✅
- [x] Product direction: Desk + Areas + Jar ([ADR 0001](../docs/adr/0001-desk-instead-of-tabs.md))
- [x] Mockups: [design/mtf-mockup.html](../design/mtf-mockup.html) (rejected), [design/mtf-mockup-desk.html](../design/mtf-mockup-desk.html) (approved)
- [x] Stack ([KB/frontend/stack.md](frontend/stack.md)), storage ([ADR 0002](../docs/adr/0002-local-first-storage.md)), desk approach ([ADR 0003](../docs/adr/0003-dom-desk-with-use-gesture.md))
- [x] Project structure: CLAUDE.md, KBs, OpenSpec, commands, glossary
- [x] GitHub repo `GianFaggi/Zynis-MTF` (public, MIT) + first push; issues #1–#4 created

## Change 1 — Foundation ([#1](https://github.com/GianFaggi/Zynis-MTF/issues/1))
- [x] Vite + React + TypeScript project, ESLint
- [x] Tailwind v4 with the Paper tokens; Literata + Figtree via @fontsource; light + dark
- [x] Closed-API UI kit basics (`src/components/ui/`)
- [x] vite-plugin-pwa: manifest, icons, full offline precache
- [x] Storage layer (`src/lib/storage.ts`) + Zustand store skeleton + types
- [x] i18n ES · EN
- [x] Vitest + Testing Library + Playwright set up; GitHub Actions CI (workflow written; first green run after the PR is pushed)
- [x] First deploy to Vercel (now served at `https://mtf.zynis.com.ar`, [#28](https://github.com/GianFaggi/Zynis-MTF/issues/28))

## Change 2 — Desk ([#2](https://github.com/GianFaggi/Zynis-MTF/issues/2))
- [x] Desk with pan / zoom (@use-gesture/react), world coordinates, far zoom
- [x] Areas Trabajo / Vida / Recordar
- [x] Create, edit, delete Cards (title, text, checklist, pin); editor sheet with Place selector
- [x] Drag Cards (mouse + press-and-hold), Area decided on drop
- [x] Dock: jump to Area, See all, Tidy up; search
- [x] First-run hint (replaced by the Welcome Card in [#20](https://github.com/GianFaggi/Zynis-MTF/issues/20))
- [x] Manual check on a real Android phone and an iPhone (task 9.5)

## Change 3 — Wins ([#3](https://github.com/GianFaggi/Zynis-MTF/issues/3))
- [x] Win events (item, card, note), with removals that follow the Desk ([ADR 0005](../docs/adr/0005-win-events-with-removals.md))
- [x] Finished Cards; the Jar (accept / refuse, fill animation); "Llevar al frasco" in the editor; Dock "Frasco"
- [x] Mis logros: last 7 days, per-day bars, notes written, since you started, take out of the Jar
- [x] Wins counter in the floating UI; toasts and sparks
- [x] Manual check on a real Android phone and an iPhone (task 7.6)

## Change 4 — Backup ([#4](https://github.com/GianFaggi/Zynis-MTF/issues/4))
- [x] Export / Import backup file with validation and confirmation ([ADR 0006](../docs/adr/0006-backup-file-format.md)); Export shares on phones, downloads on PCs; Import always replaces
- [x] Persistent storage request; install guidance (Settings section per device + one-time nudge)
- [x] Manual check on a real Android phone and an iPhone (task 8.4)

## Small tickets
- [x] Theme choice in Settings: System · Light · Dark ([#5](https://github.com/GianFaggi/Zynis-MTF/issues/5), change 5); a device setting (`mtf_theme`), not in the Backup
- [x] Custom Areas ("Áreas propias", [#7](https://github.com/GianFaggi/Zynis-MTF/issues/7), change 7): create (first free slot, first unused color), rename (default ones too), recolor (12 colors), delete choosing where its Cards go (the last Area stays), all from the Area editor (label pencil or Settings → Áreas). Moved from the V2 backlog during change 2: it needs no server, and change 2 built every Desk behavior over the list of Areas. **Moving and resizing were brought in** at the user's request: drag the label to move an Area with its Cards, drag the corner handle to resize it, and Areas never overlap ([ADR 0007](../docs/adr/0007-areas-the-user-shapes.md))
- [x] Arrange the Areas ("Ordenar áreas", [#18](https://github.com/GianFaggi/Zynis-MTF/issues/18), change 18): Settings → Áreas → **Acomodar áreas** with Fila, Tabla and Estrella (a ring with the Jar in the middle; the Jar now sits in the middle of the Areas whenever that space is free), plus one saved **Mi disposición** to return to, kept on the device (`mtf_arrangement`, not in the Backup). Cards travel with their Area; it asks before losing an arrangement that cannot be chosen again. Named "Acomodar" because "Ordenar" is already Tidy up
- [x] A jar per Area ("Un frasco por Área", [#19](https://github.com/GianFaggi/Zynis-MTF/issues/19), change 19): the device option **Frasco por área** (Settings → Áreas, off by default, `mtf_area_jars`, not in the Backup) gives each Area a small Jar in its top-right corner, a view of the same Jar. Dropping a Card on its own Area's Jar follows the Jar's rules; on another Area's Jar it asks first, and Sí moves the Card there and into the Jar in one write. Area Jars hide in the far look. Mis logros gets an Area filter, counting each Win in its Card's current Area. No schema change
- [x] Welcome Card ("Tarjeta de bienvenida", [#20](https://github.com/GianFaggi/Zynis-MTF/issues/20), change 20): replaces the first-run hint. On a device's first launch (also one already in use) MTF places an ordinary Card in the first Area, on top, in the current language, whose three Items teach by doing: drag it, check an Item, check everything and drop it in the Jar. The first view frames it so its Items are readable. Its Items count as Wins; it is not a note written. Settings → **Ver introducción** places a new one. Once per device (`mtf_welcome_placed`, not in the Backup); no schema change
- [x] Own address ("Dominio propio", [#28](https://github.com/GianFaggi/Zynis-MTF/issues/28), change 28): MTF is served at `https://mtf.zynis.com.ar` (`CNAME mtf` at Don Web → the Vercel project), and `vercel.json` redirects every path of the old `zynis-mtf.vercel.app` there (308); previews are not redirected. Each device's notes moved with Export → Import **before** the redirect went live, since a new origin starts with empty storage. The address is chosen once ([ADR 0008](../docs/adr/0008-own-address.md))
- [x] Redirect the root ("Redirigir la raíz", [#31](https://github.com/GianFaggi/Zynis-MTF/issues/31), change 31): #28's after-merge check found the root `/` of `zynis-mtf.vercel.app` still answering 200, since Vercel does not match `/:path*` against it. A second rule in `vercel.json` (`"source": "/"`, same host condition) now redirects the root too, query string kept
- [x] Paper plane ("Avión de papel", [#35](https://github.com/GianFaggi/Zynis-MTF/issues/35), change 35): the sign for waiting on the V2 server, built front-end only before #36 and #37 need it. `PlaneWait` shows calm messages at 0 / 1.5 / 8 / 30 / 90 s (no progress bar; the plane takes off at 1.5 s, so an awake server never flickers, and rests at 90 s with a positive message); `SyncIndicator` is a swaying `Send` icon for the tools pill after 2 s. Ink and paper, never the accent; still with reduced motion. Approved in [design/mtf-mockup-avion.html](../design/mtf-mockup-avion.html); watch it in the app with `npm run dev` at `/?avion` (dev only). Nothing changes in production yet
- ~~Put Cards in the Jar at any zoom on a phone ([#10](https://github.com/GianFaggi/Zynis-MTF/issues/10)): a floating Jar drop target that appears while dragging; edge auto-pan and a larger default phone zoom to be evaluated.~~ **Dropped** (2026-10-12, #10 closed as not planned): the Card editor's **Llevar al frasco** button already puts a Card in the Jar at any zoom, with no drag and the same accept / refuse rules, so a floating drop target adds nothing the user needs. Found during change 3's phone check: on a phone you must zoom in to read lists, and the Jar is far from the Cards.

---

## V2 Backlog (do not implement in MVP)

- .NET backend: accounts + login ([#36](https://github.com/GianFaggi/Zynis-MTF/issues/36)), phone ↔ PC sync and offline queue ([#37](https://github.com/GianFaggi/Zynis-MTF/issues/37)). Runs on Render Free (API) + Neon Free (Postgres), built to move to a VM ([ADR 0009](../docs/adr/0009-v2-backend-hosting.md), [#34](https://github.com/GianFaggi/Zynis-MTF/issues/34)). Portability rules, worded and explained in the ADR:
  - [ ] `Dockerfile` listening on `${PORT}`
  - [ ] Connection string only from `ConnectionStrings__DefaultConnection`
  - [ ] Migrations at start-up
  - [ ] `/health` never touches the database
  - [ ] Standard Postgres 17, no Neon-only features
  - [ ] Own address `api.mtf.zynis.com.ar`, low TTL
  - [ ] A Neon project of its own, never shared with Zynis Cal
  - [ ] Encrypted nightly backup
- Sharing a Card or an Area with someone
- Reminders on a Card
- Export wins to a Sheet / CSV
- Motion library for spring physics, if CSS animations fall short
