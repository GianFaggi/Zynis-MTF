# Proposal

## Why

MTF opens today at `https://zynis-mtf.vercel.app`, a name Vercel derived from the project, while Zynis Cal already lives at `cal.zynis.com.ar`. Issue #28 gives MTF its own Zynis address, `https://mtf.zynis.com.ar`. The address is more than a label for MTF: the browser keeps each address's notes apart (localStorage, the installed app and its offline copy all belong to one origin), so every move strands the notes on the old address. That makes the right moment to move **now**, while the author is the only user, and to move once, to an address the owner controls whatever hosting comes later.

## What Changes

- **New address**: `mtf.zynis.com.ar` is added to the Vercel project as a production domain, with a `CNAME mtf` record in the Don Web DNS for `zynis.com.ar`, like `cal`. Vercel issues the HTTPS certificate. Both addresses serve the same deployment while the notes move.
- **Moving the notes, one device at a time**: on every device that has notes, Export a Backup from the old address (from the installed app when MTF is installed, since on iPhone it has storage of its own), install MTF from the new address, and Import the Backup there. Device settings (language, theme, saved arrangement, Area Jars) are not in a Backup and are chosen again on the new address. This happens **before** the redirect, as the issue requires.
- **Permanent redirect**: a new `vercel.json` redirects every path of `zynis-mtf.vercel.app` to the same path on `https://mtf.zynis.com.ar` (308). It goes live when the PR is merged and deployed, so the PR is merged only after every device has moved. Preview deployments are not redirected.
- **Docs**: the KBs, the README, CLAUDE.md and the OpenSpec context name the new address; an ADR records why the address is chosen once.

### Acceptance criteria → scope

| Issue #28 criterion | Covered by |
|---|---|
| `mtf.zynis.com.ar` opens MTF over HTTPS (domain in Vercel + CNAME in the DNS) | `pwa-offline`: "Own address"; Vercel + Don Web steps; manual check |
| The old vercel.app address redirects to the new one | `pwa-offline`: "Own address" (old address scenario); `vercel.json`; checked after the merge |
| The app installs from the new domain and opens with no signal | existing `pwa-offline` requirements, now checked by hand on real phones at the new address |
| Cards move from the old domain to the new one with Export → Import, on each device, **before** the redirect | the per-device move, done before the PR is merged |
| The KBs mention the new domain | `KB/frontend/stack.md`, `pwa.md`, `storage.md`, `KB/roadmap.md`, ADR 0008 |

### Out of scope

- Moving the notes automatically. MTF has no server, so it cannot carry localStorage from one origin to another; the Backup is the bridge (V2 sync makes the address irrelevant to the data).
- A "MTF moved" notice inside the old app. Apps installed from the old address keep running their cached copy and never receive new code after the redirect, so the notice would need its own release first. With one user who moves every device by hand, it buys nothing.
- The brand root `zynis.com.ar` and any other Zynis subdomain.
- A V2 API address (for example `api.mtf.zynis.com.ar`); that comes with the backend.

## Capabilities

### New Capabilities

None. Where MTF is served belongs to `pwa-offline`, the capability that defines installing and opening MTF.

### Modified Capabilities

- `pwa-offline`: adds "Own address": MTF is served over HTTPS at `https://mtf.zynis.com.ar`, and the old production address permanently redirects there, keeping the path.

## Impact

- **Code**: none in `src/`. The manifest's `start_url` and `scope` are relative (`/`) and no code names a host, so the build is the same on both addresses.
- **Config**: new `vercel.json` with one host-conditioned redirect. Outside the repo: a production domain in the Vercel project and a `CNAME` record at Don Web.
- **Data**: no schema change. Notes on the old address stay there until that site's data is cleared; they reach the new address only through a Backup.
- **Installed apps**: an app installed from the old address keeps opening its cached copy (offline too) after the redirect, but no longer updates. Once its notes are imported on the new address, it is uninstalled.
- **Tests**: unchanged; `npm test`, lint and the build stay green. The address itself is checked by hand.
- **Docs**: `KB/frontend/stack.md`, `KB/frontend/pwa.md`, `KB/frontend/storage.md`, `KB/roadmap.md`, `README.md`, `CLAUDE.md`, `openspec/config.yaml`, new `docs/adr/0008-own-address.md`, and a new `aprendizaje/` note on domains and DNS.
- **Dependencies**: none.
