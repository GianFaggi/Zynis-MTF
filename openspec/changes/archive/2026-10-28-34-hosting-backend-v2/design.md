# Design

## Context

- MTF has no server: the app is static on Vercel and every note lives in the browser's localStorage ([ADR 0002](../../../docs/adr/0002-local-first-storage.md)). `KB/frontend/stack.md` ends with "V2: .NET backend — hosting and database chosen when V2 starts"; `KB/frontend/architecture.md` has the MVP vs V2 table and the storage layer as the V2 seam.
- The hosting research lives in the Zynis Cal repo, `KB/developers/hosting/` (PaaS and VM comparisons, the Neon + Render guide, researched 2026-09/10), and was refreshed for this ticket on 2026-10-27. Zynis Cal, the same stack (.NET + Postgres), moved off Railway and runs on Render Free + Neon Free (Cal #181, #182).
- The user's hosting rule: **free, or a fixed price with no usage-based charges** (traffic, requests, compute). At a limit the service may stop or slow down, never bill more. Budget for a paid step: about US$ 5 a month.
- The facts that shape the decision, as of 2026-10:

| | Render Free (web service) | Neon Free (Postgres) |
|---|---|---|
| Resources | 512 MB RAM, 0.1 CPU | 0.25 CU minimum (≈ 1 GB RAM), autoscaling up to 2 CU |
| Sleep | After 15 min without traffic; the next request waits ~1 min | Scales to zero after 5 min with no queries (fixed on Free); resumes in a few hundred ms |
| Monthly allowance | **750 instance hours per workspace**, shared by every free service in it | **Per project**: 100 CU-hours, 1 GB storage (20 GB across projects), 5 GB transfer |
| At the limit | Services suspended until the month ends | Compute suspended until the month ends; writes blocked over the storage limit; no data deleted |
| Billing with no card on file | Cannot bill | Cannot bill |
| Other | Docker deploys from GitHub, own domain with TLS, health check path; outbound SMTP ports (25, 465, 587) blocked | Open idle connections do not keep it awake; a transaction left "idle in transaction" does |

- Expected V2 use, one user: a few MB of data (localStorage caps the local copy at ~5 MB), about 20–35 Render hours and 2–4 Neon CU-hours a month with session sync (#37). Zynis Cal's prod and staging share the same Render workspace.

## Goals / Non-Goals

**Goals:**
- One place, ADR 0009, that says where the V2 backend runs, why, and how it leaves.
- Portability rules precise enough that #36 can follow them without reopening the hosting question.

**Non-Goals:**
- Choosing the backend's internal architecture, auth design or API shape (#36, #37).
- Writing specs: no behavior changes, so the change sets `skip_specs: true` (proposal, Capabilities).

## Decisions

### 1. Render Free for the API, Neon Free for Postgres, no card on file

- **Why these two**: they are the only pair found where the API runs from the project's own `Dockerfile`, Postgres is a real, standard server, both are free with no time limit, and neither can bill without a card. Zynis Cal already runs on the same pair, so the setup, the gotchas and the guide are shared.
- **Why the cold start is acceptable**: MTF is offline-first. Sync (#37) runs in the background and never blocks the Desk; the one moment a person waits is signing in, which #35 (the paper-plane wait) and #36 (waking the API with `/health` as the sign-in screen opens) cover.
- **Region**: Render Virginia (US East) and Neon AWS US East, together. Every query crosses the API ↔ database link, so the two sit side by side; the user ↔ API distance (~150 ms from Argentina) is paid once per request.
- **No card on file** on either service, so a limit stops the service instead of billing.

Alternatives (the ADR's Considered Options):
- **Railway**: usage billing on every resource, and its hard limit has a US$ 10 minimum. Breaks the rule; Zynis Cal left it.
- **Fly.io**: no free allowance for new organizations and metered by default; Managed Postgres starts at US$ 38.
- **Oracle Cloud Always Free (VM)**: halved its Arm allowance in 2026 without notice, reclaims instances that look idle (a one-user app always does), often has no capacity, and is Arm only.
- **Koyeb**: new accounts pay US$ 29 a month since February 2026.
- **Render Postgres Free**: deleted 30 days after creation.
- **Supabase Free**: 500 MB, pauses after 7 days without use and needs a manual restore; with migrations at start-up, a paused database makes the API fail to boot.
- **Azure App Service F1**: 60 CPU minutes a day, no own domain, "not for production" by Microsoft's own terms.
- **Heroku Basic + Aiven Developer** (US$ 12 fixed, no usage charges): Zynis Cal's plan for when it goes public. Within the rule but over budget for one user; kept as the PaaS alternative.
- **A VM now** (Contabo, IONOS, OVH, Hostinger Brazil, Don Web): fixed price and room for every Zynis backend, but ~1.5–2 days of setup plus 1–2 h a month of upkeep (patches, backups, firewall) before anyone needs it. It is the exit (decision 4), not the start.

### 2. The ADR holds the decision; the KBs point to it

ADR 0009 carries the decision, the alternatives, the portability rules and the exit. `stack.md` (Deployment) and `architecture.md` (MVP vs V2) say in a line or a table row what runs where and link the ADR. `roadmap.md` lists the rules under the ".NET backend" item because the issue asks for it, as a short checklist pointing to the ADR, so the full wording lives in one place.

### 3. Eight portability rules for the V2 backend

Each one removes a reason the backend could not leave Render or Neon unchanged:

| Rule | Why |
|---|---|
| A `Dockerfile` that listens on `${PORT}` (default 5000) | Render injects `PORT`; a VM sets it in Compose. The same image runs on both |
| The connection string only from `ConnectionStrings__DefaultConnection` | Moving the database is changing one variable. For Neon: Npgsql format with `SSL Mode=Require;Connection Idle Lifetime=60`, direct connection (not the pooler), as in Zynis Cal's guide |
| Migrations applied at start-up | An empty database (new Neon project, new VM) builds itself; a restored one keeps `__EFMigrationsHistory` and skips old steps |
| `/health` never touches the database | Render's health check calls it all the time; a database check would keep Neon awake and burn the 100 CU-hours |
| Standard Postgres 17, no Neon-only features (Neon Auth, Data API, branching in app logic) | `pg_dump` / `pg_restore` to any Postgres 17. A restore into an older major version fails, so dev, CI, Neon and a future VM use 17 |
| Own address `api.mtf.zynis.com.ar`, TTL 300 s at Don Web | The app calls the address, never the provider's URL, so a move only changes DNS and takes effect in minutes ([ADR 0008](../../../docs/adr/0008-own-address.md)'s rule, for the API) |
| A Neon project of its own, never shared with Zynis Cal | Each project has its own 100 CU-hours and 1 GB, and one app's load or mistakes never reach the other's data |
| An encrypted nightly backup (`pg_dump`) | Neon Free keeps only 6 hours of history. The MTF repo is public, so a backup stored as a GitHub Actions artifact must be encrypted with a key kept in the repo's secrets |

### 4. The exit to a VM: signals and steps, not a date

- **Signals**, checked once a month in the Neon and Render dashboards: Neon CU-hours over 60–70 of 100, storage over ~700 MB of 1 GB, or the shared Render hours near 750. Render's hours are expected to run out first, because Zynis Cal shares them.
- **The VM**: a provider with no usage charges (the shortlist in Zynis Cal's research), Docker Compose with Caddy (automatic TLS), the API and Postgres 17. Only Caddy is published (80/443), never the API's port, so `X-Forwarded-For` cannot be spoofed past a rate limiter.
- **The move**, about 1–2 hours once the VM is ready: a short write freeze, `pg_dump` from Neon → `pg_restore` on the VM, the connection string pointed at the Compose `db` service, the `api.mtf.zynis.com.ar` record pointed at the VM, a check, and only then the Render service and the Neon project deleted.
- Postgres inside the VM gets its own ADR when the move is decided.

### 5. No glossary term

Render, Neon, a VM and a cold start are infrastructure words, never shown to the user and never part of the domain model, so `GLOSSARY.md` gets nothing. **Account** (Cuenta) becomes a domain term with #36, which adds it.

## Risks / Trade-offs

- [Free plans change: in 2026 Koyeb, Oracle, Fly.io and Render's bandwidth all got worse] → The portability rules make a move a DNS and data job, and with no card on file a change can stop the service but never bill.
- [Render's 750 hours run out mid-month, suspending MTF and Zynis Cal together] → Session sync keeps MTF's share small; the monthly check catches it early, and the exit is ready.
- [Neon suspends compute until the month ends] → Sync waits and retries; the Desk keeps working offline, so nothing is lost. Same monthly check.
- [The cold start makes signing in feel broken] → Owned by #35 and #36 (honest wait messages, waking the API early).
- [Render blocks outbound SMTP ports] → #36's verification and recovery emails go through Resend's HTTPS API, not SMTP.

## Migration Plan

Docs only: the ADR, the KB edits and the learning note go in with the PR. Nothing deploys and nothing needs a rollback.

## Open Questions

- The encryption tool for the backup (`age` or `gpg --symmetric`) and the artifact retention (7–14 days): decided by the ticket that builds the backup workflow, since either meets the rule.
