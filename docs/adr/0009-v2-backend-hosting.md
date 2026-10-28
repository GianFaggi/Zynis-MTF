# The V2 backend runs on Render Free and Neon Free, built to move to a VM

The V2 .NET backend (accounts in #36, sync in #37) runs its API as a **Render Free** web service and its Postgres database on **Neon Free**, with **no card on file** on either service. Both sit in US East, side by side: Render Virginia and Neon AWS US East. Every query crosses the API ↔ database link, so the two sit together; the user ↔ API distance (~150 ms from Argentina) is paid once per request. Zynis Cal, the same stack (.NET + Postgres), already runs on this pair, so the setup, its gotchas and the guide in Zynis Cal's `KB/developers/hosting/` are shared.

The hosting rule: **free, or a fixed price with no usage-based charges** (traffic, requests, compute). At a limit a service may stop or slow down, never bill more. The budget for a paid step is about US$ 5 a month. Without a card on file, neither Render nor Neon can bill: a limit suspends the service until the month ends, and Neon deletes no data.

The free plans as of 2026-10:

| | Render Free (web service) | Neon Free (Postgres) |
|---|---|---|
| Resources | 512 MB RAM, 0.1 CPU | 0.25 CU minimum (≈ 1 GB RAM), autoscaling up to 2 CU |
| Sleep | After 15 min without traffic; the next request waits ~1 min | Scales to zero after 5 min with no queries (fixed on Free); resumes in a few hundred ms |
| Monthly allowance | **750 instance hours per workspace**, shared by every free service in it | **Per project**: 100 CU-hours, 1 GB storage (20 GB across projects), 5 GB transfer |
| At the limit | Services suspended until the month ends | Compute suspended until the month ends; writes blocked over the storage limit; no data deleted |
| Other | Docker deploys from GitHub, own domain with TLS, health check path; outbound SMTP ports (25, 465, 587) blocked | Open idle connections do not keep it awake; a transaction left "idle in transaction" does |

The cold start is acceptable because MTF is offline-first ([ADR 0002](0002-local-first-storage.md)): sync runs in the background and never blocks the Desk. The one moment a person waits is signing in, which #35 (the paper-plane wait) and #36 (waking the API with `/health` as the sign-in screen opens) cover.

Expected use, one user: a few MB of data (localStorage caps the local copy at ~5 MB), about 20–35 Render hours and 2–4 Neon CU-hours a month with session sync. Render's 750 hours are shared with Zynis Cal's prod and staging, in the same workspace, so they are the first limit V2 is expected to reach.

## Portability rules

Free plans change. The V2 backend follows these rules so that leaving Render or Neon is a DNS and data move, never a code change. Each one removes a reason the backend could not leave unchanged:

1. **A `Dockerfile` that listens on `${PORT}`** (default 5000). Render injects `PORT`; a VM sets it in Compose. The same image runs on both.
2. **The connection string only from `ConnectionStrings__DefaultConnection`.** Moving the database is changing one variable. For Neon: Npgsql format with `SSL Mode=Require;Connection Idle Lifetime=60`, the direct connection (not the pooler), as in Zynis Cal's guide.
3. **Migrations applied at start-up.** An empty database (a new Neon project, a new VM) builds itself; a restored one keeps `__EFMigrationsHistory` and skips the steps it already has.
4. **`/health` never touches the database.** Render's health check calls it all the time; a database check would keep Neon awake and burn the 100 CU-hours.
5. **Standard Postgres 17, no Neon-only features** (Neon Auth, the Data API, branching in app logic). The data moves with `pg_dump` / `pg_restore` to any Postgres 17. A restore into an older major version fails, so dev, CI, Neon and a future VM all use 17.
6. **The own address `api.mtf.zynis.com.ar`, TTL 300 s at Don Web.** The app calls the address, never the provider's URL, so a move only changes DNS and takes effect in minutes: [ADR 0008](0008-own-address.md)'s rule, for the API.
7. **A Neon project of its own, never shared with Zynis Cal.** Each project has its own 100 CU-hours and 1 GB, and one app's load or mistakes never reach the other's data.
8. **An encrypted nightly backup (`pg_dump`).** Neon Free keeps only 6 hours of history. The MTF repo is public, so a backup stored as a GitHub Actions artifact is encrypted with a key kept in the repo's secrets. The tool (`age` or `gpg --symmetric`) and the retention (7–14 days) are chosen by the ticket that builds the backup workflow.

## The exit to a VM

The move is triggered by signals, not a date. Once a month, the Neon and Render dashboards are checked for:

- Neon CU-hours over 60–70 of 100,
- Neon storage over ~700 MB of 1 GB,
- the shared Render hours near 750 (expected first, because Zynis Cal shares them).

The VM: a provider with no usage charges (the shortlist in Zynis Cal's research), running Docker Compose with Caddy (automatic TLS), the API and Postgres 17. Only Caddy is published (80/443), never the API's port, so `X-Forwarded-For` cannot be spoofed past a rate limiter.

The move, about 1–2 hours once the VM is ready:

1. A short write freeze.
2. `pg_dump` from Neon → `pg_restore` on the VM.
3. The connection string pointed at the Compose `db` service.
4. The `api.mtf.zynis.com.ar` record pointed at the VM, and a check.
5. Only then, the Render service and the Neon project deleted.

Postgres inside the VM gets its own ADR when the move is decided.

## Considered Options

- **Railway**: rejected. It bills every resource by usage, and its hard limit has a US$ 10 minimum. It breaks the hosting rule; Zynis Cal left it.
- **Fly.io**: rejected. No free allowance for new organizations, metered by default, and Managed Postgres starts at US$ 38.
- **Oracle Cloud Always Free (VM)**: rejected. It halved its Arm allowance in 2026 without notice, reclaims instances that look idle (a one-user app always does), often has no capacity, and is Arm only.
- **Koyeb**: rejected. New accounts pay US$ 29 a month since February 2026.
- **Render Postgres Free**: rejected. The database is deleted 30 days after creation.
- **Supabase Free**: rejected. 500 MB, and it pauses after 7 days without use and needs a manual restore; with migrations at start-up, a paused database makes the API fail to boot.
- **Azure App Service F1**: rejected. 60 CPU minutes a day, no own domain, and "not for production" by Microsoft's own terms.
- **Heroku Basic + Aiven Developer** (US$ 12 fixed, no usage charges): rejected for now. It is within the rule and is Zynis Cal's plan for when it goes public, but it is over budget for one user. Kept as the PaaS alternative.
- **A VM now** (Contabo, IONOS, OVH, Hostinger Brazil, Don Web): rejected for now. A fixed price and room for every Zynis backend, but ~1.5–2 days of setup plus 1–2 hours a month of upkeep (patches, backups, firewall) before anyone needs it. It is the exit, not the start.

## Consequences

- Nothing runs yet. The `api/` folder, the Render service, the Neon project and the `api.mtf.zynis.com.ar` record are created by #36, which also turns the portability rules into specs that can be checked.
- The first request after 15 quiet minutes waits about a minute for Render to wake up. Sync waits and retries in the background; signing in shows an honest wait (#35) and wakes the API early (#36).
- When Render's 750 hours run out, MTF's API and Zynis Cal stop together until the month ends; when Neon's compute does, sync waits. The Desk keeps working offline, so no note is lost. The monthly check catches both early, and the exit is ready.
- Render blocks outbound SMTP, so #36's verification and recovery emails go through an HTTPS email API (Resend), not SMTP.
- A free plan that gets worse can stop the service but never bill, because no card is on file.
