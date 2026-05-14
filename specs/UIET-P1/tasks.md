---
description: "UIET-P1 implementation tasks — ORCID identity, engagement tracking, OA-aware PDF gating"
---

# Tasks: UIET-P1 — ORCID Identity, Engagement Tracking & OA-Aware PDF Gating

**Input**: Design documents in `specs/UIET-P1/`
**Prerequisites**:
- `spec.md` — 6 user stories ranked P1/P2/P3, 48 FRs, 10 SCs
- `plan.md` — technical design, sequence diagrams, env vars, migration runbook
- `data-model.md` — 7 new Prisma models + SQL preview
- `contracts/` — OpenAPI 3.1 specs for auth-orcid, metrics, account
- `analysis.md` — Phase 0 audit of existing auth/PDF/citation surfaces

**Tests**: REQUIRED. The spec mandates ≥ 80 % coverage on new files and explicit unit / integration / E2E test types. Test tasks are included throughout.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and deployed as an independent MVP increment. Within each story, ordering is **DB migration → server libs → server routes → UI components → tests**.

**Format**: `[ID] [P?] [Story] Description`
- `[P]` — can run in parallel (different files, no upstream task dependencies)
- `[Story]` — `US1`…`US6`, or `FND` (foundation), or `POL` (polish)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: One-time project plumbing. Must complete before Foundation.

- [ ] **T001** [FND] Add new env vars to `.env.example` and `.env.production.template`:
  `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`, `ORCID_REDIRECT_URI`, `IDENTITY_COOKIE_SECRET`,
  `ORCID_STATE_SECRET`, `EVENT_IP_HASH_SALT_SEED`, `ENABLE_ORCID_OJS_BACKFILL`.
  Document defaults: backfill `false` in prod, `true` in dev.

- [ ] **T002** [P] [FND] Create `src/lib/env.ts` with Zod-validated runtime env loader.
  In production, missing required vars throw at boot. In dev/test, missing values fall
  back to a console-warned dev default. Export `getEnv()` typed accessor.

- [ ] **T003** [P] [FND] Add `UIET_P1_ENABLED` boolean env flag (defaults `false`) to
  `src/lib/env.ts`. All new UI surfaces and metric writes check this flag.

- [ ] **T004** [P] [FND] Update `eslint.config.mjs` to add a custom rule that bans
  imports of `getSession` and `jwtVerify` from any file under `app/` (excluding
  `app/admin/**`) and any file under `src/server/routes/`.
  This enforces SC-009 in CI.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, server libraries, and base middleware that ALL user stories depend on.

**⚠️ CRITICAL**: No user-story work begins until Phase 2 is complete.

### Database

- [ ] **T010** [FND] Add 7 new models to `prisma/schema.prisma` exactly as
  specified in `specs/UIET-P1/data-model.md`:
  `UserEvent`, `MetricsArticleDaily`, `MetricsArticleMonthly`, `UserMetrics`,
  `RevokedOrcid`, `UserOrcidLink`, `AuditOjsWrite`. Include all `@@unique` and
  `@@index` annotations, the `@@map` table names, and the `/// DEPRECATED` doc
  comments on `PublishedArticle.views_count|downloads_count|citations_count`.

- [ ] **T011** [FND] Run `bunx prisma migrate dev --name uiet_p1_engagement_tracking`.
  Verify `prisma/migrations/{timestamp}_uiet_p1_engagement_tracking/migration.sql`
  matches the SQL preview in `data-model.md`. Commit the generated migration.

- [ ] **T012** [FND] Run `bunx prisma generate` and verify TypeScript compiles
  with `bun run lint`.

### Server libraries (pure, no Hono dependency)

- [ ] **T020** [P] [FND] Create `src/lib/identity-cookie.ts`:
  - `mintCookie(payload)` → returns signed cookie string.
  - `verifyCookie(value)` → returns `{payload, refreshNeeded} | null`.
  - `getIdentity(request)` → reads cookie header, calls `verifyCookie`, returns
    `{orcid, ojs_user_id, email_hash, refreshNeeded} | null`.
  - HMAC-SHA256 via `jose`, base64url encoding, ±2 min skew tolerance,
    sliding 30 min, absolute 8 h, version 1.

- [ ] **T021** [P] [FND] Create `src/lib/orcid-state.ts`:
  - `mintState({nonce, return_url})` → HMAC-signed one-time token (10 min TTL).
  - `verifyAndConsumeState(value)` → returns payload or throws if expired/reused.
  - Reuse-detection via a small in-memory LRU keyed on `nonce` (the cookie is
    cleared by the callback to prevent replay).

- [ ] **T022** [P] [FND] Create `src/lib/orcid-oauth.ts`:
  - `buildAuthorizeUrl({state, return_url})` → full ORCID `/oauth/authorize` URL.
  - `exchangeCode(code)` → POST to `/oauth/token`, returns `{access_token, orcid, name, id_token}`.
  - `verifyOrcidToken(idToken)` → uses cached JWKS (24 h + 1 h SWR) and asserts
    `iss === 'https://orcid.org'`, `aud === ORCID_CLIENT_ID`, `exp > now - 120s`.
  - `getOrcidJwks()` → module-scoped cache with `createRemoteJWKSet`.

- [ ] **T023** [P] [FND] Create `src/lib/ip-hash.ts`:
  - `hashIp(ip, ua, day)` → `SHA-256(salt || ip || ua)` where
    `salt = HMAC(EVENT_IP_HASH_SALT_SEED, day)`.
  - `dayKey()` → `YYYY-MM-DD` UTC.
  - Same `(ip,ua)` on different days produces different hashes.

- [ ] **T024** [P] [FND] Create `src/lib/consent.ts`:
  - `getConsent(request)` → returns `{choice, granular, dismiss_count, ...} | null`.
  - `setConsent(response, choice, granular?)` → sets 1-year `digitopub_consent` cookie.
  - `recordDismiss(response, prev)` → bumps `dismiss_count`, sets `first_dismiss_at` if absent.
  - `shouldForceChoice(payload)` → returns `true` when `dismiss_count >= 31`.

- [ ] **T025** [P] [FND] Create `src/lib/event-recorder.ts`:
  - `recordEvent({orcid, articleId, journalId, galleyId?, eventType, source, citationFormat?, ipHash?, uaHash?, consent})`.
  - View dedup: insert with `view_day=YYYY-MM-DD`, catch UNIQUE violation → `{recorded: true, deduped: true}`.
  - Download dedup: pre-query `created_at > NOW() - INTERVAL 30 SECOND` on `(article_id, galley_id, dedup_key)`; insert only if absent.
  - Citation: plain insert, `{deduped: false}`.
  - All inserts compute `dedup_key = SHA-256(orcid || '|' || ip_hash || '|' || ua_hash)`.

- [ ] **T026** [P] [FND] Create `src/lib/ojs-write-guard.ts`:
  - `writeOrcidToOjsWithAudit({orcid, ojsUserId, requestId})`:
    1. `INSERT INTO audit_ojs_writes (..., success=NULL)`.
    2. `INSERT INTO ojs.user_settings (...)`.
    3. `UPDATE audit_ojs_writes SET success=true, resolved_at=NOW()`.
    4. On any failure, write `success=false` audit row and log loudly.
  - `isBackfillEnabled()` → reads `ENABLE_ORCID_OJS_BACKFILL` env.

### Server middleware

- [ ] **T030** [FND] Create `src/lib/identity-middleware.ts`:
  - `attachIdentity` Hono middleware → calls `getIdentity(c.req.raw)`, sets `c.set('identity', ...)`.
  - `requireIdentity` Hono middleware → 401 with `WWW-Authenticate: orcid` if missing.
  - Includes auto-refresh: if `refreshNeeded`, re-mints the cookie via `c.header('Set-Cookie', ...)`.
  - **Does NOT call `getSession()` or `jwtVerify`** — fully orthogonal to admin auth.

- [ ] **T031** [FND] Extend `src/lib/rate-limiter.ts` (existing) or add to it:
  named limiter keys `metrics:event` (60/min/ip + 600/hr/ip) and
  `orcid:callback` (10/min/ip). Reuse existing in-memory sliding-window
  implementation.

### Foundation tests

- [ ] **T040** [P] [FND] `tests/unit/identity-cookie.test.ts`:
  round-trip, tampered HMAC rejection, expired sliding rejection, expired
  absolute rejection, ±2 min skew acceptance, `refreshNeeded` boundary.

- [ ] **T041** [P] [FND] `tests/unit/orcid-state.test.ts`:
  mint→verify round-trip, expired-state rejection, reused-nonce rejection.

- [ ] **T042** [P] [FND] `tests/unit/orcid-oauth.test.ts`:
  authorize URL construction, mocked code-exchange via `msw`, JWKS cache hit/miss/SWR,
  `iss` mismatch rejection, `aud` mismatch rejection, expired token rejection.

- [ ] **T043** [P] [FND] `tests/unit/ip-hash.test.ts`:
  determinism on same `(ip,ua,day)`, different hash on next day, salt rotation.

- [ ] **T044** [P] [FND] `tests/unit/consent.test.ts`:
  fresh visit returns `null`, set-then-read round-trip, dismiss bump,
  `shouldForceChoice` at count 30 vs 31.

- [ ] **T045** [P] [FND] `tests/unit/event-recorder.test.ts`:
  view dedup within day (no second row), download dedup within 30 s (no second row),
  download outside 30 s (second row OK), citation no dedup (every insert succeeds),
  anonymous (orcid=null) uses ip_hash for dedup_key.

- [ ] **T046** [P] [FND] `tests/unit/ojs-write-guard.test.ts`:
  audit-then-write happy path, OJS failure → audit row marked `success=false` + login still succeeds (mocked),
  flag OFF → no OJS write, no audit row.

**Checkpoint**: Foundation ready. All user stories below can now proceed.

---

## Phase 3: User Story 1 — Anonymous OA Reading (Priority: P1) 🎯 MVP

**Goal**: An anonymous reader can read OA articles and view+download OA PDFs without any login, modal, or identifying cookie.

**Independent Test**: Open incognito browser → navigate to OA article → read abstract → click "View PDF" → iframe loads → click Download → file streams down. No 401, no modal. Cookie list contains only `digitopub_consent` (after user makes a consent choice).

### Implementation for US1

- [ ] **T100** [US1] Modify `app/api/pdf-proxy/route.ts`:
  - Add a no-op call to `getIdentity(request)` at the top (no rejection yet).
  - Add a 5-min in-memory cache `(submissionId, galleyId) → isOpenAccess` populated
    by a new OJS query (`SELECT i.access_status FROM publication_galleys ...`).
  - Behavior unchanged for OA articles. (Gating logic for non-OA is added in US2.)

- [ ] **T101** [P] [US1] Create `app/components/consent-banner.tsx`:
  - Bottom footer on desktop, bottom sheet on mobile (≤640 px CSS media query).
  - Three buttons: Accept all / Essential only / Customize.
  - Customize expands a drawer with `analytics`, `personalization` toggles.
  - Persists via `setConsent(response, choice)` server action.
  - Modal-locked when `shouldForceChoice(payload)` is true.

- [ ] **T102** [US1] Modify `app/layout.tsx` to render `<ConsentBanner />` globally,
  outside `<ThemeProvider>` children but above all other content. Gated by
  `UIET_P1_ENABLED` env flag.

### Tests for US1

- [ ] **T110** [P] [US1] `tests/e2e/oa-anonymous-flow.spec.ts`:
  Playwright. Open OA article → assert no login modal → click View PDF →
  assert iframe `src` matches → click Download → assert file response.
  Confirm `digitopub_identity` cookie is never set.

- [ ] **T111** [P] [US1] `tests/e2e/consent-banner.spec.ts`:
  - First visit shows banner.
  - Click Essential only → reload → banner gone, cookie set with `choice=essential_only`.
  - Dismiss without choosing → cookie tracks dismiss count.
  - At dismiss_count=31 → next page load shows modal-locked banner.

- [ ] **T112** [P] [US1] `tests/integration/pdf-proxy.test.ts`:
  OA proxy request without cookie → 200 + pdf stream. (Gating test for non-OA in US2.)

**Checkpoint**: US1 is functional and independently testable. MVP-ready for OA-only journals.

---

## Phase 4: User Story 2 — Non-OA Gated Download with ORCID Sign-In (Priority: P1)

**Goal**: Anonymous reader hits a non-OA View/Download → modal → ORCID flow → returns signed-in → PDF opens.

**Independent Test**: Anonymous user → non-OA article → click View PDF → modal appears → click "Sign in with ORCID" → (mocked) ORCID returns code → callback sets cookie → redirected to article → PDF loads.

### Server routes for US2

- [ ] **T200** [US2] Create `src/server/routes/auth-orcid.ts` (Hono router):
  - `GET /api/auth/orcid/start` — mint state, set `digitopub_oauth_state` cookie,
    302 to `buildAuthorizeUrl(...)`.
  - `GET /api/auth/orcid/callback` — rate-limited (10/min/ip),
    verify+consume state, `exchangeCode`, `verifyOrcidToken`, `linkOjsUser`,
    handle `BlockedAccountError` → 403, mint identity cookie, 302 to `return_url`.
  - `POST /api/auth/orcid/logout` — clear identity + state cookies, 200.
  - `GET /api/auth/orcid/whoami` — 200 always; returns auth-or-anonymous payload.
  - `POST /api/auth/orcid/refresh` — refreshes sliding expiry when within 5 min.

- [ ] **T201** [US2] Create `src/server/routes/auth-orcid-helpers.ts` (server-only):
  - `linkOjsUser({orcid, email, requestId})` per `plan.md §3`:
    1. ORCID match in OJS `user_settings`.
    2. Email match in OJS `users` (gate on `disabled=1`).
    3. Backfill via `writeOrcidToOjsWithAudit` if flag is ON.
    4. Always upsert `UserOrcidLink` on the digitopub side.

- [ ] **T202** [US2] Modify `src/server/app.ts` to mount the new auth-orcid router
  at `/auth/orcid`:
  ```ts
  .route("/auth/orcid", authOrcidRouter)
  ```
  Verify no path collision with the existing `authRouter` at `/auth`.

- [ ] **T203** [US2] Modify `app/api/pdf-proxy/route.ts`:
  - If `!isOpenAccess(submissionId, galleyId) && !identity`, return 401 with
    `{ error: "ORCID_REQUIRED" }` and `WWW-Authenticate: orcid` header.

### Client surfaces for US2

- [ ] **T210** [P] [US2] Create `src/hooks/use-identity.ts`:
  TanStack Query hook calling `client.auth.orcid.whoami.$get()`,
  5-minute `staleTime`. Returns `{identity, isLoading}`.

- [ ] **T211** [P] [US2] Create `app/components/auth/login-modal.tsx`:
  - Centered modal `max-w-[420px]` on ≥641 px.
  - Full-screen drawer at ≤640 px (CSS media query, not JS).
  - Title "Sign in to continue", body explains why ORCID is required for non-OA,
    "What is ORCID?" helper link, single CTA "Sign in with ORCID" that links to
    `/api/auth/orcid/start?return_url={current}`.
  - Imperatively openable via `openLoginModal({return_url})` (module-scoped event bus).

- [ ] **T212** [P] [US2] Create `src/hooks/use-gated-action.ts`:
  - Wraps a callback `action: () => void` and an `isOpenAccess` flag.
  - Reads identity via `useIdentity()`.
  - If `!isOpenAccess && !identity`, opens login modal with `return_url=window.location.href` and aborts.
  - Otherwise calls `action()`.

- [ ] **T213** [US2] Modify `app/journals/[id]/articles/[publicationId]/components/pdf/use-pdf-modal.ts`:
  - Wrap `openModal` with `useGatedAction({isOpenAccess})`.
  - Accept new `isOpenAccess` arg from caller.

- [ ] **T214** [US2] Modify `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx`:
  - Each of the 4 download `<a>` tags (toolbar download, mobile fallback Open-in-browser,
    mobile fallback Download, error-state new-tab) becomes a `<GatedDownloadLink>` that
    intercepts clicks via `useGatedAction`.
  - Add `<GatedDownloadLink>` helper component in the same file.

- [ ] **T215** [US2] Modify `app/journals/[id]/articles/[publicationId]/components/modal-pdf-viewer.tsx`
  to pass `isOpenAccess` down to `usePdfModal(pdfUrl, isOpenAccess)` and the overlay.

- [ ] **T216** [US2] Modify `app/journals/[id]/components/article-item.tsx`
  card-style trigger: no change required (re-uses `ModalPdfViewer` which now gates).
  Verify behavior in E2E test.

### Tests for US2

- [ ] **T220** [P] [US2] `tests/integration/auth-orcid-callback.test.ts`:
  Mock ORCID via `msw`. Cases:
  - Happy path: code → token → identity cookie set + 302 to return_url.
  - State invalid → 400.
  - State reused → 400.
  - Disabled OJS account → 403.
  - Rate limit exceeded → 429.
  - JWKS verify failure → 502.

- [ ] **T221** [P] [US2] `tests/integration/pdf-proxy-gating.test.ts`:
  - Non-OA + no cookie → 401 with `WWW-Authenticate: orcid`.
  - Non-OA + valid cookie → 200 + pdf stream.
  - OA + no cookie → 200 + pdf stream.

- [ ] **T222** [P] [US2] `tests/e2e/non-oa-orcid-flow.spec.ts`:
  Mock ORCID callback. Anonymous → non-OA View PDF → modal → click ORCID → mocked
  redirect → cookie set → article reloads → PDF opens → confirm `digitopub_identity` cookie.

- [ ] **T223** [P] [US2] `tests/integration/orcid-whoami.test.ts`:
  - No cookie → `{authenticated: false}`.
  - Valid cookie → `{authenticated: true, orcid: ..., exp_sliding, exp_absolute}`.
  - Tampered cookie → `{authenticated: false}` (no error).

**Checkpoint**: US1 + US2 functional. Subscription journals can launch.

---

## Phase 5: User Story 3 — Persistent ORCID Session with Sliding Expiry (Priority: P1)

**Goal**: ORCID sign-in persists 30 min sliding / 8 h absolute.

**Independent Test**: Sign in → reload at 29 min → still authed. Reload at 31 min → anonymous. Stay active until hour 7:59 → still authed. Hour 9 → anonymous regardless.

### Implementation for US3

- [ ] **T300** [US3] Verify sliding refresh in `identity-cookie.ts` (T020): if
  `verifyCookie` returns `refreshNeeded: true`, the `attachIdentity` middleware
  re-mints with `exp_sliding = now + 30 min`. (Logic was already added in T020
  + T030; this task adds explicit assertions.)

- [ ] **T301** [US3] Add `RevokedOrcid` lookup to `identity-cookie.ts` (T020)
  via a 60 s cached `isRevoked(orcid, iat)` helper. Cookies with `iat < cookie_iat_min`
  for a revoked ORCID are rejected.

### Tests for US3

- [ ] **T310** [P] [US3] `tests/unit/identity-cookie-sliding.test.ts`:
  - `iat=now, exp_sliding=now+30m, exp_absolute=now+8h` → valid.
  - 25 min later → still valid; `refreshNeeded=true` ← within 5 min boundary? Test boundary.
  - 31 min later → invalid (sliding expired).
  - 7 h 59 m later → valid; refresh re-mints with new `exp_sliding=now+30m`.
  - 8 h 1 m later → invalid (absolute expired) regardless of recent activity.

- [ ] **T311** [P] [US3] `tests/e2e/orcid-session-persistence.spec.ts`:
  Playwright with `clock` API. Sign in → reload at 29 min (mocked clock) →
  still authed. Reload at 31 min → anonymous. Reload at 7 h 59 m → authed.
  Reload at 8 h 1 m → anonymous.

- [ ] **T312** [P] [US3] `tests/unit/revoked-orcid.test.ts`:
  Cookie with `iat < cookie_iat_min` for revoked ORCID → `getIdentity` returns null.
  Cookie with `iat > cookie_iat_min` (new cookie issued after revoke) → valid.

**Checkpoint**: US1 + US2 + US3 functional. Identity layer fully validated.

---

## Phase 6: User Story 4 — Engagement Events Attributed to ORCID (Priority: P2)

**Goal**: Every reader action (view, download, citation copy/export) writes a row to `user_event` with ORCID (signed-in) or IP hash (anonymous), respecting dedup rules and consent state.

**Independent Test**: Sign in → view, view PDF, download, copy citation, export `.ris`. Query `user_event` — see exactly 1 view row (single ORCID-day), 1 download row, 2 citation rows, no duplicates. Sign out, repeat — see 4 more rows with `orcid=NULL`, `ip_hash=<today's hash>`.

### Server routes for US4

- [ ] **T400** [US4] Create `src/server/routes/metrics.ts`:
  - `POST /api/metrics/events/view` — Zod-validated body, rate-limited,
    `recordEvent({eventType: 'view', source: 'article_page'|'pdf_view'})`.
  - `POST /api/metrics/events/download` — same pattern, `eventType='download'`.
  - `POST /api/metrics/events/citation` — same pattern, `eventType='citation_export'`.
  - All three respect consent cookie per `plan.md §5` (ip_hash/ua_hash NULL for
    `essential_only` and `pre_consent`).

- [ ] **T401** [US4] Modify `src/server/app.ts` to mount the new metrics events
  router under the existing `/metrics` path:
  ```ts
  .route("/metrics", metricsRouter)   // existing site-stats router (GET /)
  ```
  The new POST endpoints live under `/metrics/events/*` — verify there is no
  collision with the existing `GET /metrics/` site-stats route. Either chain
  the new POST routes onto the same Hono instance, OR split into
  `/metrics` (site stats) + `/metrics/events` (new). Recommend chaining.

### Client wiring for US4

- [ ] **T410** [P] [US4] Modify `app/journals/[id]/articles/[publicationId]/components/article-page-client.tsx`:
  Fire `POST /api/metrics/events/view` with `source='article_page'` once on mount
  when `responseData.data` is available. Use a `useRef` to fire-once-per-route-change.

- [ ] **T411** [P] [US4] Modify `app/journals/[id]/articles/[publicationId]/components/pdf/use-pdf-modal.ts`:
  Add a `viewFiredRef = useRef(false)`. When `probeState === 'ready' && loaded === true`
  AND `!viewFiredRef.current`, fire `POST /api/metrics/events/view` with
  `source='pdf_view'`. Reset `viewFiredRef.current = false` on `closeModal`.

- [ ] **T412** [P] [US4] Modify `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx`:
  Each `<GatedDownloadLink>` (added in T214) also fires
  `POST /api/metrics/events/download` with the galley id on click.

- [ ] **T413** [P] [US4] Modify `app/journals/[id]/articles/[publicationId]/components/citation-box.tsx`:
  `handleCopy` → fire `POST /api/metrics/events/citation` with `action='copy'`, `format`.
  `handleExport` → fire `POST /api/metrics/events/citation` with `action='export'`, `format`.
  Fire BEFORE the clipboard / download operation so a failed clipboard does not
  swallow the metric.

### Aggregation crons

- [ ] **T420** [US4] Create `scripts/aggregate-daily-metrics.ts`:
  Reads previous UTC day's `user_event` rows, upserts `metrics_article_daily`
  per `plan.md §7`. Idempotent via the unique key.

- [ ] **T421** [US4] Create `scripts/aggregate-monthly-metrics.ts`:
  Rolls daily → monthly. Idempotent.

- [ ] **T422** [US4] Create `scripts/update-user-metrics.ts`:
  Recomputes `user_metrics` lifetime totals per ORCID.

- [ ] **T423** [US4] Create `scripts/retention-cleanup.ts`:
  Hard-deletes `user_event` rows older than 18 months in batches of 50000.

### Tests for US4

- [ ] **T430** [P] [US4] `tests/integration/metrics-view.test.ts`:
  - View with ORCID → 200 `{recorded: true, deduped: false}` → row in `user_event`.
  - Same ORCID + same article + same UTC day → 200 `{recorded: true, deduped: true}` → still only one row.
  - Different UTC day → new row.

- [ ] **T431** [P] [US4] `tests/integration/metrics-download.test.ts`:
  - Download → row written.
  - Same `(article, galley, identity)` within 30 s → `{deduped: true}`, no second row.
  - After 31 s → new row.

- [ ] **T432** [P] [US4] `tests/integration/metrics-citation.test.ts`:
  - Copy + export + copy → 3 rows, all distinct, none deduped.

- [ ] **T433** [P] [US4] `tests/integration/metrics-rate-limit.test.ts`:
  61 view requests in one minute from same IP → 61st returns 429 with `Retry-After`.

- [ ] **T434** [P] [US4] `tests/e2e/metrics-pipeline.spec.ts`:
  Full Playwright pipeline: sign in → view article → view PDF → download → copy citation →
  query `user_event` (via test-only helper or admin endpoint) → assert row counts.

- [ ] **T435** [P] [US4] `tests/unit/aggregate-daily.test.ts`:
  Seed events for a single UTC day, run aggregation, assert daily row matches.

**Checkpoint**: US1 + US2 + US3 + US4 functional. Analytics pipeline producing data.

---

## Phase 7: User Story 5 — Global Consent Banner (Priority: P2)

**Goal**: First-time visitors see consent banner; choice is respected by metric writes; dismiss tracking forces a choice after 30 days.

**Independent Test**: New browser → banner visible. Click Essential only → fire a view event → assert row has `source='essential_only'`, `ip_hash=NULL`, `ua_hash=NULL`. Dismiss-only visitor: 30 dismisses → banner soft. 31st dismiss → banner modal-locked.

### Implementation for US5

The banner UI was added in US1 (T101). US5 wires the consent state into the
metric pipeline and tightens the dismiss flow.

- [ ] **T500** [US5] Modify `src/lib/event-recorder.ts` (T025):
  Accept `consent` parameter. Branch:
  - `choice=all` → include `ip_hash`, `ua_hash` from request.
  - `choice=essential_only` → `ip_hash=NULL`, `ua_hash=NULL`, `source='essential_only'`
    if the caller did not already set a `source`.
  - `choice=null` (no cookie yet, dismiss_count < 31) → `orcid=NULL`, `ip_hash=NULL`,
    `ua_hash=NULL`, `source='pre_consent'`.

- [ ] **T501** [US5] Modify each metrics route (T400) to pass the consent payload
  from `getConsent(c.req.raw)` into `recordEvent`.

- [ ] **T502** [US5] Modify `app/components/consent-banner.tsx` (T101):
  - Read current consent cookie on render (client-side; cookie is not `httpOnly`).
  - If `dismiss_count >= 31` and no `choice`, render with `data-locked="true"`
    and no close button.
  - Customize panel: when toggled, stores `granular: {analytics, personalization}`.

### Tests for US5

- [ ] **T510** [P] [US5] `tests/integration/metrics-with-consent.test.ts`:
  - Event with `digitopub_consent=choice=all` → row has `ip_hash`, `ua_hash`.
  - Event with `choice=essential_only` → row has `source='essential_only'`,
    no hashes.
  - Event with no consent cookie → `source='pre_consent'`, no hashes.

- [ ] **T511** [P] [US5] `tests/e2e/consent-pre-consent-grace.spec.ts`:
  Fresh browser → dismiss banner without choosing → trigger a view →
  verify event row has `source='pre_consent'`, `orcid=NULL`, all hashes NULL.

- [ ] **T512** [P] [US5] `tests/e2e/consent-force-choice.spec.ts`:
  Simulate 31 dismissals (cookie manipulation) → reload → banner is
  modal-locked → cannot interact with rest of page until a choice is made.

**Checkpoint**: US1+US2+US3+US4+US5 functional. Privacy-compliant analytics in production.

---

## Phase 8: User Story 6 — Account Self-Service Stats and Deletion (Priority: P3)

**Goal**: Signed-in reader sees own stats; can self-delete all engagement data.

**Independent Test**: Sign in → view a few articles → visit `/account/stats` → see numbers in cards. Visit `/account/data` → click Delete → confirm → returns 204 → reload `/account/stats` → all zeros.

### Server routes for US6

- [ ] **T600** [US6] Create `src/server/routes/account.ts`:
  - `GET /api/account/stats` — requires identity, returns lifetime + 12-month payload
    per `contracts/account.yaml`.
  - `DELETE /api/account/data` — requires identity, deletes `user_event` + `user_metrics`
    for the ORCID, upserts `revoked_orcids` with `cookie_iat_min=now`, clears identity cookie,
    writes audit row.

- [ ] **T601** [US6] Modify `src/server/app.ts` to mount the new account router at `/account`.

### Client surfaces for US6

- [ ] **T610** [P] [US6] Create `app/account/stats/page.tsx`:
  Server component reading the user's stats. Anonymous → redirect to
  `/api/auth/orcid/start?return_url=/account/stats`.
  Renders 3 metric cards + 12-month chart (existing `recharts` dep).

- [ ] **T611** [P] [US6] Create `app/account/data/page.tsx`:
  Settings page with explanation, two-step confirm (typed "DELETE"),
  "Delete my engagement data" button. On success → toast + redirect to `/`.

- [ ] **T612** [P] [US6] Create `src/features/account/api/use-get-account-stats.ts`:
  TanStack Query hook calling `client.account.stats.$get()`.

- [ ] **T613** [P] [US6] Create `src/features/account/api/use-delete-account-data.ts`:
  TanStack mutation hook calling `client.account.data.$delete()`.
  On success invalidates `useIdentity` so the UI flips to anonymous.

### Tests for US6

- [ ] **T620** [P] [US6] `tests/integration/account-stats.test.ts`:
  - No identity → 401.
  - Seeded ORCID with 5 events → `data.lifetime.views` etc match counts.

- [ ] **T621** [P] [US6] `tests/integration/account-delete.test.ts`:
  - Seed 10 events for ORCID X.
  - DELETE → 200 with `{deleted: {user_event_rows: 10, ...}}`.
  - Second DELETE → 401 (cookie cleared) OR idempotent 200 with zero counts.
  - `revoked_orcids` has a row with `cookie_iat_min ≥ first-cookie iat`.

- [ ] **T622** [P] [US6] `tests/e2e/account-self-service.spec.ts`:
  Sign in → view articles → `/account/stats` → see numbers → `/account/data` →
  delete → reload `/account/stats` → see zeros (now anonymous, redirects to sign-in).

**Checkpoint**: All 6 user stories functional. Feature is feature-complete.

---

## Phase 9: Sidebar Metrics Merge (cross-cutting; required by SC-003)

**Purpose**: Make the sidebar `MetricCard` reflect OJS + digitopub combined totals.

- [ ] **T700** [POL] Modify `src/features/journals/server/article-detail-service.ts`:
  After the existing OJS metrics fetch (lines 311–343), add:
  ```ts
  const dpAgg = await prisma.metricsArticleMonthly.aggregate({
    where: { article_id: BigInt(article.publication_id), journal_id: BigInt(article.journal_id) },
    _sum: { views: true, downloads: true, citations: true },
  })
  views      += Number(dpAgg._sum.views      ?? 0)
  downloads  += Number(dpAgg._sum.downloads  ?? 0)
  citations  += Number(dpAgg._sum.citations  ?? 0)
  ```
  Confirm no double-count via the backfill (T701).

- [ ] **T701** [POL] Create `scripts/backfill-ojs-metrics.ts`:
  Iterates OJS `metrics_submission` totals per submission, writes one
  `metrics_article_monthly` row per article dated the day before deploy with
  `source='ojs_legacy_backfill'`. Gate behind `--confirm-once` CLI flag.
  Print summary; abort if rows already exist with that source.

- [ ] **T702** [POL] `tests/integration/sidebar-metrics-merge.test.ts`:
  Seed OJS metrics (mocked `ojsQuery`) returning `views=100`, seed
  `metrics_article_monthly` `views=20`, call `fetchArticleDetail` → `data.views = 120`.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] **T800** [POL] Update `CLAUDE.md` constitution amendment section:
  add a new H2 "Public-User Identity (UIET-P1) — what changed and why" explaining
  the ORCID-only public identity rule, the audited single OJS write path, and
  the cookie semantics. Cross-reference `specs/UIET-P1/`.

- [ ] **T801** [POL] Update `README.md` "Authentication Model" section to reflect
  ORCID-based public identity and remove the now-incorrect "no local sessions for
  public users" line.

- [ ] **T802** [POL] Run `bun run lint && bun run test --coverage` and confirm:
  - 0 ESLint errors.
  - ≥ 80 % coverage on every file in `src/lib/identity-cookie.ts`,
    `src/lib/orcid-oauth.ts`, `src/lib/orcid-state.ts`, `src/lib/consent.ts`,
    `src/lib/event-recorder.ts`, `src/lib/ip-hash.ts`, `src/lib/ojs-write-guard.ts`,
    `src/lib/identity-middleware.ts`, all new routes, and all new components.

- [ ] **T803** [POL] CI gate: add a grep step to `.github/workflows/*.yml` (or
  the existing test script) asserting zero hits for `getSession|jwtVerify` under
  `app/` excluding `app/admin/**` and under `src/server/routes/`. Fails the build
  on regression.

- [ ] **T804** [POL] Run `speckit.analyze` over `spec.md`, `plan.md`, `tasks.md`
  and resolve every CRITICAL finding before opening the PR.

- [ ] **T805** [POL] Manual QA at 360×640 viewport on all 5 new surfaces
  (consent banner, login modal, account stats page, account data page, sidebar
  metrics on article page). Capture screenshots desktop + mobile for the PR body.

- [ ] **T806** [POL] Sandbox load test: 50 concurrent ORCID callback round-trips
  via k6 or Playwright loop; assert p95 < 3 s (SC-002). If p95 > 3 s, profile
  JWKS cache hit rate and OJS query latency.

- [ ] **T807** [POL] Open PR titled `feat(UIET-P1): ORCID identity, engagement tracking, OA-aware gating`
  with body including:
  - Constitutional change explanation + link to `CLAUDE.md` diff.
  - Screenshots of all 5 UI surfaces (desktop + mobile).
  - Migration runbook with rollback plan (from `plan.md §12`).
  - List of new env vars.
  - Manual checklist of submitmanager.com changes the human must apply (separate doc).
  - Confirmation grep output proving no public route uses `getSession()` / `jwtVerify`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: T001–T004 can start immediately. T002–T004 are parallel.
- **Phase 2 (Foundation)**: Depends on Phase 1. **BLOCKS** every user story.
  - T010 → T011 → T012 are sequential (schema → migration → generate).
  - T020–T026 are parallel after T012.
  - T030–T031 depend on T020.
  - T040–T046 are parallel after their corresponding lib (T020…T026).
- **Phase 3 (US1)**: Depends on Phase 2 (specifically T012 for prisma, T024 for consent).
- **Phase 4 (US2)**: Depends on Phase 2 (T020–T026, T030) AND Phase 3 (consent banner present so we can test "anonymous user with consent cookie").
- **Phase 5 (US3)**: Depends on Phase 2 + Phase 4 (US2 mints the cookie that US3 validates).
- **Phase 6 (US4)**: Depends on Phase 2 + Phase 5 (identity layer must be stable).
- **Phase 7 (US5)**: Depends on Phase 6 (consent state must flow into recorder).
- **Phase 8 (US6)**: Depends on Phase 6 (stats query relies on data being recorded).
- **Phase 9 (Sidebar merge)**: Depends on Phase 6 (`metrics_article_monthly` must exist).
- **Phase 10 (Polish)**: Depends on all previous phases.

### Parallel opportunities

- All `[P]`-marked tasks within a phase can run in parallel (different files,
  no upstream task in the same phase).
- Across phases, US2 + US4 can begin in parallel after Phase 2 if staffed,
  with the dependency edge being that US4's metric calls in the PDF flow need
  T214's `<GatedDownloadLink>` from US2.
- US6 (P3) can be deferred to a follow-up PR if launch pressure requires;
  P1+P2 alone are deployable.

### Within each user story

- Tests for each story can be authored in parallel with implementation but MUST
  fail initially per the spec's "tests must fail before implementation" rule.
- Inside `[P]` clusters, every listed file is distinct — confirm before parallelizing.

---

## Parallel Example: Foundation (Phase 2)

```bash
# After T012 (prisma generate) completes, launch:
Task: "Create src/lib/identity-cookie.ts (T020)"
Task: "Create src/lib/orcid-state.ts (T021)"
Task: "Create src/lib/orcid-oauth.ts (T022)"
Task: "Create src/lib/ip-hash.ts (T023)"
Task: "Create src/lib/consent.ts (T024)"
Task: "Create src/lib/event-recorder.ts (T025)"
Task: "Create src/lib/ojs-write-guard.ts (T026)"

# Then in parallel:
Task: "Write tests/unit/identity-cookie.test.ts (T040)"
Task: "Write tests/unit/orcid-state.test.ts (T041)"
Task: "Write tests/unit/orcid-oauth.test.ts (T042)"
Task: "Write tests/unit/ip-hash.test.ts (T043)"
Task: "Write tests/unit/consent.test.ts (T044)"
Task: "Write tests/unit/event-recorder.test.ts (T045)"
Task: "Write tests/unit/ojs-write-guard.test.ts (T046)"
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1: Setup
2. Phase 2: Foundation
3. Phase 3: US1 — anonymous OA reading
4. **STOP and VALIDATE**: confirm OA reading and consent banner work, no
   regression on existing pages.
5. Deploy (with `UIET_P1_ENABLED=true` for OA surfaces only — non-OA gating
   stays inactive until US2 ships).

### Incremental delivery

After MVP:
- US2 + US3 ship together (P1 cohort) — non-OA gating + persistent session.
- US4 + US5 ship together (P2 cohort) — analytics + consent.
- US6 ships solo (P3) — self-service.
- Sidebar merge (Phase 9) ships with US4 since it depends on the same models.

### Parallel team strategy

With 3 developers post-Foundation:
- Dev A: US2 (Phase 4) — server routes, OJS linkage, login modal.
- Dev B: US4 (Phase 6) — metrics endpoints, client wiring.
- Dev C: US5 (Phase 7) — consent integration, force-choice flow.

US3 (Phase 5) is small enough to absorb into Dev A's stream once US2 lands.

---

## Notes

- `[P]` tasks within a phase touch different files; verify by file-path before launching parallel.
- Every task lists exact paths to make file-conflict detection mechanical.
- Tests fail first → implement → tests pass. Coverage gate: ≥ 80 % per file on every new file (see SC-008).
- Commit after each task or logical group; PR is opened only after T807.
- Stop conditions (from the original task prompt) remain in force:
  - Coverage drops below 80 % → halt.
  - Mobile layout breaks on any of the 5 surfaces → halt.
  - ORCID callback p95 > 3 s in sandbox → halt.
  - Any unintentional OJS write outside the audited backfill path → halt.
