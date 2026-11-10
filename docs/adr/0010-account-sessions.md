# A session keeps its refresh token in localStorage and its access token in memory

A signed-in device holds two tokens: a **JWT access token** (15 minutes, in memory only) and an **opaque refresh token** (one row per device on the server, stored there as a hash), which lives in **localStorage** next to the notes (`mtf_session`, behind `src/lib/storage.ts`). Each renewal rotates the refresh token, and the old one is accepted for 2 more minutes. After that, its use means someone holds a copy, and that session ends. A session lasts 180 days from its last renewal, and only the server checks this.

**Only the server ends a session.** The app never compares a date, and a network failure, a timeout, a 429 or a 5xx keeps the session. Only a `401` from the renewal ends it, and even then the Desk is untouched: Account quietly invites the user to sign in again. This is how "the session does not expire offline and never blocks the Desk" holds (#36).

## Why not an HttpOnly cookie

It is the usual advice, because a script cannot read such a cookie. It does not fit MTF:

- **Safari caps it.** The page is at `mtf.zynis.com.ar` (CNAME to Vercel) and the API at `api.mtf.zynis.com.ar` (CNAME to Render). Since Safari 14 (CNAME) and 16.4 (IP), its tracking prevention caps at 7 days the expiry of any cookie set in a response from a first-party subdomain that resolves somewhere else. So on an iPhone the session would die after a quiet week, which is the failure this design exists to prevent. Serving the API from a path on the same host would avoid the cap, but needs Vercel to proxy every request to Render, adding a dependency between the two and breaking [ADR 0009](0009-v2-backend-hosting.md)'s own-address rule. This rests on WebKit's documentation as quoted by secondary sources, and was not tested on a device.
- **Storage already belongs to the notes.** localStorage is where a user's notes live, with the same origin, lifetime and eviction rules ([ADR 0002](0002-local-first-storage.md)). A session stored with them can never outlive them or die sooner, and an installed iPhone app has its own copy of both.
- **No cookie means no CSRF to defend**, and no `credentials` in CORS.

## Considered Options

- **HttpOnly cookie on the API's host**: rejected, for the Safari cap above.
- **One long-lived JWT with no refresh (Zynis Cal's way)**: rejected. It cannot be revoked, so a stolen one is good until it expires, and a password reset could not end it.
- **Refresh token in IndexedDB**: rejected. It is just as readable by a script, with a heavier API.
- **A refresh token that never rotates**: rejected. Theft would go unnoticed, and the rotation costs one column and one comparison.
- **Rotation with no grace window**: rejected. A phone that loses signal between the server's answer and its arrival would be signed out; so would two tabs renewing together.

## Consequences

- A script running on the page could read the refresh token. MTF answers with no third-party scripts, a strict Content Security Policy in `vercel.json` (`script-src 'self'`, `connect-src` limited to its own API), React's escaping, rotation with reuse detection, and ending every session on a password reset. The CSP is part of this decision: removing it reopens the question.
- Nothing wakes the server just to renew. In #36 a renewal happens when the Account sheet opens; #37 will renew as it syncs. A session unused for 180 days ends the next time it is tried, and the Desk does not care.
- A token copied within its 2-minute grace window is not detected. The window only exists right after a rotation, and the copy would still die on the next renewal by the real device.
- The session is a device setting, never in `mtf_data` or a Backup, so a Backup file can be shared without giving away an account.
