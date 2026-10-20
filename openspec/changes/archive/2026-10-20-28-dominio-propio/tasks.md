# Tasks

## 1. The new address (outside the repo)

- [x] 1.1 (User) In Vercel → project `zynis-mtf` → Settings → Domains, add `mtf.zynis.com.ar` connected to **Production**, with no redirect, and note the `CNAME` target Vercel shows; verify the domain is listed under the project
- [x] 1.2 (User) In Don Web → DNS of `zynis.com.ar`, add `CNAME mtf` → the target from 1.1, leaving the `cal` and `api.cal` records as they are; verify Vercel's Domains page reports the domain valid and the certificate issued
- [x] 1.3 Check the new address from the terminal: `curl -I https://mtf.zynis.com.ar/` answers 200 over HTTPS, the page title is "MTF By Zynis", `/sw.js` has `cache-control: public, max-age=0, must-revalidate` and `/manifest.webmanifest` is served, the same as on `zynis-mtf.vercel.app`; record the CNAME target and the result in `KB/developers/active.md`

## 2. Moving the notes, before the merge

- [ ] 2.1 (User) List every device and browser that holds real notes at `zynis-mtf.vercel.app` (and, on iPhone, whether the notes are in the installed app or in Safari); verify the list is written in `KB/developers/active.md`
- [ ] 2.2 (User) On each listed device, as in design decision 3: Export a Backup from the copy that holds the notes, install MTF from `https://mtf.zynis.com.ar`, open the installed app and Import the Backup there, then choose the language, theme, Mi disposición and Frasco por área again; verify the Import summary (export date, Cards on the Desk, in the Jar, things done) matches the old copy and the Desk looks the same after a reload. Keep the old app installed for now
- [ ] 2.3 (User) On a real Android phone and an iPhone, with MTF installed from the new address and opened once online, turn on airplane mode and open it; verify it opens with its notes and fonts
- [ ] 2.4 Tick the "Opens offline on a real phone" and "Installs on Android Chrome and iOS Safari" items of the Checklist in [KB/frontend/pwa.md](../../../KB/frontend/pwa.md) with the results of 2.3; verify they name the new address

## 3. The redirect

- [x] 3.1 Create `vercel.json` at the repo root with the single host-conditioned redirect of design decision 1 (`zynis-mtf.vercel.app`, `/:path*` → `https://mtf.zynis.com.ar/:path*`, `permanent: true`); verify it parses (`node -e "require('./vercel.json')"`) and the host value matches the alias checked in 1.3 character by character
- [x] 3.2 Run `command npm run build`; verify `dist/` has the same files as before (no `vercel.json` in it, `manifest.webmanifest` still has `start_url` and `scope` `/`)
- [ ] 3.3 (User) Push the branch so Vercel builds its preview; open the preview address and verify it opens MTF without redirecting

## 4. Docs

- [x] 4.1 Write [docs/adr/0008-own-address.md](../../../docs/adr/0008-own-address.md) in the style of ADR 0006 (design decision 6): MTF lives at `mtf.zynis.com.ar`; the origin is where the notes live, so it is chosen once, hosting moves change only the DNS record, and a move costs a Backup per device; options considered (stay on `vercel.app`, the apex `zynis.com.ar`, a dashboard redirect); verify it links ADR 0002 and ADR 0006
- [x] 4.2 Update the Deployment section of [KB/frontend/stack.md](../../../KB/frontend/stack.md): production at `https://mtf.zynis.com.ar` (Vercel project `zynis-mtf`, `CNAME mtf` at Don Web), the old alias redirecting through `vercel.json`, previews untouched; verify it links ADR 0008
- [x] 4.3 Add an "Address" section to [KB/frontend/pwa.md](../../../KB/frontend/pwa.md): the address, a new origin is a new app with empty storage, the service worker serves pages from its precache so apps installed from the old address never see the redirect and stop updating (design decision 4), and the manifest stays origin-free (decision 5); verify it matches `vite.config.ts` and `vercel.json`
- [x] 4.4 Add "Changing MTF's address strands the notes on the old one; a Backup per device is the only bridge (ADR 0008)" to the Risks of [KB/frontend/storage.md](../../../KB/frontend/storage.md); verify it links ADR 0008
- [x] 4.5 In [KB/roadmap.md](../../../KB/roadmap.md), tick change 1's "First deploy to Vercel" and add a Small tickets entry for #28 ("Dominio propio", change 28); in `README.md` add where to open MTF (`https://mtf.zynis.com.ar`); in `CLAUDE.md` and `openspec/config.yaml` name the address next to Vercel; verify every mention of the address in the repo reads `mtf.zynis.com.ar` (`git grep -n "zynis.com.ar\|vercel.app"`)
- [x] 4.6 Write `aprendizaje/dominios-y-dns.md` in Spanish, in the format of the other notes (Qué es, Por qué lo usamos, Conceptos clave, Cómo aparece en MTF, Qué buscar): domain and subdomain, DNS and a `CNAME` record, how Vercel issues the HTTPS certificate, 301/308 redirects and `vercel.json`, and why the origin decides where localStorage and an installed app live; add its row to `aprendizaje/index.md`; verify the index links it
- [x] 4.7 Read [GLOSSARY.md](../../../GLOSSARY.md) for terms the change sharpens (Backup, Export, Import); verify no term needs a change, or update it

## 5. Integration

- [x] 5.1 Run `command npm run lint`, `command npm test` and `command npm run build`; verify all pass with no warnings (no gesture changed, so Playwright is not required; CI runs it on the PR)
- [x] 5.2 Clean-code pass over the changed files; fill Technical Context, Modified Files and Pending (the after-merge checks below) in `KB/developers/active.md`; verify `openspec validate 28-dominio-propio` passes

## Workflow follow-up

- Merge the PR only after every device in 2.1 has moved (2.2): the redirect goes live with the deploy of `main`.
- On this branch, once every task is done: `/opsx:archive` (merges the `pwa-offline` delta into `openspec/specs/`), then the user commits, pushes and opens the PR.
- After the merge, before `/close-ticket`: `curl -I https://zynis-mtf.vercel.app/` answers `308` with `location: https://mtf.zynis.com.ar/`; `/manifest.webmanifest` keeps its path; the old installed apps still open (frozen) and are then uninstalled.
- Then, on an up-to-date `main`: `/close-ticket`.
