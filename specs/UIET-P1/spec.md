# Feature Specification: ORCID Identity, Engagement Tracking & OA-Aware PDF Gating

**Feature Branch**: `claude/orcid-engagement-tracking-NCXoW`
**Feature Code**: UIET-P1
**Created**: 2026-05-12
**Status**: Draft (Phase 1)
**Input**: Add ORCID-based public-user identity, OA-aware PDF gating, engagement metric tracking, and a global consent banner. Replace the "digitopub never holds public identity" constitution clause with the new ORCID-only public identity rule.

## User Scenarios & Testing *(mandatory)*

User stories are independently testable slices. Implement them in order; each one yields a deployable MVP increment.

---

### User Story 1 — Anonymous OA reading (Priority: P1)

An anonymous reader visits an article page, reads the abstract, and opens or downloads the PDF when the article is Open Access (OA). No login is required. No identifying cookie is set.

**Why this priority**: This is the baseline reader experience. If we break it, we kill SEO traffic and lose researchers who don't want to authenticate. Every other story builds on this one. Must work before anything else ships.

**Independent Test**: Open a non-authenticated browser session, navigate to an OA article, read the abstract, click "View PDF", iframe loads, click Download — file streams down. No 401, no modal, no cookie writes other than `digitopub_consent` once the user makes a consent choice.

**Acceptance Scenarios**:

1. **Given** an OA article and an anonymous reader, **When** the reader opens the article page, **Then** abstract renders, metadata is visible, and no sign-in prompt appears.
2. **Given** an OA article and an anonymous reader, **When** the reader clicks "View PDF", **Then** the PDF iframe loads without a login modal.
3. **Given** an OA article and an anonymous reader, **When** the reader clicks Download in the PDF toolbar, **Then** the file streams down with `Content-Disposition: attachment` and no auth challenge.
4. **Given** an anonymous reader who has never made a consent choice, **When** they land on any page, **Then** the consent banner renders within 1 s of first paint.

---

### User Story 2 — Non-OA gated download with ORCID sign-in (Priority: P1)

An anonymous reader tries to view or download a PDF for a non-OA (subscription / restricted) article. A login modal appears with a "Sign in with ORCID" button. After completing the ORCID OAuth flow, they return to the same article with the PDF now opening.

**Why this priority**: Without gating, subscription journals cannot monetize. This is the only story that *requires* identity, so it forces the auth pipeline to work end-to-end on the most contained surface possible.

**Independent Test**: Anonymous user → click View PDF on a non-OA article → modal appears → click "Sign in with ORCID" → mocked ORCID returns code → callback sets `digitopub_identity` cookie → redirects back to article → PDF loads. No regression on the OA path.

**Acceptance Scenarios**:

1. **Given** a non-OA article and an anonymous reader, **When** they click "View PDF", **Then** a modal with the ORCID sign-in CTA appears instead of opening the PDF.
2. **Given** a non-OA article and an anonymous reader, **When** they click "Download", **Then** the same modal appears.
3. **Given** a non-OA article and a reader with a valid identity cookie, **When** they click "View PDF" or "Download", **Then** the PDF action proceeds without a modal.
4. **Given** a non-OA article and an anonymous reader, **When** they hit `/api/pdf-proxy?...` directly (bypassing the UI), **Then** the proxy returns 401 with a `WWW-Authenticate: orcid` header.
5. **Given** a successful ORCID callback, **When** the callback handler runs, **Then** the response redirects to the original article URL preserved in OAuth `state`.

---

### User Story 3 — Persistent ORCID session with sliding expiry (Priority: P1)

A researcher signs in once with ORCID. For the next 30 minutes of inactivity (sliding) and up to 8 hours of activity (absolute), they remain signed in across page loads.

**Why this priority**: If sign-in doesn't persist, US-2 is so painful that users will abandon. P1 because it directly supports US-2 — these two ship together.

**Independent Test**: Sign in, close the tab, reopen the same article within 30 min — still signed in. Wait 31 min, reload — signed out. Stay active for 7 h 59 min then reload — still signed in. Wait until hour 9 — signed out regardless of recent activity.

**Acceptance Scenarios**:

1. **Given** a freshly signed-in reader, **When** they reload the page within 30 min of the last activity, **Then** their identity is still recognized.
2. **Given** a signed-in reader, **When** they perform an action 25 min after the last one, **Then** the cookie's sliding expiry is refreshed to 30 min from now.
3. **Given** a signed-in reader, **When** more than 30 min pass with no activity, **Then** the next page load shows them as anonymous.
4. **Given** a signed-in reader who signed in 8 h 1 min ago, **When** they reload, **Then** they are anonymous regardless of recent activity.
5. **Given** any signed-in reader, **When** their cookie HMAC fails verification, **Then** the cookie is cleared and they are treated as anonymous.

---

### User Story 4 — Engagement events attributed to ORCID (Priority: P2)

A signed-in researcher reads articles, views PDFs, downloads files, and exports citations. Each action is recorded in the engagement log with their ORCID iD attached. The same actions by an anonymous reader are also recorded but attributed to a daily-rotating IP hash, not an ORCID.

**Why this priority**: This is the analytics payload — the business reason for the whole feature. P2 because P1s must ship first; this story has no user-visible behavior beyond what's already in P1, but it powers `/account/stats` and journal-level analytics.

**Independent Test**: Sign in, view an article, view the PDF, copy the citation, export `.ris`. Query `user_event` — see exactly four rows with the matching ORCID. Sign out, repeat — see four more rows with `orcid=NULL` and the daily IP hash. Repeat the view within 24 h — no duplicate view row. Repeat the download within 30 s — no duplicate. Repeat the citation export — yes, duplicate (no dedup).

**Acceptance Scenarios**:

1. **Given** a signed-in reader, **When** they open an article page, **Then** one `user_event` row is written with `event_type='view'`, `source='article_page'`, `orcid` set.
2. **Given** the same reader and the same article on the same UTC day, **When** they also open the PDF, **Then** no second view row is written (global dedup across sources).
3. **Given** a signed-in reader, **When** they click Download, **Then** one `user_event` row is written with `event_type='download'`. A second click within 30 s writes no second row.
4. **Given** any reader, **When** they click "Copy citation" or "Export .ris", **Then** one `user_event` row is written with `event_type='citation_export'`. Repeats are NOT deduped.
5. **Given** an anonymous reader, **When** any of the above events fire, **Then** `orcid` is NULL and `ip_hash` is populated with the day's salted hash.

---

### User Story 5 — Global consent banner (Priority: P2)

Any first-time visitor sees a consent banner with three buttons: Accept all / Essential only / Customize. The choice is stored in a 1-year `digitopub_consent` cookie and respected on every page. Users who dismiss without choosing are tracked anonymously for the first 30 days; on day 31 the banner becomes modal.

**Why this priority**: GDPR/ePrivacy compliance baseline. P2 because the metric pipeline (US-4) is fully functional without it, but we must not flip the metric pipeline on in production until consent is honored.

**Independent Test**: Fresh browser → banner visible at bottom on desktop, as bottom sheet on mobile → click "Essential only" → reload → banner gone, cookie set with `choice=essential_only` → fire a view event → see `user_event` row with `source='essential_only'`, `ip_hash=NULL`, `ua_hash=NULL`. New browser → dismiss banner without choosing → cookie stores dismiss count → on 31st visit the banner forces a choice.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** the page loads, **Then** the consent banner is rendered above all other content (fixed footer / bottom sheet on mobile).
2. **Given** the consent banner, **When** the user clicks "Accept all", **Then** the cookie is set to `choice=all`, banner is dismissed, and subsequent metric writes include `ip_hash` and `ua_hash`.
3. **Given** the consent banner, **When** the user clicks "Essential only", **Then** subsequent metric writes use `source='essential_only'` with `ip_hash=NULL`, `ua_hash=NULL`.
4. **Given** a user who dismissed the banner without choosing, **When** they navigate during the 30-day grace, **Then** events are written with `source='pre_consent'`, `orcid=NULL`, `ip_hash=NULL`, `ua_hash=NULL`.
5. **Given** a user who dismissed the banner 31 times without choosing, **When** they next visit, **Then** the banner blocks interaction until a choice is made.
6. **Given** any user, **When** they click "Customize", **Then** a sub-panel exposes individual toggles for `analytics`, `personalization`, and stores the granular choice in `digitopub_consent`.

---

### User Story 6 — Account self-service: stats and data deletion (Priority: P3)

A signed-in reader can visit `/account/stats` to see their own engagement (articles read, PDFs viewed, downloads, citations exported) and `/account/data` to delete all of it.

**Why this priority**: GDPR Article 17 (right to erasure) — required for compliance but not blocking launch if we can prove the data can be removed manually on request. P3 because pre-launch we can satisfy DSARs by hand; long-term self-service is much better.

**Independent Test**: Sign in, view a few articles, navigate to `/account/stats`, see at least one row in each metric. Navigate to `/account/data`, click "Delete my engagement data", confirm — `user_event` rows with matching ORCID are wiped, `user_metrics` row is deleted, sliding-expiry cookie is revoked. Future events from the same ORCID start fresh.

**Acceptance Scenarios**:

1. **Given** a signed-in reader with at least one recorded view, **When** they visit `/account/stats`, **Then** their lifetime totals render in cards plus a 12-month chart.
2. **Given** an anonymous visitor, **When** they navigate to `/account/stats`, **Then** they are redirected to the sign-in modal.
3. **Given** a signed-in reader, **When** they click "Delete my engagement data" and confirm, **Then** all rows in `user_event` and `user_metrics` matching their ORCID are removed, their identity cookie is revoked, and an audit row is written.
4. **Given** a deletion request just completed, **When** the same ORCID signs in again, **Then** their stats page shows zeros and a fresh attribution starts.

---

### Edge Cases

- **Cookie tampering**: signed cookie with modified payload → `verifyCookie` returns `null` → user is anonymous; no error to user.
- **ORCID returns minimal scope**: callback succeeds but `name` field is absent → cookie stores `name=null`, UI falls back to "Signed in" label.
- **ORCID API outage**: callback returns 5xx from ORCID → user sees "Sign-in temporarily unavailable; please retry" with a return-to-article fallback link. JWKS cache (24h with 1h SWR) still serves verification.
- **Clock skew**: server clock is ±2 min off from client/ORCID → identity cookie verifier accepts ±2 min slack on `iat` and `exp_sliding`/`exp_absolute`.
- **OJS user matched by email but `disabled=1`**: backfill detects disabled flag → digitopub login is blocked with "This account has been disabled. Please contact support." → no cookie minted.
- **Disabled JS / fetch failures**: metric write to `/api/metrics/events/*` fails silently; UI flow is never blocked. PDF view, download, citation export all proceed regardless of metric outcome.
- **Replay of OAuth `state`**: callback receives a previously consumed state → 400 with "Invalid or expired sign-in session." Always force a fresh `/api/auth/orcid/start`.
- **Rate limit exceeded** on `/api/auth/orcid/callback` (10/min/IP): 429 with retry-after; UI shows "Too many sign-in attempts, please wait a moment."
- **Multiple ORCID accounts for one human**: the most recent ORCID iD wins for the cookie. We do not attempt to merge histories. Documented as a known P1 limitation.
- **Browser blocks third-party cookies**: identity cookie is first-party (`digitopub.com`), so no impact.

---

## Requirements *(mandatory)*

Requirements are TESTABLE and ranked P1/P2/P3. P1 must ship together; P2 ships in the same PR if time permits, otherwise immediately after; P3 may ship in a follow-up.

### Functional Requirements

#### Identity (P1)

- **FR-001 (P1)**: The system MUST mint an HMAC-signed `digitopub_identity` cookie on successful ORCID OAuth callback. Cookie payload MUST contain `{orcid, ojs_user_id_or_null, email_hash, iat, exp_sliding, exp_absolute, version: 1}`.
- **FR-002 (P1)**: The cookie MUST be sent with flags `httpOnly; Secure; SameSite=Lax; Path=/`. No `Domain` attribute (host-only on `digitopub.com`).
- **FR-003 (P1)**: `verifyCookie(value)` MUST reject cookies whose HMAC fails or whose `exp_absolute` is in the past (with ±2 min skew tolerance). It MUST refresh `exp_sliding` to `now + 30 min` when validation succeeds and `exp_sliding < now + 5 min`.
- **FR-004 (P1)**: Sliding expiry MUST be 30 minutes. Absolute expiry MUST be 8 hours from `iat`. Both MUST be enforced server-side; the cookie's stated expiries MUST be re-validated against the payload.
- **FR-005 (P1)**: The system MUST NEVER read, write, or store user passwords. ORCID is the sole identity provider for public users.

#### ORCID OAuth (P1)

- **FR-006 (P1)**: `GET /api/auth/orcid/start` MUST construct an ORCID authorize URL with `response_type=code`, `client_id={ORCID_CLIENT_ID}`, `scope=/authenticate`, `redirect_uri={ORCID_REDIRECT_URI}`, `state={one-time HMAC token}`, and redirect to it.
- **FR-007 (P1)**: The state token MUST be a signed token containing `{nonce, exp: now+10min, return_url}`, stored in a separate cookie `digitopub_oauth_state` (`httpOnly; Secure; SameSite=Lax; Path=/api/auth/orcid`). The callback MUST verify and consume the state; reused state MUST be rejected with 400.
- **FR-008 (P1)**: `GET /api/auth/orcid/callback` MUST exchange the `code` for `{access_token, orcid, name}` against ORCID's token endpoint, verify `iss === 'https://orcid.org'` on the ID token, set the identity cookie, and redirect to the `return_url`.
- **FR-009 (P1)**: ORCID JWKS MUST be cached for 24 h with 1 h stale-while-revalidate.
- **FR-010 (P1)**: `/api/auth/orcid/callback` MUST be rate-limited to 10 requests/minute/IP.
- **FR-011 (P1)**: `POST /api/auth/orcid/logout` MUST clear `digitopub_identity` and `digitopub_oauth_state`. It MUST NOT touch the admin `auth_token` cookie.
- **FR-012 (P1)**: `GET /api/auth/orcid/whoami` MUST return `{orcid, name|null, ojs_user_id|null, exp_sliding, exp_absolute}` for a valid cookie, or `{authenticated: false}` for an absent/invalid one.
- **FR-013 (P2)**: `POST /api/auth/orcid/refresh` MUST, if within 5 min of `exp_sliding` and absolute expiry not yet reached, re-mint the cookie with `exp_sliding = now + 30 min`.

#### OJS linkage (P1)

- **FR-014 (P1)**: On a successful first ORCID callback, the system MUST query OJS `user_settings` where `setting_name='orcid'` for a row matching the ORCID iD. If found, `ojs_user_id` MUST be stored in the cookie payload.
- **FR-015 (P1)**: If no ORCID match is found, the system MAY query OJS `users.email` for the ORCID-provided email (when present). If matched, `ojs_user_id` MUST be stored in the cookie payload.
- **FR-016 (P1)**: When `ENABLE_ORCID_OJS_BACKFILL=true` AND an email match is found AND no existing ORCID row exists for the OJS user, the system MUST INSERT INTO OJS `user_settings` `{user_id, locale='', setting_name='orcid', setting_value=<orcid>}`. This is the only write to OJS digitopub ever performs.
- **FR-017 (P1)**: `ENABLE_ORCID_OJS_BACKFILL` MUST default to `false` in production and `true` in development.
- **FR-018 (P1)**: Every OJS write MUST also write to `audit_ojs_writes` `{timestamp, orcid, ojs_user_id, performed_by_request_id, success}`. A failure of the OJS write MUST be logged but MUST NOT fail the user's login.
- **FR-019 (P1)**: If the matched OJS user has `disabled=1`, login MUST be blocked with "This account has been disabled. Please contact support." and no cookie minted.

#### OA-aware gating (P1)

- **FR-020 (P1)**: PDF view (modal open) MUST be allowed when `article.isOpenAccess === true` regardless of identity.
- **FR-021 (P1)**: PDF view MUST require a valid identity cookie when `article.isOpenAccess === false`.
- **FR-022 (P1)**: PDF download (toolbar, mobile fallback, error-state retry) MUST follow the same rule as view: open when OA, gated when not.
- **FR-023 (P1)**: `/api/pdf-proxy` MUST verify the identity cookie and reject non-OA requests with 401 and `WWW-Authenticate: orcid`. The `(submissionId, galleyId) → isOpenAccess` map MAY be cached for 5 min.
- **FR-024 (P1)**: Abstract reading and citation export MUST NEVER be gated.

#### Engagement events (P2)

- **FR-025 (P2)**: `POST /api/metrics/events/view` MUST accept `{article_id, journal_id, source: 'article_page'|'pdf_view'}` and write a `user_event` row.
- **FR-026 (P2)**: `POST /api/metrics/events/download` MUST accept `{article_id, journal_id, galley_id}` and write a `user_event` row with `event_type='download'`.
- **FR-027 (P2)**: `POST /api/metrics/events/citation` MUST accept `{article_id, journal_id, format, action}` and write a `user_event` row with `event_type='citation_export'`.
- **FR-028 (P2)**: All three endpoints MUST attribute the event to the identity cookie's ORCID when present, otherwise to the daily-rotating IP hash.
- **FR-029 (P2)**: View dedup key: `(article_id, COALESCE(orcid, ip_hash), DATE(created_at UTC))`. Repeats within the same UTC day MUST be a no-op write (HTTP 200, `deduped: true`).
- **FR-030 (P2)**: Download dedup key: `(article_id, galley_id, COALESCE(orcid, ip_hash))` with a 30 s window. Repeats inside the window MUST be a no-op.
- **FR-031 (P2)**: Citation export MUST NOT be deduped.
- **FR-032 (P2)**: All three endpoints MUST be rate-limited to 60 req/min/IP and 600 req/hour/IP.

#### IP hashing (P2)

- **FR-033 (P2)**: `ip-hash.ts` MUST produce `SHA-256(salt || ip)` where `salt = HMAC(EVENT_IP_HASH_SALT_SEED, YYYY-MM-DD UTC)`. The same IP on different days MUST produce different hashes.

#### Consent banner (P2)

- **FR-034 (P2)**: First-time visitors MUST see the consent banner within 1 s of first paint.
- **FR-035 (P2)**: The banner MUST offer three actions: "Accept all", "Essential only", "Customize". The result MUST be stored in `digitopub_consent` (1-year expiry, `SameSite=Lax`, host-only).
- **FR-036 (P2)**: When `choice=all`, metric writes MUST include `ip_hash` and `ua_hash`. When `choice=essential_only`, both MUST be NULL and `source='essential_only'`.
- **FR-037 (P2)**: When the banner is dismissed without choosing, the cookie MUST record dismiss count and first dismiss date. During the 30-day grace, metric writes MUST have `source='pre_consent'`, `orcid=NULL`, `ip_hash=NULL`, `ua_hash=NULL`.
- **FR-038 (P2)**: After 31 dismissals without a choice, the banner MUST become modal (cannot be dismissed without a button click).

#### Retention & aggregation (P2)

- **FR-039 (P2)**: `user_event` rows MUST be retained for 18 months. A scheduled job MUST hard-delete older rows.
- **FR-040 (P2)**: A nightly job MUST aggregate the previous UTC day's `user_event` rows into `metrics_article_daily` `{article_id, journal_id, day, views, unique_views, downloads, unique_downloads, citations}`.
- **FR-041 (P2)**: A monthly job MUST roll daily into `metrics_article_monthly`. Both daily and monthly aggregates MUST be retained indefinitely.
- **FR-042 (P2)**: `user_metrics` MUST hold lifetime per-ORCID totals `{orcid, views, downloads, citations, last_event_at}`.

#### Sidebar metrics merge (P2)

- **FR-043 (P2)**: `article-detail-service.ts` MUST return view/download/citation counts that are the SUM of OJS `metrics_submission` totals AND digitopub `metrics_article_monthly` totals.
- **FR-044 (P2)**: A one-time backfill script `scripts/backfill-ojs-metrics.ts` MUST insert OJS's current cumulative totals into `metrics_article_monthly` as a single row dated the day before deploy with `source='ojs_legacy_backfill'`, gated behind a `--confirm-once` flag.

#### Account self-service (P3)

- **FR-045 (P3)**: `GET /api/account/stats` MUST return lifetime and 12-month totals for the signed-in ORCID. 401 if no identity.
- **FR-046 (P3)**: `DELETE /api/account/data` MUST hard-delete every `user_event` and `user_metrics` row for the signed-in ORCID, upsert a `revoked_orcids` row (revoking the identity cookie), write an audit row, and clear the `digitopub_identity` cookie via `Set-Cookie`. The endpoint MUST return HTTP 200 with body `{success: true, deleted: {user_event_rows, user_metrics_rows, user_orcid_links_rows}}` as defined by `contracts/account.yaml`.
- **FR-047 (P3)**: `/account/stats` and `/account/data` MUST redirect anonymous visitors to the ORCID sign-in modal with `return_url` set.

#### Mobile (P1)

- **FR-048 (P1)**: All new UI surfaces MUST render correctly at 360×640 viewport without horizontal overflow. The login modal MUST render as a full-screen drawer at ≤640 px.

### Key Entities

- **UserEvent**: One row per engagement action. Attributes: `id`, `orcid (nullable)`, `ip_hash (nullable)`, `ua_hash (nullable)`, `article_id`, `journal_id`, `event_type` ∈ {view, download, citation_export}, `source`, `event_meta (JSON)`, `created_at`. Dedup keys enforced via DB uniqueness.
- **MetricsArticleDaily**: One row per `(article_id, day)`. Sums of events plus unique-by-identity counts.
- **MetricsArticleMonthly**: One row per `(article_id, year, month)`. Sums of daily rows.
- **UserMetrics**: One row per ORCID. Lifetime totals updated by the nightly aggregation job.
- **RevokedOrcids**: ORCIDs whose data has been deleted via `/account/data`. Prevents re-creation by stale identity cookies.
- **UserOrcidLinks**: digitopub-side mapping of `(orcid → ojs_user_id)` so backfill matching results survive cookie clears. Independent of the OJS database.
- **AuditOjsWrites**: Audit log of every write digitopub has performed against the OJS database. Append-only.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An anonymous reader can read an OA article and view + download its PDF in under 3 seconds end-to-end on a 4G connection.
- **SC-002**: ORCID sign-in round-trip (click → callback → return to article) completes within 3 seconds p95 in sandbox load testing (50 concurrent sessions).
- **SC-003**: The sidebar `MetricCard` shows non-zero counts for at least 95 % of published articles within 24 h of deploy (provided the OJS backfill ran).
- **SC-004**: After 7 days of production traffic, at least 60 % of distinct visitors have a `digitopub_consent` cookie set with a choice (i.e., banner dismiss rate < 40 %).
- **SC-005**: `/account/data` deletion completes within 2 seconds for an ORCID with up to 10 000 `user_event` rows.
- **SC-006**: Zero unintentional writes to the OJS database, verified by `audit_ojs_writes` matching the count of intentional ORCID backfills.
- **SC-007**: All 5 new UI surfaces (consent banner, login modal, account stats, account data, sidebar metrics on article page) pass manual QA at 360×640 with no overflow and all primary actions reachable without horizontal scroll.
- **SC-008**: Coverage on new files (`identity-cookie.ts`, `orcid-oauth.ts`, `consent.ts`, `event-recorder.ts`, `ip-hash.ts`, new routes, new components) ≥ 80 %.
- **SC-009**: Zero `getSession()` or `jwtVerify` calls introduced in any public route (verified by repo grep in CI gate).
- **SC-010**: After P1 ships, the OJS database receives writes ONLY from the feature-flagged ORCID backfill path, verifiable by `audit_ojs_writes` covering 100 % of writes observed in OJS binlogs.
