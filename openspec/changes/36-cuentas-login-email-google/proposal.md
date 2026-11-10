# Proposal

## Why

The MVP is finished and its only bridge between phone and PC is a Backup file. Automatic sync (#37) needs to know whose Desk it is moving, so accounts come first. This is also the first time MTF has a server, so this change creates the backend and its hosting (ADR 0009), and proves that an account never gets in the way of a notepad that opens with no signal.

## What Changes

- **New .NET 10 Web API in `api/`**, in this repo, following the portability rules of ADR 0009 (`Dockerfile` on `${PORT}`, connection string only from `ConnectionStrings__DefaultConnection`, migrations at start-up, `/health` that never touches the database).
- **Accounts**: register with email + password, verify by mail, sign in only once verified, resend the verification with a minimum wait, recover the password by mail, and sign in with Google, linking to an account with the same email.
- **Sessions** that never expire offline and never block the Desk: a short access token in memory and a long, rotating renewal token on the device.
- **Settings → Cuenta**: sign in, register, recover, sign out and see which account you are in, in Spanish and English. MTF keeps working with no account, exactly as today.
- **The first network requests MTF makes**, only to its own API and only from the Account sheet. Opening the sheet wakes Render with `/health`; waiting uses the paper plane built in #35.
- **Infrastructure**: Neon project, Render service, `api.mtf.zynis.com.ar`, a Google OAuth client of its own, Resend sending, and a new required CI check.
- **Docs**: `CLAUDE.md` moves from "the MVP" to "V2 starts", plus stack, architecture, a new backend KB, roadmap, glossary and `aprendizaje/` notes.

### Acceptance criteria of #36

| Criterion | Where |
|---|---|
| .NET 10 Web API in `api/` with the portability rules | `backend-service` spec; design 1 |
| Minimal user data, no name or photo | `accounts` spec; design 2 |
| Register + bcrypt + verification mail; sign-in only when verified | `accounts` spec; design 3 |
| Resend the verification, with a minimum wait | `accounts` spec; design 3 |
| Recover the password, with a token that expires | `accounts` spec; design 3 |
| Google: the back validates the ID token; links by email | `accounts` spec; design 5, ADR 0011 |
| Rate limiting on auth endpoints | `accounts` spec; design 7 |
| Session never expires offline, never blocks the Desk; tokens defined | `account-session` spec; design 4, ADR 0010 |
| Settings → Cuenta, Spanish and English | `accounts` spec; design 8 |
| `/health` wakes Render as the screen opens; paper plane meanwhile | `accounts` spec; design 9 |
| Neon, Render, domain, OAuth client, CORS for `mtf.zynis.com.ar` only | `backend-service` spec; design 12; tasks group 10 |
| Mails with Resend from `@zynis.com.ar` | `accounts` spec; design 6 |
| Backend in CI, under the `main` rule | `backend-service` spec; design 11 |
| Integration tests against Postgres in a container; front tests | design 13; every tasks group |
| Docs and `aprendizaje/` notes | tasks, in each group and group 9 |

### Out of scope

- **Syncing anything (#37).** Signing in sends no Card, Area or Win to the server; the account only exists.
- **The encrypted nightly backup (ADR 0009, rule 8).** It is a portability rule but not an acceptance criterion here, and this change stores no notes. It has to exist before #37 stores them, so it stays on the V2 backlog.
- **Deleting an account, changing the email, changing the password while signed in** (recovery covers a forgotten one). Added to the V2 backlog.
- A list of a user's devices or sessions, two-factor sign-in, other sign-in providers.

## Capabilities

### New Capabilities

- `accounts`: what an account is, how it is created, verified, recovered and linked to Google, how it is protected from abuse, and the Account sheet in Settings.
- `account-session`: how a signed-in session is kept on the device, renewed and ended, and the promise that it never expires offline or blocks the Desk.
- `backend-service`: how the API runs and moves between hosts: container, configuration, migrations, health check, allowed origins and its address.

### Modified Capabilities

- `pwa-offline`: "No network needed at runtime" changes, because MTF now makes requests to its own API when the user opens the Account sheet. The Desk still needs none.

## Impact

- **New**: `api/` (the service and its tests), `src/account/`, `.github/workflows/ci-backend.yml`, `.vercelignore`, `KB/backend/api.md`, ADRs 0010 and 0011.
- **Changed**: `src/App.tsx` (Settings), `src/main.tsx` (reading mail links), `src/lib/storage.ts` (`mtf_session`), `src/i18n/locales/*`, `vercel.json` (a Content Security Policy), `eslint.config.js`, `.gitignore`.
- **New backend dependencies**: EF Core + Npgsql, JWT bearer, BCrypt.Net-Next, Google.Apis.Auth, Resend; xUnit, Testcontainers and the time-provider test helper for tests. **No new front-end dependency.**
- **Services**: Neon `mtf-prod`, Render `mtf-api`, a Google OAuth client and a Resend API key, all on free plans with no card (ADR 0009). The Resend quota is shared with Zynis Cal.
- **Merge gate**: the `main` ruleset gains a second required check.
- **Unchanged**: the Desk, Cards, Wins, the Jar, the data document (no schema bump) and the Backup format.
