# Working Agreement

How every task on this initiative is run, from intake to merge. This document is
the reference both the implementing engineer and the human reviewer point at when
a task feels like it is drifting.

## Operating model

- **Implementing engineer ([repo]).** Owns repo changes, documentation, the task
  board, tests, and verification scripts. Never performs infra.
- **Human operator ([ops]).** Owns DNS, SiteGround, OJS configuration, Apache
  rules, Crossref deposits, and Google Search Console. Approves every merge.
- **Standard of work.** One task = one small branch/PR. No scope creep. Every PR
  ships with tests, passes `tsc --noEmit` and lint with zero errors, has an
  acceptance-criteria checklist and a rollback note, and updates `TASKS.md`.

## Guardrails that never change

- `app/robots.ts` continues to `Disallow: /api/`.
- `/api/pdf-proxy` continues to work for the human PDF viewer.
- `EMIT_SCHOLAR_CITATION_META` stays `false` on the apex.
- No OJS file moves; no runtime env edits from the repo side.

## The six-stage lifecycle

Every task — `T1` onward — passes through these stages in order. Skipping a stage
is a review-blocker.

### 1. DIVIDE
Confirm the task is small and independently shippable. State scope, files touched,
and what is explicitly **out**. If the task is too large, split it into sub-tasks
**on the board first**, then pick one. A task that touches more than ~5 files or
crosses feature boundaries is a candidate for splitting.

### 2. PREPARE — Definition of Ready
At the top of the PR description, write a 5-line spec:

```
Goal:        <one sentence>
Files:       <bullet list of paths>
Risks:       <what could go wrong, who notices first>
Rollback:    <exact revert plan>
Acceptance:  <criteria copied from TASKS.md>
```

Confirm `depends-on` tasks are `done`. If an [ops] prerequisite is pending, mark
the task `blocked-on-ops` in `TASKS.md` and **stop**.

### 3. EXECUTE
Implement on a single branch. Small, focused commits. No unrelated changes — no
opportunistic refactors, no formatter sweeps, no dependency bumps. Follow repo
conventions in `CLAUDE.md`. If you find a second bug, write it down as a new task
on the board; do not fix it in this PR.

### 4. TEST
Add or adjust unit/integration tests for the change. Run the full suite,
`tsc --noEmit`, and lint locally. For [ops]-adjacent tasks, run the relevant
slice of `verify-cutover.sh`. Paste the evidence into the PR — actual command
output, not a claim that "tests pass".

### 5. REVIEW — Definition of Done
Self-review against the acceptance-criteria checklist line by line, ticking each
box. Request human approval. Merge only on **green CI + explicit approval**.
Update `TASKS.md` status to `done` in the same merge.

### 6. MODIFY / ITERATE
If review fails, revise **within the same task**. If the failure reveals a scope
change, open a new task rather than expanding this one. Re-request review when
the checklist is green again.

## Per-task reporting

After every task, post:

- **What changed** — bullet list of files.
- **Test/verify evidence** — command + relevant output.
- **Task-board diff** — which rows changed status.
- **Next task** — the id you intend to pick up.
- **Blockers** — any pending [ops] dependency, with what is needed to unblock.

## Definition of "Done" for the initiative

The initiative ships when:

- All tasks in `TASKS.md` are `done`.
- `verify-cutover.sh` matrix is fully green and runs clean in CI.
- A sample DOI resolves to `journals.digitopub.com`.
- Scholar has indexed at least one article on the new host (recorded in `TASKS.md`).
- No `submitmanager.com` literal remains in `app/**` or `src/**`.
