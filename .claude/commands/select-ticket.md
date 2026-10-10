Select an existing GitHub issue and set it as the active ticket.

Argument: issue number — `$ARGUMENTS`

gh executable: `"C:\Program Files\GitHub CLI\gh.exe"`
Repo: `GianFaggi/Zynis-MTF`

---

**Step 1 — Check active.md**

Read `KB/developers/active.md`. If there is already an active ticket, warn the user and stop.

---

**Step 2 — Fetch issue from GitHub**

```bash
"C:/Program Files/GitHub CLI/gh.exe" issue view $ARGUMENTS --repo GianFaggi/Zynis-MTF --json number,title,body,url
```

Parse: number, title, url, and extract Objetivo + Criterios de Aceptación from the body if present.

---

**Step 3 — Write active.md**

Overwrite `KB/developers/active.md`:

```markdown
# Active Work

## Ticket
#NUMBER - title

## GitHub Issue
URL

## Branch
{type}/{number}-{slug}

## OpenSpec Change
{number}-{slug} (not created yet — next step: `/opsx:propose`)

## Objetivo
(from issue body or leave blank)

## Acceptance Criteria
- [ ] (from issue body or leave blank)

## Technical Context
(to be filled when work starts)

## Status
🔄 In progress

## Modified Files
(empty)

## Pending
(to be filled)
```

Confirm to the user with the issue title and URL, and suggest `/opsx:propose` as the next step.
