# Team Workplan: Arbitration Panel + Unified Auth

Two-person parallel execution of the approved plan (`specs/arbitration-panel/` + `specs/UIET-P2-unified-auth/` once created). Master plan reference: plan file "Arbitration Panel + Unified Auth (digitopub ↔ submitmanager/OJS)".

## Roles

| | Developer A — "Panel" | Developer B — "Auth" |
|---|---|---|
| Scope | Stream A: read-only arbitration/peer-review admin panel | Stream B: bidirectional SSO bridge |
| Branch | `feat/arbitration-panel` | `feat/unified-sso` |
| Merge order | Merges first | Rebases on main after A merges |

Both branch off the same `main` commit. Streams were designed to be independent; the file-ownership table below is the contract that keeps them conflict-free.

## File ownership (hard boundaries)

### Developer A owns (B must not touch)
- `src/features/reviews/**` (full rewrite: route, service, constants, schemas, types, api hooks, components)
- `app/admin/reviews/**`, `app/admin/submissions/**`
- `specs/arbitration-panel/**` (spec.md, data-model.md)
- `tests/unit/ojs-review-*.test.ts`, `tests/integration/reviews-api.test.ts`

### Developer B owns (A must not touch)
- `src/lib/sso-token.ts` (new), `src/lib/ojs-logout.ts` (new), `src/lib/identity-cookie.ts` (cookie v2)
- `src/server/routes/auth-sso.ts` (new), `src/server/routes/auth-orcid.ts` (logout wire-up), `src/server/routes/account.ts` + `metrics-events.ts` (null-orcid handling), `src/lib/event-recorder.ts`
- `prisma/schema.prisma` + migrations (`ojs_sso_tokens.purpose`, `revoked_ojs_users`)
- `scripts/ojs-bridges/**` (3 new PHP bridges), `scripts/retention-cleanup.ts` (jti sweep)
- `src/server/app.ts` (adds `/auth/sso` mount — see shared-file rules)
- `src/features/auth/api/use-register.ts` (delete)
- `specs/UIET-P2-unified-auth/**`, `docs/ojs-bridges-deployment.md`, `CLAUDE.md`, `docs/system_variables.md`, `.env.example`
- `tests/unit/sso-token.test.ts`, `tests/unit/identity-cookie*.test.ts`, `tests/integration/auth-sso.test.ts`

### Read-only for BOTH (neither may modify)
- `src/features/ojs/server/ojs-client.ts` (`ojsQuery`, `isOjsConfigured`) — shared backbone; if either needs a change, coordinate first
- `src/features/ojs/server/sso-route.ts`, `provision-route.ts`, `sso-utils.ts` — B reuses byte-compatible token format, does NOT edit
- `src/features/auth/server/route.ts` + `src/lib/db/auth*.ts` + `middleware.ts` — admin JWT+OTP auth frozen
- `src/lib/pagination.ts`, `src/lib/serialize.ts`, `src/lib/rate-limiter.ts`, `src/lib/auth-middleware.ts` — reuse as-is

### Shared-file rules (only real collision points)
- `src/server/app.ts`: only B edits (one `.route("/auth/sso", ...)` line before `/auth`). A does not touch it (reviews mount already exists).
- `prisma/schema.prisma`: only B edits. A has zero schema changes by design.
- If either dev discovers a needed edit in the other's territory or in read-only files: stop, message the other dev, do not edit.

## Sequencing

### Developer A (can run start-to-finish independently)
1. **A0** — `specs/arbitration-panel/spec.md` + `data-model.md` (OJS table→DTO mapping, enum maps)
2. **A1** — `ojs-review-constants.ts` + `ojs-review-service.ts` (live `ojsQuery` reads; verify `submission_progress` sentinel '' vs 0 against live OJS data early — it gates every list query)
3. **A2** — rewrite `reviews/server/route.ts` (4 endpoints, `requireAdmin`, `configured:false` / 503 envelopes)
4. **A3** — hooks + components + repoint 3 admin pages (removes dead links + both latent bugs)
5. **A4** — unit + integration tests, manual cross-check vs OJS backend UI, `bun run lint && bun run test && bun run build`
6. Open PR → review by B → merge to main

### Developer B (parallel from day 1; B1 ships dark = zero user-visible change until B3)
1. **B0** — `specs/UIET-P2-unified-auth/spec.md` + CLAUDE.md amendment (rules: passwords OJS-only, logout propagation, bridge-only session checks)
2. **Pre-B gate** — verify deployed OJS version + that `sso_login.php` works in prod today (highest-risk item; do before writing PHP)
3. **B1** — `sso-token.ts`, jti store migration, cookie v2 + dual revocation, null-orcid consumer audit. All dark.
4. **B2** — `GET /api/auth/sso/ojs-login` (dp→OJS auto-login; no PHP changes)
5. **B3** — `/issue` + `/consume` endpoints + `digitopub_continue.php` (OJS→dp handoff)
6. **B4** — logout propagation both ways (`ojs-session-bridge.php`, `digitopub_logout.php`, `/revoke`)
7. **B5** — cleanup, deployment doc, env docs
8. Rebase on main (after A merged), open PR → review by A → merge

### Sync points (mandatory)
| When | What |
|---|---|
| Day 1 | Both confirm branch-off commit + this ownership table |
| After A1 + Pre-B gate | Share findings: OJS version, `submission_progress` sentinel, any `ojs-client` surprises — both streams depend on same OJS instance facts |
| Before A merge | B reviews A's PR (fresh eyes on SQL correctness) |
| Before B3 deploy | A reviews B's PR, esp. cookie v2 backward-compat tests (v1 must still verify) |
| PHP bridge deploys | Single person uploads to SiteGround (B), using smoke-test curls from deployment doc |

## Interface contract between streams
None at code level — deliberate. Only shared runtime dependency: OJS DB pool config + `OJS_BASE_URL`. Neither stream changes the other's behavior. Cross-cutting facts (OJS version, enum values) flow through the sync points, not code.

## Definition of done
- A: panel renders live OJS review data cross-checked against OJS backend UI; deep links work; degraded states (unconfigured/down) render; CI green.
- B: full loop verified — digitopub register → auto-login OJS; OJS login → `digitopub_continue.php` → digitopub identity; logout either side propagates (best-effort, never blocks); ORCID + admin auth unaffected; v1 cookies still valid; CI green.
