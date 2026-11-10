# Design

## Context

See proposal.md (Why). MTF has made no network request until now: the service worker precaches everything and has no runtime caching ([pwa.md](../../../KB/frontend/pwa.md)), there is no router, every screen is a sheet over the Desk, and localStorage is reached only through `src/lib/storage.ts`.

What shapes the approach:

- **Hosting** is fixed by [ADR 0009](../../../docs/adr/0009-v2-backend-hosting.md): Render Free (0.1 CPU, sleeps after 15 minutes, about a minute to wake) and Neon Free, with eight portability rules. Render blocks SMTP.
- **The waiting UI exists** ([#35](../../../openspec/specs/server-wait/spec.md)): `{pending && <PlaneWait />}` starts and ends a wait by mounting; the timeline ends at 90 s.
- **The reference is Zynis Cal's login**, the same stack. Its shape is copied; decision 14 lists what is deliberately not.
- **An installed iPhone app has storage of its own**, separate from Safari ([pwa.md](../../../KB/frontend/pwa.md#ios-specifics)). A mail link opens in Safari, and an OAuth screen opened from an installed app runs outside the app's storage. This drives decisions 3 and 5.
- `mtf.zynis.com.ar` and `api.mtf.zynis.com.ar` are different origins and the same site, on different hosts behind different CNAMEs (Vercel and Render).

## Goals / Non-Goals

**Goals:**
- A backend that leaves Render or Neon with no code change, with each portability rule checked by a test or in CI.
- One Google flow for every platform, including the installed iPhone app.
- No token in any address, and nothing readable in a copy of the database.

**Non-Goals:**
- A sync API (#37). The access token protects only `GET /me` for now.
- A router in the front end, or background requests while the user works on the Desk.
- The encrypted nightly backup (proposal, Out of scope).

## Decisions

### 1. `api/` layout, and a small service

```
api/
  Mtf.slnx
  Dockerfile  .dockerignore  docker-compose.yml
  Mtf.Api/         Controllers/ Services/ DAOs/ DTOs/ Data/ Models/ Migrations/ Infrastructure/ Program.cs
  Mtf.Api.Tests/   integration tests + a few plain unit tests
```

`Program.cs` follows Cal's: `AddControllers`, `AddDbContext`, JWT bearer, CORS, rate limiter, `MapHealthChecks("/health")`, `MigrateAsync()` at start-up. **Layers are controller → service → DAO → `AppDbContext`, each behind an interface** (`Services/Interfaces/`, `DAOs/Interfaces/`), as in Cal. Chosen by the user during `/opsx:apply` for clean code: controllers only map HTTP, services hold the rules, DAOs are the only code that touches `AppDbContext`, and the same shape carries into #37. `Infrastructure/` holds the cross-cutting pieces (`RequiredSettings`, the exception handler). The Dockerfile is Cal's (`sdk:10.0-alpine` → `aspnet:10.0-alpine`, `krb5-libs` for Npgsql, `USER app`, `exec dotnet Mtf.Api.dll --urls http://+:${PORT:-5000}`), built with `api/` as its context. Render's Root Directory is `api`, so a front-end merge does not redeploy the API.

`docker-compose.yml` runs `postgres:17-alpine` and the API for local work. A local run also works with `docker compose up db` + `dotnet run`.

**Settings**, all environment variables, checked at start-up by a small `RequiredSettings` guard that names what is missing (never its value); in `Development`, Google and mail are optional and missing mail logs the link instead of sending it:

| Setting | Use |
|---|---|
| `ConnectionStrings__DefaultConnection` | Database. No `DATABASE_URL` fallback, unlike Cal (rule 2). For Neon: the direct connection, `SSL Mode=Require;Connection Idle Lifetime=60` |
| `Jwt__Key` | HS256 signing key, at least 32 characters |
| `App__FrontendUrl`, `App__ApiUrl` | Mail links; Google's redirect address |
| `Cors__AllowedOrigins__0` | Allowed origins. Production: `https://mtf.zynis.com.ar` alone |
| `Google__ClientId`, `Google__ClientSecret` | The OAuth client |
| `RESEND_API_KEY`, `Email__From` | Mail. Sender `MTF By Zynis <no-reply@zynis.com.ar>` |
| `PORT` | Injected by Render; default 5000 |

### 2. Data model: four tables, and the user row stays minimal

```
users            id uuid PK · email (unique, normalized) · password_hash? · google_id? (unique)
                 email_verified · created_at · updated_at

sessions         id uuid PK · user_id FK → users (cascade) · token_hash (unique)
                 previous_token_hash? (index) · rotated_at? · expires_at · created_at · updated_at

email_tokens     id uuid PK · user_id FK → users (cascade) · purpose (verify | reset)
                 token_hash (unique) · expires_at · created_at · updated_at
                 unique (user_id, purpose)

google_handoffs  id uuid PK · secret_hash (unique) · language · user_id? FK → users (cascade)
                 failed · expires_at · created_at · updated_at
```

- **`users` is exactly what the ticket lists.** Cal keeps tokens and "last email sent" as columns on its user; here they get rows of their own, so `users` stays the minimal record the acceptance criterion asks for. `email_tokens` holds one live token per purpose, replaced on every send, so `created_at` **is** the 60-second wait and a new mail kills the old link with no extra code.
- Tokens are 256 bits from a CSPRNG, base64url, stored as SHA-256. SHA-256 is right here, unlike for passwords, because the input is already random: there is nothing to guess.
- Timestamps are `timestamptz`, ids are `Guid.NewGuid()`, matching the v4 uuids of the front end. Time comes from an injected `TimeProvider`, so tests can move the clock.
- Emails are normalized (`Trim().ToLowerInvariant()`) on the way in and stored that way, so a plain unique index does the job with no `citext`.
- **Clean-up with no background job.** A job would wake Neon on a schedule and spend CU-hours. Expired `sessions` of a user are deleted when that user signs in; expired `email_tokens` are replaced on the next send; expired `google_handoffs` are deleted when the next hand-off starts.

### 3. Email and password

Endpoints in decision 10. The rules are in the `accounts` spec; what the design adds:

- **bcrypt** at BCrypt.Net-Next's default cost (11), as in Cal. On Render's 0.1 CPU a hash may take about 2 s, so the plane's quiet 1.5 s may end during a sign-in; that is honest and fine. Passwords over 72 bytes are refused, because bcrypt silently ignores what comes after.
- **Timing.** A sign-in with an unknown email verifies against a fixed dummy hash, because at 0.1 CPU the gap between "no such user" and "checked the hash" would be seconds and would reveal who has an account.
- **The existing-account mail** reuses a `reset` token, so its 60-second wait and its link need no new table. It changes nothing until the owner uses it.
- **Mail links carry the token in the fragment**: `https://mtf.zynis.com.ar/#verify=<token>`, `#reset=<token>`. A fragment never reaches Vercel's logs, and the page never loads a third-party resource that could leak it in a `Referer`. `readAccountLink()` runs in `main.tsx` before React mounts (like `placeWelcomeOnce`), stores the link in `accountStore` and calls `history.replaceState` to clear it. The service worker's `NavigationRoute` already serves `index.html` for any path, so no router is needed.
- **A link only ever acts from a running page**, with a `POST`. A mail scanner that fetches the address changes nothing. Verify posts as the page opens; reset waits for the form.
- **Verifying does not sign in**, because the link may be running in Safari while the user's notes live in the installed app ([Context](#context)). A session in the wrong storage would look like a sign-in that did not take.

### 4. Sessions: refresh token in localStorage, access token in memory

The full reasoning is [ADR 0010](../../../docs/adr/0010-account-sessions.md).

- **Access token**: JWT (HS256), 15 minutes, `sub` + `email`, issuer and audience `mtf`, `MapInboundClaims = false`. Kept in `accountStore` memory.
- **Refresh token**: opaque, one row in `sessions` per signed-in device. Kept in `localStorage` as `mtf_session` = `{ refreshToken, email }`, through `src/lib/storage.ts` (`loadSession`, `saveSession`, `clearSession`). A device setting, never in `mtf_data` or the Backup.
- **Why not an HttpOnly cookie**, the usual advice: `api.mtf.zynis.com.ar` is a subdomain behind another CNAME and another IP than the page, which is the case Safari's tracking prevention caps at 7 days, even for server-set cookies. A session that dies after a quiet week on the iPhone breaks the ticket's promise. localStorage is also where the notes already live, with the same lifetime and the same protection from installing. The cost is exposure to XSS, answered by decision 13's CSP, no third-party scripts, React's escaping, rotation and revocation.
- **Rotation with a grace window.** `POST /refresh`: the token matches `token_hash` → rotate (`previous_token_hash` = old, new hash, `rotated_at`, `expires_at` = now + 180 d). It matches `previous_token_hash` within 2 minutes → rotate again, for a lost answer or a renewal racing it. It matches outside 2 minutes → delete the session, since someone holds a copy. Unknown → 401.
- **Only a 401 from `/refresh` ends a session.** Network failures, timeouts, 429 and 5xx keep it. The client never looks at `expires_at` or at a clock.
- **What actually renews in this ticket**: opening the Account sheet with a session calls `GET /me` (refreshing first if there is no live access token). Nothing runs at launch. #37 will renew as it syncs, so 180 days is not a limit anyone reaches by using the app.
- **Tabs**: the refresh token is read from storage at each use, never cached, and renewals run **one at a time across tabs** under a Web Lock (`navigator.locks`, `mtf_session_renewal`), each reading the token the last one saved. Two renewals racing with the same token would both succeed (the grace window) but leave two live tokens: one current, one just retired. If the device kept the retired one, its next use, minutes later, would end the session. Found by CI on the server test; a browser without Web Locks renews unlocked, as before. Another tab's sign-out shows up when its Account sheet next opens; live tab-to-tab updates are not worth a listener while nothing depends on the session.

### 5. Google: a window of its own and a hand-off, the same on every platform

The full reasoning is [ADR 0011](../../../docs/adr/0011-google-sign-in-handoff.md). This resolves the ticket's "button or redirect".

```
  MTF (Account sheet)                 API                              Google
  1. secret = random 256 bits
     hash = SHA-256(secret)
  2. window.open(api/google/login?handoff=hash&lang=es)   ---------->  row in google_handoffs
                                        302 ------------------------>  consent screen
  3. POST google/exchange { secret }
     every 3 s + on returning           <--- 202 pending
                                        callback?code&state=hash <---  user finishes
                                        code → ID token → validate
                                        link/create user, row.user_id
                                        small "go back to MTF" page
  4. POST google/exchange { secret }    ---> 200 tokens; row deleted
```

- **Why not Cal's redirect.** With a redirect, the session lands wherever the redirect ended. From an installed iPhone app, that is a browser context with other storage, so the app never gets it. Here the tokens go only to whoever holds the secret, wherever Google ran.
- **Why not the Google Identity Services button.** It loads a third-party script, which `pwa-offline` forbids; its popup is known to hang in installed iOS apps; and its button is Google's own iframe, not Paper.
- **Google's side** is the code flow on the back, so the client secret and the ID-token check live on the server: `scope=openid email` (no `profile`, since MTF stores no name), `prompt=select_account`, `state` = the hash. `GoogleJsonWebSignature.ValidateAsync` checks the audience; `email_verified` must be true. An `IGoogleClient` seam lets tests skip the real exchange.
- **Lookup and linking** (`accounts` spec): by `google_id`, else by email, else create. Linking to an unverified account clears its `password_hash`, which closes the pre-hijack attack: register the victim's address with a known password, wait for them to arrive by Google, then sign in with that password.
- **Login CSRF goes away**: the browser running the callback receives nothing, so nobody can be silently signed in to someone else's account. No state cookie is needed.
- **The window** opens synchronously in the click, because iOS and popup blockers require a user gesture; `/health` has been waking the API since the sheet opened. If it is still asleep, Render's own loading page shows in that window; the sheet's wait is about Google, so it does not show the plane's server messages: it shows "Seguí en la ventana de Google" and a Cancel button. A failure at Google marks the row `failed`, and exchange answers `410` with a code.
- **Polling** stops at 5 minutes, on Cancel, on any final answer, and when the sheet closes. `visibilitychange` polls at once when the user comes back.
- **The known cost**: whoever holds a hand-off link could send it to someone, and if that person finishes the Google screen within 5 minutes, the sender gets the session. It takes a victim who follows a stranger's link and picks their account on a screen naming MTF. Accepted while MTF is built for its author; ADR 0011 records it and what to add before opening MTF to other people.

### 6. Mail: Resend, with a seam

`IEmailSender` with `ResendEmailSender` and `LogEmailSender` (development, logs the link). Tests capture mails with a fake and take the token from the link. Mails are short HTML in Spanish and English, with no name and no accent color, sent in-band; a send failure is logged and the user can ask again, as in Cal. Render blocks SMTP, so HTTPS is the only way (ADR 0009). The API key is a new one, for MTF only, on the Resend account where `zynis.com.ar` is verified: revoking it never touches Cal. The account's free limits, shared with Cal, are 3 000 a month and 100 a day. The 60-second waits and the rate limits are what protect them.

### 7. Rate limiting

ASP.NET's built-in limiter, partitioned by client IP, overridable by configuration so tests can lower it:

| Policy | Default | Applies to |
|---|---|---|
| global | 60 / min | everything except `/health` |
| `auth` | 10 / min | register, verify, resend, login, forgot, reset, `google/login`, `google/callback` |
| `session` | 30 / min | `refresh`, `google/exchange` (a poll every 3 s is 20 / min), `logout` |

Cal uses 5 / min on auth and its hosting notes warn that this will refuse real users behind Argentine mobile CGNAT, which is why this is 10. `UseForwardedHeaders` runs first, trusting `X-Forwarded-For` as in Cal; only Render's proxy can reach the container. A rejection answers 429 with `Retry-After` and code `too_many_requests`. The request body limit is Kestrel's `MaxRequestBodySize`, 64 KB until #37 needs more.

### 8. The Account sheet

`src/account/`, following `src/backup/` and `src/install/`:

| File | What |
|---|---|
| `accountStore.ts` | Zustand: `email`, `accessToken` (memory), `sheetOpen`, `link`, `sessionEnded`; `signedIn(tokens)`, `signOut()`, `openAccount()` |
| `api.ts` | `fetch` wrapper: base URL, the wait's time limit (decision 9), JSON, maps answers to `{ ok, data } \| { ok: false, code }`, with `offline`, `timeout` and `network` codes of its own; `wakeApi()`; `withSession()` refreshes once on a 401 |
| `links.ts` | `readAccountLink()` (decision 3) |
| `google.ts` | Secret + hash (`crypto.subtle`), `window.open`, the polling loop as a pure step function plus a hook |
| `AccountSection.tsx` | The row in Settings. No request |
| `AccountSheet.tsx` | The sheet and its steps: `signIn`, `register`, `checkMail`, `forgot`, `forgotSent`, `reset`, `verifying`, `verified`, `linkExpired`, `google`, `signedIn` |

- **The base URL** is a constant: `VITE_API_URL ?? (DEV ? 'http://localhost:5000' : 'https://api.mtf.zynis.com.ar')`. No `.env` file is committed, since `.gitignore` excludes `.env.*`. `VITE_API_URL` exists for a local override only.
- **A separate sheet, not a block inside Settings**, so opening Settings makes no request and spends no Render hours, and "two sheets are never open at once" keeps holding. The `App.tsx` wiring copies the Area editor's: Settings closes first.
- **Forms** are real `<form>`s with `type="email"` and `autocomplete` set, one password field with a show/hide toggle instead of a confirmation field. The `Sheet`, `Button` and `Callout` kit is reused; a small `TextField` joins `src/components/ui/`. Errors use the inline `role="alert"` line from `BackupSection`, because a toast vanishes before it is read.
- **Approved by mockup first**, like the paper plane: `design/mtf-mockup-cuenta.html`, a tasks gate before any Account UI.
- **Glossary**: Account and Session join `GLOSSARY.md` with this proposal.

### 9. Waking the server

Opening the sheet with no session and `navigator.onLine` calls `wakeApi()` with no UI: `GET /health`, retried every 5 s until it answers or the wait's limit passes. A 503 with no CORS header while Render spins up looks like a network failure to `fetch`, so a failure means "not yet".

**A request waits for the wake, then is sent once.** Submitting first awaits `wakeApi()` (instantly when `/health` answered in the last 10 minutes), and only then sends the `POST`. Retrying the `POST` itself would be simpler to write and wrong: a single-use reset token that succeeded with its answer lost would come back as "this link no longer works". A failure of the `POST` itself is reported, not retried.

The plane starts on submit, not on opening. A plane flying over a form the user is still typing in would say "wait" when there is nothing to wait for, and its clock would be wrong for the 90-second promise, which is about one request. So `{pending && <PlaneWait />}` replaces the form while a request is open, with the typed values kept in state; since the sheet's wake has been running, most requests return fast.

At 90 s the whole attempt, wake included, aborts with `timeout`, `PlaneWait` unmounts, and the form returns with `waitFailed` as its alert. `wait.ts` gains `WAIT_LIMIT`, read from the `failed` row of `WAIT_STEPS`, as the request's limit, so the plane and the request cannot drift apart. Closing the sheet aborts the request; a sign-in that already succeeded on the server only leaves an unused session row, which expires.

### 10. API surface

All under `/api/auth`, JSON, `camelCase`. Errors are `ProblemDetails` with a `code` extension.

| Method and path | Body | Answers |
|---|---|---|
| `POST register` | `email, password, language` | 204; 400 `invalid_email`, `invalid_password` |
| `POST verify-email` | `token` | 204; 400 `invalid_token` |
| `POST resend-verification` | `email, language` | 204 always |
| `POST login` | `email, password` | 200 tokens; 401 `invalid_credentials`; 403 `email_not_verified` |
| `POST forgot-password` | `email, language` | 204 always |
| `POST reset-password` | `token, newPassword` | 204; 400 `invalid_token`, `invalid_password` |
| `GET google/login` | `?handoff=<hash>&lang=` | 302 to Google |
| `GET google/callback` | `?code&state&error` | HTML page |
| `POST google/exchange` | `secret` | 200 tokens; 202 pending; 410 `google_failed` |
| `POST refresh` | `refreshToken` | 200 tokens; 401 `session_ended` |
| `POST logout` | `refreshToken` | 204 always |
| `GET me` | Bearer | 200 `{ email, hasPassword, hasGoogle }`; 401 |

Tokens answer: `{ accessToken, accessTokenExpiresAt, refreshToken, email }`. `GET /health` is outside `/api`.

### 11. CI: a second job, each side tested only when it changed

`.github/workflows/ci-backend.yml`, job **`check-api`**, on every push and pull request to `main`: setup .NET 10, restore, build, pre-pull `postgres:17-alpine` with retries, `dotnet test` with `TESTCONTAINERS_RYUK_DISABLED=true` (both from Cal), then a smoke test of the image: `docker build`, run it on a custom `PORT` against a `postgres:17` container, `curl /health`, check `__EFMigrationsHistory` has rows, stop the database, `curl /health` again.

- **A new job, not inside `check`**, so a front-end failure and a back-end failure read apart and run in parallel, and `check` stays as the KB describes it.
- **Each job runs only when its side changed, like Cal, but not with `paths:`.** A required check whose workflow is skipped by `paths:` never reports, and the PR stays blocked forever. Instead both workflows always start; a `changes` job diffs the PR's merge commit against `main`, and `check` / `check-api` carry an `if:`. A job skipped by its `if:` reports as passed. `check-api` runs for `api/` and its workflow; `check` runs for anything outside `api/` and the docs folders; a docs-only PR runs neither; a push to `main` runs both. The `if:` skips only on an explicit `false`, so a broken `changes` job runs the tests instead of passing them. Decided during apply, at the user's request: running the whole suite on every PR was too slow (KB/frontend/testing.md#ci).
- **The ruleset is changed by hand** by the user to add `check-api`, once it has reported for the first time on this PR.

### 12. Infrastructure, and checking it before the merge

The services are created by the user, in the order of tasks group 10, following Zynis Cal's guide (`KB/developers/hosting/guia-neon-render.html`).

The workflow archives before the PR, with the phone checks done, but `main` deploys only after the merge. So **until the merge, Render deploys the ticket branch**, with the branch's stable Vercel preview address in `App__FrontendUrl` and as a second allowed origin. After the merge, Render moves to `main` and the preview origin is removed. That leaves the final state the ticket asks for, with the checks done on real phones. Env vars change; no code does.

`.vercelignore` lists `api/`, because Vercel treats a root `api/` folder as serverless functions; without it, a stray `.js` or `.ts` file there would deploy. ESLint ignores `api/` too.

### 13. A Content Security Policy for MTF

A `headers` entry in `vercel.json`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
font-src 'self'; connect-src 'self' https://api.mtf.zynis.com.ar; worker-src 'self';
manifest-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
```

It is the counterweight to decision 4: an injected script could not run, or send a token anywhere else. `index.html` has no inline script, and `registerSW.js` is a file. Playwright runs on `vite preview`, which does not apply `vercel.json`, so the policy is checked by hand on the preview deployment (tasks group 11).

### 14. What is deliberately not copied from Zynis Cal

| Cal | MTF | Why |
|---|---|---|
| Token in the redirect's query string | Hand-off by secret | Addresses end up in history and logs |
| No `state` in the Google flow | `state` = hand-off hash | Login CSRF |
| Links an unverified account and keeps its password | Removes the password | Pre-hijacking |
| Does not check `email_verified` | Must be true | Linking on an unproven address |
| Reset and verify tokens readable, verify never expires | SHA-256, 24 h and 1 h | A database copy must not sign anyone in |
| Register answers differently for an existing email | Same answer always | Account discovery |
| `AllowAnyOrigin` | One origin in production | The ticket; less to abuse |
| 24-hour JWT in localStorage, no refresh | 15-minute JWT + rotating refresh | The ticket; revocable |
| `DATABASE_URL` fallback | One setting only | ADR 0009, rule 2 |
| Postgres 16 in CI | 17 everywhere | ADR 0009, rule 5 |
| `scope=openid email profile`, `access_type=offline` | `openid email` | No name or photo; no Google refresh token needed |

### 15. Libraries

MTF's stack rule asks to justify each addition ([stack.md](../../../KB/frontend/stack.md#rules)). **The front end adds none.** The backend starts here, with the set Cal already runs, minus OpenAPI and Scalar (the API has one client):

| Package | Why, and why not less |
|---|---|
| `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design` | Migrations at start-up (rule 3) need them |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | The framework's own token check |
| `BCrypt.Net-Next` | The ticket names bcrypt; .NET has none built in |
| `Google.Apis.Auth` | Validating an ID token (keys, signature, audience) must not be hand-written |
| `Resend` | Already used by Cal; a thin client over HTTPS |
| `xunit`, `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers.PostgreSql` | The ticket's "Postgres in a container"; Cal's setup |
| `Microsoft.Extensions.TimeProvider.Testing` | Moving the clock for 60 s, 1 h, 24 h, 180 d. Dev only |

## Risks / Trade-offs

- **A refresh token in localStorage is readable by any script on the page** → no third-party scripts, a strict CSP, React's escaping, rotation with reuse detection, and revocation on password reset. ADR 0010.
- **Hand-off phishing** (decision 5) → 5-minute life, one use, a screen naming MTF. ADR 0011 says what to add before MTF opens to other people.
- **Not verified on a real iPhone yet**: that `window.open` from an installed app reaches Google, that returning fires `visibilitychange`, and that Google accepts that window. The research behind decisions 4 and 5 is mostly from developer reports and secondary sources, not Apple's documentation → the manual checks in group 11 come before the archive. The design relies on the secret, not on which context Google runs in, and if the window itself fails, email and password still work on the iPhone.
- **Render's loading page may show in the Google window** when the API is asleep. Render documents the page for browsers, not whether it continues on its own → checked in group 11. The wake from opening the sheet makes it rare.
- **`/health` while spinning up** may answer 503 with no CORS header, which `fetch` reports as a network failure → `wakeApi()` treats any failure as "not yet" and retries within the limit (decision 9).
- **`X-Forwarded-For` behind Render's proxies** may not give the real client in the rightmost position, which would put everyone in one bucket → for one user this changes nothing; checked once on Render in group 10, and noted in the KB before MTF opens up.
- **bcrypt at 0.1 CPU** could be slow under an attack → the `auth` limit caps it per IP; the plane covers the normal wait.
- **Render's 750 hours are shared with Cal** → only opening the Account sheet wakes the API; nothing does at launch.
- **Migrations at start-up and Neon's limits**: if Neon's compute is suspended, the API does not boot → Account shows the calm wait message and the Desk is untouched (ADR 0009's accepted consequence).
- **Secrets**: the repo is public → all secrets are Render env vars; `appsettings.json` holds none; local ones go in `dotnet user-secrets`.

## Migration Plan

Nothing migrates: no schema bump, no change to `mtf_data` or the Backup. The first deploy creates an empty database. Rollback is reverting the PR on Vercel: MTF goes back to making no requests, an unused `mtf_session` stays harmless in storage, and the Desk is untouched.
