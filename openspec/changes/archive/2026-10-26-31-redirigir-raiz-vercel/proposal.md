# Proposal

## Why

Change 28 redirected the old production address, `https://zynis-mtf.vercel.app`, to `https://mtf.zynis.com.ar`, but the after-merge check found a gap: every path redirects (308) except the root `/`, which still answers 200 and serves MTF. The root is exactly what people open, so a browser that types the old address still gets a working MTF on the old origin, which the `pwa-offline` spec already says must not happen ("Old address" scenario). On that copy, `sw.js` and the manifest redirect, so it never works offline or installs, and any note written there stays on an origin cut off from the new address. The fix is carried over from #28's closing notes.

## What Changes

- **The root redirects too**: `vercel.json` gets a rule for the root `/` of `zynis-mtf.vercel.app`, so it answers 308 to `https://mtf.zynis.com.ar/`, query string kept. The existing rule for every other path stays as it is.
- **Nothing else moves**: the new address and preview deployments keep answering 200; no code in `src/` changes.
- **Docs**: the KBs, ADR 0008 and the `aprendizaje/` note on domains say the redirect is two rules and why the root needs its own.

### Acceptance criteria → scope

| Issue #31 criterion | Covered by |
|---|---|
| `https://zynis-mtf.vercel.app/` answers 308 → `https://mtf.zynis.com.ar/` (also with a query string) | `pwa-offline`: "The old address redirects" (root scenarios); the new rule in `vercel.json`; checked after the merge |
| The paths that already redirected still do (`/sw.js`, `/manifest.webmanifest`, `/index.html`) | `pwa-offline`: "Path kept" scenario; the existing rule untouched; checked after the merge |
| `https://mtf.zynis.com.ar/` and preview deployments keep answering 200, with no redirect | `pwa-offline`: "New address" and "Preview deployment" scenarios; both rules conditioned on the old host |
| The KBs and ADR 0008 describe the root rule | `KB/frontend/stack.md`, `KB/frontend/pwa.md`, `KB/roadmap.md`, `docs/adr/0008-own-address.md` |

### Out of scope

- Other `.vercel.app` aliases (`zynis-mtf-gianfaggis-projects.vercel.app`, per-deployment URLs): they sit behind Vercel's login, so nobody keeps notes there.
- Notes someone may have written on the old root since change 28 went live. The author moved every device before that merge; anything else would come along only through a Backup, as ADR 0008 says.
- Apps installed from the old address: they serve the root from their precache and never see any redirect (`KB/frontend/pwa.md`, Address).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pwa-offline`: "The old address redirects" gets scenarios that pin the root (with and without a query string) and the new address answering without a redirect. The requirement text already says every page redirects; the scenarios make the root a checked case, since that is where the implementation fell short.

## Impact

- **Config**: `vercel.json` grows from one redirect rule to two. It is read by Vercel, never shipped in `dist/`.
- **Code, data, tests**: no change. The rule can only be checked on Vercel's production deployment, by hand after the merge.
- **Users**: a browser opening the old root now lands on the new address, like every other old path. A browser that already cached a 308 for another path is unaffected.
- **Docs**: `KB/frontend/stack.md`, `KB/frontend/pwa.md`, `KB/roadmap.md`, `docs/adr/0008-own-address.md`, `aprendizaje/dominios-y-dns.md`.
- **Dependencies**: none.
