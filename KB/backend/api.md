---
area: backend
description: The .NET 10 API in api/ — layout, layers, settings, running it locally, data model, and what is deliberately not copied from Zynis Cal
---

# Backend API

MTF's first server, created by #36 for accounts. It lives in `api/` in this repo, runs on Render Free with Postgres 17 on Neon Free ([ADR 0009](../../docs/adr/0009-v2-backend-hosting.md)), and is reached at `https://api.mtf.zynis.com.ar`. The Desk never needs it: the app only calls it from the Account sheet ([architecture.md](../frontend/architecture.md)).

The behavior is specified in [openspec/specs/backend-service](../../openspec/specs/backend-service/spec.md), [accounts](../../openspec/specs/accounts/spec.md) and [account-session](../../openspec/specs/account-session/spec.md).

## Layout

```
api/
  Mtf.slnx                      solution (the new XML format)
  Dockerfile  .dockerignore     one image for Render and any VM; build context is api/
  docker-compose.yml            local Postgres 17 + the API
  Mtf.Api/
    Controllers/                HTTP only: bind the request, call a service, map the answer
    Services/  Services/Interfaces/   the rules (accounts, sessions, Google, mail, tokens)
    DAOs/      DAOs/Interfaces/       the only code that touches AppDbContext
    DTOs/                       request and answer shapes
    Models/                     EF entities (Entity base: uuid id, created_at, updated_at)
    Data/                       AppDbContext, design-time factory
    Migrations/                 EF migrations, applied at start-up
    Infrastructure/             RequiredSettings, ApiException + handler, token defaults
    Program.cs
  Mtf.Api.Tests/                xUnit: integration tests against Postgres 17 in a container, plus unit tests
```

**Layers: controller → service → DAO → `AppDbContext`, each behind an interface**, as in Zynis Cal. Controllers hold no rules, services never touch `AppDbContext`, DAOs hold no rules. Every dependency is injected through its interface, registered in `Program.cs`.

**Errors**: a service throws `ApiException(status, code)` for an expected refusal; `ApiExceptionHandler` answers `ProblemDetails` with a `code` extension (`invalid_credentials`, `session_ended`, …) that the app translates. Anything else answers 500 `server_error` with no detail; the exception and a trace id go to the log. A malformed body answers 400 `invalid_request`.

**Time** comes from an injected `TimeProvider`, never `DateTime.UtcNow`, so tests move the clock with `FakeTimeProvider`. That includes the access token's lifetime check (no clock skew).

## Settings

All environment variables. `RequiredSettings` checks them before anything starts and refuses to start naming what is missing, never a value. In `Development`, Google and mail are optional: Google answers that it is not set up, and mail is logged instead of sent.

| Setting | Required | Use |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | always | The database. **No `DATABASE_URL` fallback** (ADR 0009, rule 2). Neon: the direct connection in Npgsql format, `SSL Mode=Require;Connection Idle Lifetime=60` |
| `Jwt__Key` | always | HS256 signing key, at least 32 characters |
| `App__FrontendUrl` | always | Mail links: `https://mtf.zynis.com.ar` |
| `App__ApiUrl` | always | Google's redirect address: `https://api.mtf.zynis.com.ar` |
| `Cors__AllowedOrigins__0` | always | Allowed browser origin. Production: `https://mtf.zynis.com.ar` alone |
| `Google__ClientId`, `Google__ClientSecret` | outside Development | MTF's own OAuth client |
| `RESEND_API_KEY` | outside Development | MTF's own Resend key, sending only |
| `Email__From` | outside Development | `MTF By Zynis <no-reply@zynis.com.ar>` |
| `PORT` | no | Injected by Render; default 5000 |
| `RateLimiting__{Global,Auth,Session}__PermitLimit` | no | Override the limits (tests lower or raise them) |
| `RequestLimits__MaxBodyBytes` | no | Default 64 KB |

`appsettings.json` holds no secret. `appsettings.Development.json` holds only local values (the compose database, a dev-only signing key, `localhost` addresses). Real local secrets (a Google client, a Resend key) go in user secrets:

```bash
dotnet user-secrets set "Google:ClientSecret" "<value>" --project api/Mtf.Api
```

## Running it locally

Needs the .NET 10 SDK and Docker Desktop running. From the repo root:

```bash
dotnet build api/Mtf.slnx          # build
dotnet test api/Mtf.slnx           # every test; starts Postgres 17 containers itself
```

Two ways to run the API on `http://localhost:5000`:

```bash
# A. Postgres in Docker, the API from source (fast to iterate; reads appsettings.Development.json)
docker compose -f api/docker-compose.yml up -d db
dotnet run --project api/Mtf.Api

# B. Both in Docker, the same image Render runs
docker compose -f api/docker-compose.yml up -d --build
```

Check it: `curl http://localhost:5000/health` answers `Healthy`. Stop with `docker compose -f api/docker-compose.yml down` (add `-v` to delete the local database). The front end's dev server (`command npm run dev`) calls `http://localhost:5000` by itself.

**Migrations** run when the API starts (ADR 0009, rule 3), so there is no `database update` step. To add one after changing a model (needs the `dotnet-ef` tool: `dotnet tool install --global dotnet-ef`):

```bash
dotnet ef migrations add <Name> --project api/Mtf.Api --output-dir Migrations
dotnet ef migrations list --project api/Mtf.Api
```

## Data model

Four tables, snake_case names, `timestamptz` times, `uuid` ids from `Guid.NewGuid()` (v4, like the front end). Every row has `created_at` / `updated_at`, stamped by `AppDbContext.SaveChangesAsync` from the injected clock.

```
users            id · email (unique, normalized) · password_hash? · google_id? (unique)
                 email_verified · created_at · updated_at
sessions         id · user_id → users (cascade) · token_hash (unique) · previous_token_hash? (index)
                 rotated_at? · expires_at · created_at · updated_at
email_tokens     id · user_id → users (cascade) · purpose (Verify | Reset) · token_hash (unique)
                 expires_at · created_at · updated_at · unique (user_id, purpose)
google_handoffs  id · secret_hash (unique) · language · user_id? → users (cascade)
                 failed · expires_at · created_at · updated_at
```

- **`users` is the minimal record** the ticket asks for: no name, no photo, no tokens. Mail tokens get rows of their own.
- **Emails are normalized** (`Trim().ToLowerInvariant()`) on the way in and stored that way, so a plain unique index is enough, with no `citext`.
- **No secret is stored readable.** Passwords are bcrypt hashes; mail tokens, renewal tokens and Google hand-off secrets are 256-bit random values stored as SHA-256 (right for random input: there is nothing to guess).
- **`email_tokens` holds one live token per purpose**, replaced on every send: its `created_at` is the 60-second wait, and a new mail kills the old link.
- **Clean-up with no background job** (a job would wake Neon on a schedule): expired sessions of a user are deleted when that user signs in, expired mail tokens are replaced by the next send, expired hand-offs are deleted when the next one starts.

## Sessions

Why a refresh token in localStorage and an access token in memory, and not an HttpOnly cookie → [ADR 0010](../../docs/adr/0010-account-sessions.md).

| Token | What | Lives | Kept by the app |
|---|---|---|---|
| Access | JWT, HS256, `sub` + `email`, issuer and audience `mtf` | 15 minutes | In memory (`accountStore`) |
| Renewal (refresh) | 256 random bits, opaque; the row holds only its SHA-256 | 180 days from its last renewal | `mtf_session` in localStorage |

- **`TokenService`** issues the access token. `Program.cs` checks it with **no clock skew** and against the injected clock, so it is refused the second it turns 15 minutes old. `MapInboundClaims = false`: the id is read from `sub` (`User.GetUserId()`).
- **`SessionService`** owns the renewal rules; **`SessionDao`** is the only code touching `sessions`.
  - `StartAsync` (sign-in): deletes the user's expired sessions, then adds one row per signed-in device.
  - `RefreshAsync`: the token matches `token_hash` → rotate (`previous_token_hash` = the old hash, a new hash, `rotated_at`, `expires_at` = now + 180 d). It matches `previous_token_hash` less than 2 minutes after `rotated_at` → rotate again (a lost answer, a second tab). Matched later than that, or past `expires_at` → the session is deleted. Unknown → refused, nothing changes. Every refusal is 401 `session_ended`, the only answer that ends a session on the device.
  - **Rotation is a conditional update** (`UPDATE … WHERE id = @id AND token_hash = @expected`). If two renewals race, the loser's update matches no row; it reads the session again, finds its token as the previous one and takes the grace path. So both tabs keep working instead of one silently overwriting the other.
  - `LogoutAsync` deletes the session holding the token, current or just retired; always 204. `EndAllAsync` (password reset) deletes every session of the user.
- **`GET /api/auth/me`** is the only endpoint behind the access token in #36: `{ email, hasPassword, hasGoogle }`.
- **Limits**: `refresh` and `logout` are in the `session` rate-limit policy (30 / min), apart from the sign-in endpoints.

## Google

Why a window of its own with a hand-off by secret, and not Cal's redirect or Google's button → [ADR 0011](../../docs/adr/0011-google-sign-in-handoff.md).

```
App (Account sheet)                          API                                   Google
secret = 256 random bits; hash = SHA-256(secret)
window.open(GET google/login?handoff=hash&lang=es) → google_handoffs row (5 min) → 302 → consent screen
POST google/exchange {secret} every 3 s → 202 pending
                                             GET google/callback?code&state=hash ← user finishes
                                             code → ID token → validate → link/create user
                                             row.user_id = user; small "go back to MTF" page
POST google/exchange {secret}              → 200 tokens; row deleted (once)
```

- **The hash** the app sends is `SecretToken.Hash(secret)`: SHA-256 of the secret's UTF-8 text, base64url with no padding (43 characters). `google/login` refuses anything else with 400 `invalid_request`. Only the hash ever appears in an address; the secret travels only in the `POST` body.
- **`GoogleController`** maps the three endpoints; **`GoogleAuthService`** holds the rules; **`GoogleHandoffDao`** is the only code touching `google_handoffs`; **`GoogleClient`** (`IGoogleClient`) does Google's side.
- **`GoogleClient`**: `scope=openid email` (no `profile`: MTF stores no name or photo), `prompt=select_account`, `state` = the hash, redirect `{App__ApiUrl}/api/auth/google/callback`. The code is traded for an ID token on the server, and `GoogleJsonWebSignature.ValidateAsync` checks Google's signature, issuer, expiry and that the audience is MTF's client. With no `Google__ClientId` (Development only), `google/login` answers the "could not sign in" page instead of redirecting.
- **Callback rules**: the email must be `email_verified` at Google. Lookup by `google_id`, so a changed email at Google still reaches the same account; else by email, which links the account; else a new verified account with no password. **Linking an unverified account removes its password** (pre-hijacking: someone registered the victim's address first). A failure, a cancel at Google or an unverified email marks the row `failed`.
- **The window's page** (`GooglePages`) is in the language the app started in, carries no token, loads nothing from elsewhere, is `no-store` and `no-referrer`, and runs `window.close()`.
- **Exchange**: 202 while pending; 200 with tokens exactly once (the row is deleted in one statement, so a second request gets nothing); 410 `google_failed` when it failed, expired (5 minutes from the start), was already handed over or never existed.
- **Tests**: `GoogleTests` run the whole flow with `FakeGoogleClient`; `GoogleClientTests` run the real `GoogleJsonWebSignature` against a forged token (another key, another audience), so the seam never hides the check that matters. They fetch Google's public keys, so they need the network.

### Creating MTF's OAuth client

MTF has a client of its own, never Cal's: revoking one never touches the other. Both clients live in the brand's Google Cloud project, **Zynis** (decided during #36's task 10.2), so they share one consent screen: its app name is the brand, `Zynis`, its authorized domain `zynis.com.ar`, and it is published to production with only non-sensitive scopes (Cal asks `openid email profile`, MTF `openid email`, a subset). If an app of the brand ever needs a sensitive scope (Gmail, Drive, Calendar), it moves to a project of its own, since Google verifies the whole consent screen. Publishing the consent screen needs an app name, a support email, a home page (`https://mtf.zynis.com.ar`, since `zynis.com.ar` serves nothing) and a privacy policy (`https://mtf.zynis.com.ar/privacidad.html`, the brand's page, covering both apps; [pwa.md](../frontend/pwa.md)). Step by step, in Spanish, in `aprendizaje/oauth-google.md`. In short: Google Auth Platform with External audience, published to production; a "Web application" client named `MTF API` whose authorized redirect URIs are `https://api.mtf.zynis.com.ar/api/auth/google/callback` and `http://localhost:5000/api/auth/google/callback` (no JavaScript origins: the flow runs on the server). Its id and secret go in Render as `Google__ClientId` / `Google__ClientSecret`, and locally in user secrets.

## Rate limits

ASP.NET's built-in limiter, fixed one-minute windows, partitioned by client IP (`Infrastructure/RateLimiting.cs`, design decision 7). `UseForwardedHeaders` runs first and trusts `X-Forwarded-For`, so on Render the partition is the real client, not the proxy.

| Policy | Default | Applies to |
|---|---|---|
| global | 60 / min | everything except `/health` |
| `auth` | 10 / min | register, verify-email, resend-verification, login, forgot-password, reset-password, `google/login`, `google/callback` |
| `session` | 30 / min | refresh, logout, `google/exchange` (a poll every 3 s is 20 / min) |

A refused request answers 429 with `Retry-After` and code `too_many_requests` before any controller runs, so a blocked sign-in never checks a password. Overridable with `RateLimiting__<Policy>__PermitLimit` (tests do).

## What is deliberately not copied from Zynis Cal

Cal is the reference (same stack, same Render + Neon guide). Its shape is copied; these are not:

| Cal | MTF | Why |
|---|---|---|
| Token in the Google redirect's query string | Hand-off by secret ([ADR 0011](../../docs/adr/0011-google-sign-in-handoff.md)) | Addresses end up in history and logs |
| No `state` in the Google flow | `state` = hand-off hash | Login CSRF |
| Links an unverified account and keeps its password | Removes the password | Pre-hijacking |
| Does not check `email_verified` | Must be true | Linking on an unproven address |
| Reset and verify tokens readable, verify never expires | SHA-256, 24 h and 1 h | A database copy must not sign anyone in |
| Register answers differently for an existing email | Same answer always | Account discovery |
| `AllowAnyOrigin` | One origin in production | Less to abuse |
| 24-hour JWT in localStorage, no refresh | 15-minute JWT + rotating refresh ([ADR 0010](../../docs/adr/0010-account-sessions.md)) | Revocable |
| `DATABASE_URL` fallback | One setting only | ADR 0009, rule 2 |
| Postgres 16 in CI | 17 everywhere | ADR 0009, rule 5 |
| `scope=openid email profile`, `access_type=offline` | `openid email` | No name or photo; no Google refresh token needed |
| OpenAPI + Scalar | None | The API has one client |
| Rate limit 5 / min on auth | 10 / min | Cal's hosting notes: 5 refuses real users behind Argentine mobile CGNAT |
