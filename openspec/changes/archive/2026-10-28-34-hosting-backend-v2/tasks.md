# Tasks

## 1. The decision

- [x] 1.1 Write `docs/adr/0009-v2-backend-hosting.md` in the format of ADR 0008 (title as the decision, decision paragraphs, Considered Options, Consequences): Render Free + Neon Free with no card on file and the US East region (design decision 1), the hosting rule, the eight portability rules with their reason (decision 3), the exit signals and steps (decision 4), and every rejected option of decision 1 with its reason; verify each of the issue's eight rules appears, the facts match the table in design.md's Context, and the links to ADR 0002 and ADR 0008 resolve
- [x] 1.2 In the Deployment section of [KB/frontend/stack.md](../../../KB/frontend/stack.md), replace "hosting and database chosen when V2 starts" with the V2 hosting (API on Render Free, Postgres on Neon Free, `api.mtf.zynis.com.ar`) linking ADR 0009, and say nothing runs until #36; verify the MVP bullets are unchanged
- [x] 1.3 In [KB/frontend/architecture.md](../../../KB/frontend/architecture.md), name the V2 hosting in the data-flow diagram's V2 line and add a Hosting row to the MVP vs V2 table (Vercel only · Vercel + Render + Neon, ADR 0009); verify the diagram stays plain ASCII and aligned
- [x] 1.4 In the V2 Backlog of [KB/roadmap.md](../../../KB/roadmap.md), make the ".NET backend" item link ADR 0009 and list the eight portability rules as a short checklist pointing to the ADR, with #36 and #37 named as the tickets that build it; verify the other backlog items are unchanged
- [x] 1.5 Read [GLOSSARY.md](../../../GLOSSARY.md); verify no term needs a change (design decision 5: hosting words are not domain terms; Account comes with #36)

## 2. Learning note

- [x] 2.1 Write `aprendizaje/hosting-backend.md` (local only, Spanish, the Qué es / Por qué lo usamos / Conceptos clave shape of the other notes): Render (web service, Docker deploy, sleep after 15 min, the shared 750 hours), Neon (CU-hours, scale to zero, the free limits), why no card on file, the cold start and why MTF tolerates it, and the exit to a VM; add it to the table in `aprendizaje/index.md`; verify the numbers match design.md's Context

## 3. Integration

- [x] 3.1 Run `command npm run lint`, `command npm test` and `command npm run build`; verify all pass (no code changed; Playwright is not required, CI runs it on the PR)
- [x] 3.2 Clean-code pass over the changed docs (links resolve, terms match the KBs, no duplicated rule wording outside the ADR beyond the roadmap checklist); fill Technical Context, Modified Files and Pending in `KB/developers/active.md`; verify `openspec validate 34-hosting-backend-v2` passes

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (no spec deltas to merge, `skip_specs: true`), then the user commits, pushes and opens the PR.
- After the merge, on an up-to-date `main`: `/close-ticket`, then `/select-ticket 35` or `/select-ticket 36`.
