# Proposal

## Why

The MVP is complete (changes 1–4 plus the small tickets), and V2 starts with accounts (#36) and session sync (#37), both of which need the .NET backend that `KB/frontend/stack.md` still describes as "hosting and database chosen when V2 starts". The hosting has now been chosen, after the research done for Zynis Cal: **Render Free for the API and Neon Free for Postgres**, under the user's rule that hosting is free or a fixed price, never billed by usage. Recording it before any backend code exists lets #36 build to a fixed set of portability rules, so the day usage outgrows the free plans, moving to a VM is a DNS and data move, not a rewrite.

## What Changes

- **ADR 0009**: the V2 backend runs on Render Free + Neon Free; the hosting criterion (free or fixed price, no usage charges); why not Railway, Fly.io, Oracle Always Free and the other options; the exit to a VM and the signals that trigger it.
- **Portability rules** for the V2 backend, written once in the ADR and listed in the roadmap: a `Dockerfile` listening on `${PORT}`, the connection string only from `ConnectionStrings__DefaultConnection`, migrations at start-up, a `/health` that never touches the database, standard Postgres 17 with no Neon-only features, the own address `api.mtf.zynis.com.ar` with a low TTL, a Neon project of its own (never shared with Zynis Cal), and an encrypted nightly backup.
- **KBs**: `KB/frontend/stack.md` (Deployment) and `KB/frontend/architecture.md` (MVP vs V2) name the V2 hosting; `KB/roadmap.md` links the ADR from the ".NET backend" item of the V2 backlog.
- **Learning note**: a Spanish `aprendizaje/` note on Render, Neon, cold starts and the free-plan limits, since both are new tools for the user.
- **Nothing runs yet**: no code, no `api/` folder, no Render or Neon project. Those come with #36.

### Acceptance criteria → scope

| Issue #34 criterion | Covered by |
|---|---|
| ADR `docs/adr/0009-v2-backend-hosting.md`: Render Free + Neon Free, the criterion, why not Railway / Fly.io / Oracle Free, the exit to a VM | `docs/adr/0009-v2-backend-hosting.md` (design decisions 1–4) |
| `KB/frontend/stack.md` and `KB/frontend/architecture.md` (MVP vs V2) reflect the V2 hosting | Deployment section of `stack.md`; MVP vs V2 table and data-flow note of `architecture.md` |
| `KB/roadmap.md`: the ".NET backend" item links the ADR and lists the portability rules | V2 Backlog of `KB/roadmap.md` |
| Portability rules written for the V2 backend (the eight listed in the issue) | ADR 0009, "Portability rules" (design decision 3), mirrored in the roadmap |
| `GLOSSARY.md` reviewed for new terms | Reviewed in the tasks; design decision 5 explains why no term is added |

### Out of scope

- The backend code, the `api/` folder, CI for it, and creating the Render service, the Neon project, the Google OAuth client or the DNS record: #36.
- Accounts, login and anything users see: #36. Sync and when it runs: #37. The paper-plane wait animation: #35.
- Moving to a VM: only its signals and steps are recorded; the move itself is a future ticket.
- `CLAUDE.md`'s "MVP = no backend" rule: it stays true until #36 writes backend code, and #36 updates it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change records a decision and rules for code that does not exist yet; no behavior of MTF changes, so the change sets `skip_specs: true`. The requirements the backend must meet become specs in #36, where they can be checked.

## Impact

- **Docs**: new `docs/adr/0009-v2-backend-hosting.md`; `KB/frontend/stack.md`, `KB/frontend/architecture.md`, `KB/roadmap.md`; `GLOSSARY.md` reviewed; new `aprendizaje/` note (local only).
- **Code, data, tests, dependencies**: none.
- **Users**: none. MTF stays fully offline with no server.
- **Shared resources**: the ADR records that Render's 750 free hours a month are per workspace and shared with Zynis Cal (prod and staging), which is the first limit V2 is expected to reach.
