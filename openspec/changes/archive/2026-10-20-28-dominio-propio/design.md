# Design

## Context

- MTF's production alias is `zynis-mtf.vercel.app` (200, public). The other aliases (`zynis-mtf-gianfaggis-projects.vercel.app`, per-deployment URLs) sit behind Vercel's login, so nobody keeps notes there. `mtf.zynis.com.ar` does not resolve yet.
- `zynis.com.ar` is registered at Don Web, which also hosts its DNS. Zynis Cal set up `cal.zynis.com.ar` with a `CNAME cal` pointing at the project-specific target Vercel showed (`…vercel-dns-017.com`) (Zynis Cal ticket #138).
- The repo has no `vercel.json`: Vercel detects Vite and serves `dist/` with its defaults (`sw.js` with `max-age=0, must-revalidate`).
- No code names a host. The manifest has `start_url` and `scope` `/` and no `id`, so it means the same thing on any origin.
- The service worker serves **every page load from its precache** (`NavigationRoute` → `index.html`, vite-plugin-pwa's default navigate fallback). A browser where MTF already runs never asks the server for the page; it asks only for `sw.js`, to look for updates.
- localStorage, the service worker and an installed app all belong to one **origin** (scheme + host). `https://mtf.zynis.com.ar` is a new origin: empty storage, its own install, its own Welcome Card on its first launch.

## Goals / Non-Goals

**Goals:**
- Serve the current deployment at both addresses while the notes move, then make the new one the only public address.
- Lose nothing: every device's notes reach the new address through a Backup before the old address stops answering.
- Keep the redirect in the repo, reviewed and merged like any change.

**Non-Goals:**
- Moving the notes automatically.
- Changing what `dist/` contains; the build stays the same for both addresses.
- Redirecting preview deployments.

## Decisions

### 1. The redirect lives in `vercel.json`, conditioned on the old host

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "zynis-mtf.vercel.app" }],
      "destination": "https://mtf.zynis.com.ar/:path*",
      "permanent": true
    }
  ]
}
```

- `has` → `host` limits it to the old production alias, so preview deployments and the new domain are untouched. Without it, every host would redirect to itself or previews would jump to production.
- `/:path*` keeps the path, so `/manifest.webmanifest` or `/sw.js` land on the same file.
- `permanent: true` answers **308**: browsers and search engines learn that the address moved for good, and the method is kept.
- Only `redirects` is set; Vite detection, the output directory and the default headers stay as they are.

Alternatives:
- **Redirect from Vercel's Domains page**: it is built for sending one custom domain to another, and a host-conditioned rule works for any host, the `.vercel.app` alias included. A dashboard setting is also invisible in the repo: nobody reading the code would know the old address redirects, and it would go live the moment it is saved instead of with the merge.
- **Removing the old alias**: a visitor would get an error page instead of MTF, and Vercel always gives a production deployment its `.vercel.app` alias anyway.

### 2. The order is domain → move every device → merge

The redirect goes live when the PR is merged and production is deployed. So the PR is merged **after** every device has moved its notes, and the steps that need no code (domain, DNS, moving) happen first, while both addresses serve the same deployment:

1. Add `mtf.zynis.com.ar` to the project as a **Production** domain (no redirect on it). Vercel shows the `CNAME` target.
2. At Don Web, add `CNAME mtf` → that target. Wait until Vercel reports the domain valid and the certificate issued.
3. On every device with notes, move them (Decision 3).
4. Merge the PR: the redirect goes live.

### 3. Moving one device: Export from the copy in use, Import into the installed app on the new address

- **Export from the copy that holds the notes.** On iPhone, an installed MTF has storage separate from Safari's ([pwa.md](../../../KB/frontend/pwa.md#ios-specifics)): export from the installed app if it is the one in use. If both copies have notes, only one can come along, because Import replaces and never merges.
- **Install first, then Import inside the installed app.** On iPhone, importing in the Safari tab would leave the installed app empty, for the same reason. On Android and PC the tab and the installed app share storage, but the order is the same everywhere.
- **Check before trusting**: the Import summary (Cards on the Desk, in the Jar, things done) must match the old copy.
- **Choose the device settings again**: language, theme, Mi disposición and Frasco por área are not in a Backup ([ADR 0006](../../../docs/adr/0006-backup-file-format.md)).
- The new address's first launch places a Welcome Card; the Import replaces it, and `mtf_welcome_placed` is already set, so it does not come back. Expected.

### 4. Old installed apps are left to freeze, then uninstalled by hand

After the redirect, an app installed from the old address keeps opening, offline too: its page comes from its own precache (Context). Its update check for `sw.js` now gets a redirect, which a service worker update refuses, so the app stays on the version it has, with its notes. That makes it a safety copy until the redirect is checked, and then it is uninstalled. No notice is added to it (proposal, Out of scope).

### 5. The manifest stays as it is

The relative `start_url` / `scope` already work on the new origin. Adding a manifest `id` would not link the two installs: an app's identity includes its origin, so the new address is a new app whatever the `id`.

### 6. ADR 0008: the address is chosen once

Moving to another origin strands every device's notes until each one is moved by hand, and a 308 is cached by browsers, so going back is hard too. An ADR records that MTF lives at `mtf.zynis.com.ar` from now on, and that a future hosting move changes only the DNS record, never the address.

## Risks / Trade-offs

- [A device is forgotten before the merge] → List the devices with notes first (task 2.1). If one shows up later, its installed app (or a browser tab controlled by the service worker) still opens the old copy offline, so its notes can still be exported; a hard reload or cleared site data would lose that path.
- [A typo in the host value: the redirect silently never matches] → After the merge, `curl -I https://zynis-mtf.vercel.app/` must answer 308 with `location: https://mtf.zynis.com.ar/`.
- [308 is cached by browsers, so a mistake is hard to undo] → The rule is reviewed in the PR and only targets the old host; the new domain is checked live before the merge.
- [DNS or the certificate takes a while] → Nothing waits on it except the device moves; Vercel's Domains page says when the domain is valid.
- [Search engines or shared links point at the old address] → The 308 carries them over, path included.

## Migration Plan

- **Before the merge**: Decisions 2 and 3, tracked in tasks 1–2.
- **After the merge** (checked at `/close-ticket`, since the archive goes into the same PR):
  - `curl -I https://zynis-mtf.vercel.app/` → `308`, `location: https://mtf.zynis.com.ar/`
  - `curl -I https://zynis-mtf.vercel.app/manifest.webmanifest` → `location: https://mtf.zynis.com.ar/manifest.webmanifest`
  - a preview deployment of a later PR opens without redirecting
  - the old installed apps still open (frozen); then uninstall them
- **Rollback**: a PR that removes the rule. Browsers that already cached the 308 keep redirecting until their cache expires, which is why the new domain stays attached to the project in any case.
