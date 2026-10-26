# Design

## Context

- `vercel.json` holds one redirect since change 28: `source` `/:path*`, conditioned on `has` → `host` `zynis-mtf.vercel.app`, `destination` `https://mtf.zynis.com.ar/:path*`, `permanent: true`.
- Checked live on 2026-10-26 with `curl -I`:

| Request on `zynis-mtf.vercel.app` | Answer |
|---|---|
| `/` | **200** (served by MTF) |
| `/?a=1` | **200** |
| `/index.html`, `/sw.js`, `/assets`, `/foo/bar` | 308 → same path on `mtf.zynis.com.ar` |
| `/foo?a=1&b=2` | 308 → `https://mtf.zynis.com.ar/foo?a=1&b=2` (Vercel keeps the query string) |

- So the rule works for every path with at least one segment, and Vercel does not match `/:path*` against the bare root. `/index.html` redirecting shows redirects run before the static files, so the root is a pattern gap, not a file served first.
- `https://mtf.zynis.com.ar/` answers 200. The other `.vercel.app` aliases redirect to Vercel's login.
- A redirect rule can only be observed on a real deployment. A preview runs on its own host, so a rule conditioned on `zynis-mtf.vercel.app` never fires there; the check happens on production, after the merge.

## Goals / Non-Goals

**Goals:**
- The root of the old address redirects, with its query string, like every other path.
- The rule that already works is not touched.

**Non-Goals:**
- Changing how Vercel serves the new address or the previews.
- Testing redirects locally (see Decision 2).

## Decisions

### 1. A second rule with `"source": "/"`, before the existing one

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/",
      "has": [{ "type": "host", "value": "zynis-mtf.vercel.app" }],
      "destination": "https://mtf.zynis.com.ar/",
      "permanent": true
    },
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "zynis-mtf.vercel.app" }],
      "destination": "https://mtf.zynis.com.ar/:path*",
      "permanent": true
    }
  ]
}
```

- The literal `/` can only mean the root, so it does not depend on how Vercel reads a wildcard.
- The same `has` → `host` condition as the other rule, so the new address and previews stay untouched; without it, `mtf.zynis.com.ar/` would redirect to itself.
- `destination` names the root with no query: Vercel appends the request's query string to a redirect on its own (observed in Context), so `/?from=link` lands on `/?from=link`.
- First in the list, because it is the specific case; the two sources never match the same request, so the order only helps reading.
- The existing rule stays byte for byte, since it already redirects everything else.

Alternatives:
- **Replace the rule with one `"source": "/(.*)"` → `"/$1"`**: one rule instead of two, but whether Vercel matches the root against it is the same unverified question that broke `/:path*`, and it would swap a rule that works on every other path for one that has never run. If it failed, the whole old address would stop redirecting, not just the root.
- **`"source": "/:path*"` with a second `has` or a `missing` condition**: does not address the root; the pattern is the problem, not the condition.
- **The redirect on Vercel's Domains page**: rejected in [ADR 0008](../../../docs/adr/0008-own-address.md); the rule stays in the repo, reviewed in the PR.

### 2. Checked after the merge, with `curl`

Previews cannot fire a rule bound to the old host (Context), and a local Vercel emulator (`vercel dev`) would be a new tool for one line of config, outside [stack.md](../../../KB/frontend/stack.md). The pre-merge checks are that `vercel.json` parses and `dist/` is unchanged; the redirect itself is checked with `curl -I` right after production deploys, before `/close-ticket`, as change 28 did.

### 3. ADR 0008 is amended, not replaced

The decision (the address is chosen once, the old alias redirects every path) does not change; only its implementation note does. ADR 0008's "host-conditioned rule" becomes "host-conditioned rules", with a line saying the root needs its own.

## Risks / Trade-offs

- [The `/` rule still answers 200 after the merge] → Unlikely, since a literal source is the simplest match Vercel supports; if it happens, the old paths keep redirecting as today and a follow-up ticket tries `/(.*)` on its own.
- [A 308 on the root is cached by browsers] → It sends them where change 28 already sends every other path, and the new domain stays attached to the project whatever happens to the rule.
- [Someone wrote notes on the old root since change 28] → After the redirect, a browser tab no longer reaches them from the root. Only the author used MTF and every device moved before change 28's merge; if notes turn up, they can still be reached until site data is cleared, but no export path is added for it (proposal, Out of scope).

## Migration Plan

- **Before the merge**: the `vercel.json` change, the docs, lint, tests and the build (tasks).
- **After the merge** (checked before `/close-ticket`, since the archive goes into the same PR):
  - `curl -I https://zynis-mtf.vercel.app/` → `308`, `location: https://mtf.zynis.com.ar/`
  - `curl -I "https://zynis-mtf.vercel.app/?from=link"` → `location: https://mtf.zynis.com.ar/?from=link`
  - `/sw.js`, `/manifest.webmanifest` and `/index.html` still answer 308 to the same path
  - `curl -I https://mtf.zynis.com.ar/` → `200`
- **Rollback**: a PR that removes the `/` rule; browsers that cached the 308 keep going to the new address, which is where they should be anyway.
