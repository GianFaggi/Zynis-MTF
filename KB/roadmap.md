---
area: roadmap
description: MVP changes 1–4 and the V2 backlog for Zynis MTF
---

# Roadmap

The MVP is split into four changes, each a ticket + OpenSpec change. After change 2, MTF is already usable as a free notepad.

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
- [ ] First deploy to Vercel

## Change 2 — Desk ([#2](https://github.com/GianFaggi/Zynis-MTF/issues/2))
- [ ] Desk with pan / zoom (@use-gesture/react), world coordinates, far zoom
- [ ] Areas Trabajo / Vida / Recordar
- [ ] Create, edit, delete Cards (title, text, checklist, pin); editor sheet with Place selector
- [ ] Drag Cards (mouse + press-and-hold), Area decided on drop
- [ ] Dock: jump to Area, See all, Tidy up; search
- [ ] First-run hint

## Change 3 — Wins ([#3](https://github.com/GianFaggi/Zynis-MTF/issues/3))
- [ ] Win events (item, card, note)
- [ ] Finished Cards; the Jar (accept / refuse, fill animation)
- [ ] Mis logros: last 7 days, per-day bars, notes written, since you started, take out of the Jar
- [ ] Wins counter in the floating UI

## Change 4 — Backup ([#4](https://github.com/GianFaggi/Zynis-MTF/issues/4))
- [ ] Export / Import backup file with validation and confirmation
- [ ] Persistent storage request; install guidance

## Small tickets
- [ ] Theme toggle in Settings: System · Light · Dark ([#5](https://github.com/GianFaggi/Zynis-MTF/issues/5)); after change 1 merges

---

## V2 Backlog (do not implement in MVP)

- .NET backend: accounts + login, phone ↔ PC sync, offline queue
- Custom Areas (create, rename, recolor, move/resize)
- Sharing a Card or an Area with someone
- Reminders on a Card
- Export wins to a Sheet / CSV
- Motion library for spring physics, if CSS animations fall short
