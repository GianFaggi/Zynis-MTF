# MTF lives at mtf.zynis.com.ar, chosen once

MTF is served at `https://mtf.zynis.com.ar`, a subdomain of the Zynis brand registered at Don Web, pointed at the Vercel project `zynis-mtf` by a `CNAME mtf` record, like `cal.zynis.com.ar` for Zynis Cal. The old production alias, `https://zynis-mtf.vercel.app`, permanently redirects (308) every path to the same path on the new address, through host-conditioned rules in `vercel.json` (#28); the root `/` has a rule of its own, added in #31, because Vercel does not match `/:path*` against it.

The address is where the notes live. localStorage, the service worker and an installed app all belong to one **origin** (scheme + host) ([ADR 0002](0002-local-first-storage.md)): a new address is a new app with empty storage, and MTF has no server to carry the notes across. So the address is chosen **once**:

- A future hosting move changes only the DNS record behind `mtf.zynis.com.ar`, never the address.
- Moving to another address costs a Backup per device: Export on the old address, install MTF on the new one, Import there ([ADR 0006](0006-backup-file-format.md)). Device settings (language, theme, Mi disposición, Frasco por área) are chosen again.
- The notes move **before** the redirect goes live, because after it a browser that never ran MTF on the old address can no longer reach the old copy.

We chose this because the move is cheapest now, while the author is the only user and moves every device by hand, and because an address the owner controls survives any hosting change. Vercel's own name for the project would tie the notes to Vercel.

## Considered Options

- **Stay on `zynis-mtf.vercel.app`**: rejected. It costs nothing today, but the notes would be tied to Vercel: leaving Vercel later would mean the same move with more users and more devices.
- **The apex `zynis.com.ar`**: rejected. The brand root belongs to Zynis as a whole (a future landing page for every product), and an apex domain needs an `A` record instead of a `CNAME`, so it follows the hosting's IP addresses.
- **The redirect set in Vercel's Domains page**: rejected. A dashboard setting is invisible in the repo and goes live the moment it is saved; the rule in `vercel.json` is reviewed in the PR and goes live with the merge, after every device has moved.
- **Removing the old alias instead of redirecting**: rejected. Visitors and old links would get an error instead of MTF, and Vercel always gives a production deployment its `.vercel.app` alias.

## Consequences

- Apps installed from the old address serve every page from their own precache, so they never see the redirect: they keep opening, offline too, but stop updating (a service worker update refuses a redirected `sw.js`). Once their notes are imported on the new address, they are uninstalled.
- A 308 is cached by browsers, so going back to the old address is hard; the new domain stays attached to the Vercel project whatever happens to the rule.
- The manifest stays origin-free (`start_url` and `scope` `/`, no `id`), so the same build serves any address. An `id` would not link two installs anyway: an app's identity includes its origin.
- Preview deployments keep their own addresses and are never redirected.
- V2 sync makes the address irrelevant to the data: notes live on the server, and a new origin only has to sign in.
