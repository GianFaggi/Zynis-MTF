# Tasks

## 1. The root rule

- [x] 1.1 Add the `"source": "/"` rule of design decision 1 to `vercel.json`, first in `redirects`, with the same `has` → `host` `zynis-mtf.vercel.app` as the existing rule and `destination` `https://mtf.zynis.com.ar/`, `permanent: true`; verify it parses (`node -e "require('./vercel.json')"`), the host value matches the existing rule character by character, and `git diff vercel.json` shows only added lines
- [x] 1.2 Run `command npm run build`; verify `dist/` has no `vercel.json` and `manifest.webmanifest` still has `start_url` and `scope` `/`
- [x] 1.3 (User) Push the branch so Vercel builds its preview; open the preview address while logged in to Vercel and verify it opens MTF without redirecting

## 2. Docs

- [x] 2.1 In the Deployment section of [KB/frontend/stack.md](../../../KB/frontend/stack.md), say `vercel.json` holds two host-conditioned redirects: the root `/` and every other path (`/:path*`), with why the root needs its own (Vercel does not match `/:path*` against it); verify it matches `vercel.json`
- [x] 2.2 In the Address section of [KB/frontend/pwa.md](../../../KB/frontend/pwa.md), keep "redirects every path there (308)" and add that the root is a rule of its own; verify it links [stack.md](../../../KB/frontend/stack.md#deployment)
- [x] 2.3 In [docs/adr/0008-own-address.md](../../../docs/adr/0008-own-address.md), change "a host-conditioned rule in `vercel.json` (#28)" to rules, with the root rule added in #31 (design decision 3); verify the decision text is otherwise unchanged
- [x] 2.4 In [KB/roadmap.md](../../../KB/roadmap.md), add a Small tickets entry for #31 ("Redirigir la raíz", change 31) after #28's: the root of `zynis-mtf.vercel.app` now redirects too; verify it links the issue
- [x] 2.5 Update `aprendizaje/dominios-y-dns.md` (local only, Spanish): the `vercel.json` example shows both rules, the `source: "/:path*"` bullet no longer lists `/`, and a short "La raíz necesita su propia regla" note explains what #28's check found and that redirects are only testable on a real deployment; verify the `curl -I` lines in "Cómo aparece en MTF" still match the expected answers
- [x] 2.6 Read [GLOSSARY.md](../../../GLOSSARY.md); verify no term needs a change (no domain term is introduced or sharpened)

## 3. Integration

- [x] 3.1 Run `command npm run lint`, `command npm test` and `command npm run build`; verify all pass (no gesture changed, so Playwright is not required; CI runs it on the PR)
- [x] 3.2 Clean-code pass over the changed files; fill Technical Context, Modified Files and Pending (the after-merge checks below) in `KB/developers/active.md`; verify `openspec validate 31-redirigir-raiz-vercel` passes

## Workflow follow-up

- On this branch, once every task is done: `/opsx:archive` (merges the `pwa-offline` delta into `openspec/specs/`), then the user commits, pushes and opens the PR.
- After the merge, before `/close-ticket`, the checks of design.md's Migration Plan: `curl -I https://zynis-mtf.vercel.app/` → `308` with `location: https://mtf.zynis.com.ar/`; `/?from=link` keeps its query; `/sw.js`, `/manifest.webmanifest` and `/index.html` still redirect to the same path; `https://mtf.zynis.com.ar/` → `200`. Record the results in `KB/developers/active.md`.
- Then, on an up-to-date `main`: `/close-ticket`.
