# CLAUDE.md — Zynis MTF

> Project context for Claude Code. Read this file before touching anything.

---

## What is this project?

**MTF — Más Tareas Fáciles** is a Progressive Web App (PWA) under the Zynis brand.
It is a personal notepad shaped like a **desk**: the user writes Cards (text and/or a checklist) and places them freely on one big surface, grouped in soft Areas (Trabajo, Vida, Recordar). Finished Cards go into the **Jar**, which fills up and shows the user how much they got done.

It is built for its author first; other people may use it later.
It is **not a calendar and not a to-do app**. It is a notepad that celebrates what you finish.

The approved direction is the clickable mockup [design/mtf-mockup-desk.html](design/mtf-mockup-desk.html). The rejected tabs + grid version, [design/mtf-mockup.html](design/mtf-mockup.html), is kept for reference ([ADR 0001](docs/adr/0001-desk-instead-of-tabs.md)).

---

## Core Rules

- **MVP = no backend.** Data lives in the browser (localStorage) behind a storage layer. Accounts and phone ↔ PC sync come in V2 with a **.NET** backend. Anything that needs a server goes to the V2 backlog.
- **Offline first.** Unlike Zynis Pulse, the service worker precaches the whole app: MTF must open with no signal. Fonts are bundled, never loaded from Google Fonts.
- **Sync-ready data.** Every entity has a `uuid` id and `createdAt` / `updatedAt` timestamps from day one, so V2 sync is an addition, not a rewrite.
- **The desk is free.** No tabs, columns or grids that decide where Cards go. Areas are regions of one surface, not containers ([ADR 0001](docs/adr/0001-desk-instead-of-tabs.md)).
- **Positive only.** Wins are counted, never punished: no broken streaks, no guilt messages.
- **Mobile-first, PC equally.** Every gesture must work with touch (press and hold to drag, pinch to zoom) and with mouse/trackpad.
- **No unnecessary libraries.** The stack is defined in [KB/frontend/stack.md](KB/frontend/stack.md). Justify before adding anything new.

## Collaboration Rules

- **Always explain the why.** Before asking the user to make a change, explain the reason behind it: what problem it solves, why it's needed, and what breaks if it's skipped. The user is learning this stack; explain new tools in plain words and point to `aprendizaje/`.
- **Always reference KBs before touching any area.** Before working on any specific area (stack, architecture, desk, design system, storage, PWA, testing, roadmap), read CLAUDE.md first and then the corresponding KB. This is mandatory, not optional.
- **Always keep KBs up to date.** When any decision, pattern, or context changes, update the relevant KB immediately. KBs are always written in English.
- **Mockups are local HTML files** in `design/`, opened in the browser. They are not published as artifacts.

---

## Quick Reference — Knowledge Bases

| Area | File | What it covers |
|------|------|----------------|
| Tech stack | [KB/frontend/stack.md](KB/frontend/stack.md) | All libraries, tools and deployment targets with rationale |
| Architecture | [KB/frontend/architecture.md](KB/frontend/architecture.md) | Data flow, state store, storage layer, V2 sync path |
| Desk | [KB/frontend/desk.md](KB/frontend/desk.md) | World coordinates, pan/zoom, drag, long-press, Areas, the Jar |
| Design system | [KB/frontend/design-system.md](KB/frontend/design-system.md) | Paper tokens, fonts, Area colors, accent reserved for wins |
| Storage | [KB/frontend/storage.md](KB/frontend/storage.md) | localStorage schema, entity shapes, Export / Import backup |
| PWA | [KB/frontend/pwa.md](KB/frontend/pwa.md) | Manifest, full offline precache, install, iOS specifics |
| Testing | [KB/frontend/testing.md](KB/frontend/testing.md) | Vitest + Testing Library vs Playwright, conventions, CI |
| Roadmap | [KB/roadmap.md](KB/roadmap.md) | MVP changes 1–4 and the V2 backlog |
| Domain glossary | [GLOSSARY.md](GLOSSARY.md) | Canonical domain terms (Desk, Area, Card, Item, Jar, Win…), updated during `/opsx:propose` when a term appears or sharpens |
| Decisions | [docs/adr/](docs/adr/) | Hard-to-reverse decisions and why they were made |
| Specs | [openspec/specs/](openspec/specs/) | Living behavior specs per capability; changes in progress live in [openspec/changes/](openspec/changes/) |
| Active ticket | [KB/developers/active.md](KB/developers/active.md) | Ticket in progress + postponed ones; closed tickets in [KB/developers/done/](KB/developers/done/) |
| Learning notes | [aprendizaje/index.md](aprendizaje/index.md) | Spanish study guides for each tool in the stack (local only, not in git) |

---

## Development Workflow

Every change follows the same flow as the other Zynis projects:

1. **Ticket** — `/crear-ticket <description>` (new GitHub issue) or `/select-ticket <n>` (existing one). This creates the issue in `GianFaggi/Zynis-MTF`, the branch `{type}/{number}-{slug}` from an up-to-date `main`, and fills `KB/developers/active.md`.
2. **Propose** — `/opsx:propose`: creates an OpenSpec change named like the branch slug (e.g. `1-fundacion-pwa`) with `proposal.md` (why + scope), delta `specs/`, `design.md` and `tasks.md` in `openspec/changes/<name>/`. Use `/opsx:explore` first when the rules are still fuzzy. New or sharpened domain terms go to `GLOSSARY.md`, hard-to-reverse decisions to `docs/adr/`. The user reviews the artifacts before any code is written.
3. **Implement** — `/opsx:apply`: works through `tasks.md`. Read the relevant KB first; keep tests green (`npm test`).
4. **Archive** — on the ticket branch, once every task is done (manual phone checks included): `/opsx:archive` merges the delta specs into `openspec/specs/` and moves the change to `openspec/changes/archive/`. The archive travels with the code, so `main` gets it through the same PR: no direct push, no archive-only PR.
5. **Merge** — the user commits, pushes the ticket branch and opens the PR; it merges once CI is green. The PR carries the code, tests, docs and the archived change with its synced specs.
6. **Close** — after the merge, on an up-to-date `main` (`git checkout main`, `git pull`): `/close-ticket` closes the issue, archives the ticket to `KB/developers/done/NNN-type-slug.md`, empties `active.md`. `/postpone-ticket` parks it under Postponed instead.

Other commands: `/active` (current ticket summary), `/daily-summary`, `/sync-kb`.

**Rules:**
- **The user commits, pushes and opens PRs — never Claude.** Claude may only run `git checkout`, `git pull` and `git branch`.
- **`main` only moves through green PRs.** A GitHub ruleset requires the CI job `check` to pass before merging, with no bypass ([KB/frontend/testing.md](KB/frontend/testing.md#merge-gate)). Code, tests, docs, chores and the OpenSpec archive all go through a PR; never suggest a direct push to `main`.
- **No AI attribution.** Never add `Co-Authored-By: Claude …` trailers or "Generated with Claude Code" footers to commit messages, PR descriptions, or any commit/PR text suggested to the user.
- GitHub issues are written in **Spanish**. Their bodies always go through a temp file with `--body-file` (never `\n` inside the string). Template: `## Objetivo` + `## Criterios de Aceptación` with checkboxes.
- KBs, ADRs, OpenSpec artifacts and code comments are written in **English**. The UI is **Spanish + English**.
- gh executable: `"C:/Program Files/GitHub CLI/gh.exe"`.
- OpenSpec is a global CLI, not a project dependency: `command npm install -g @fission-ai/openspec@latest`. After upgrading it, run `openspec update` to refresh `.claude/commands/opsx/` and `.claude/skills/openspec-*`. Project context for its artifacts lives in [openspec/config.yaml](openspec/config.yaml).
- Package manager is **npm** (`package-lock.json`). The user's shell aliases `npm` to `pnpm` — use `command npm …` so the lockfile stays in sync with CI's `npm ci`.

---

## MVP Goal

The user must be able to:
- Write Cards with a title, free text and an optional checklist
- Place Cards anywhere on the Desk, move them between Areas, pan and zoom, on phone and PC
- Check Items and see a Card become finished
- Drop finished Cards into the Jar and watch it fill up; see **Mis logros** (items checked, cards finished, notes written)
- Use the app in Spanish or English
- Use it fully offline, installed as a PWA
- Export / Import a backup file (the bridge between devices until V2 sync)

---

## Stack Summary

React + TypeScript + Vite · Tailwind CSS v4 · @use-gesture/react · Zustand · vite-plugin-pwa · localStorage · lucide-react · @fontsource
Dev: Vitest + Testing Library + jsdom · Playwright · ESLint · GitHub Actions CI · Vercel (production at `https://mtf.zynis.com.ar`, [ADR 0008](docs/adr/0008-own-address.md))

Full details → [KB/frontend/stack.md](KB/frontend/stack.md)
