# UIET-P1 — Phase 0 Analysis

> **Feature**: ORCID-Based Identity, Engagement Tracking, and OA-Aware PDF Gating
> **Branch**: `claude/orcid-engagement-tracking-NCXoW`
> **Date**: 2026-05-07
> **Phase**: 0 (read-only analysis; no code emitted)

This document maps the **current** auth/session, PDF, citation, and view-counting surfaces in the codebase before we introduce the ORCID-based public-user identity, the consent banner, and the engagement-tracking pipeline. Phases 1–4 must not begin until the **Open Questions** section below is resolved with the human reviewer.

---

## 1. Auth/Session Map

The constitution says digitopub holds **only** admin authentication. The audit confirms that today — every `getSession()` / `requireAuth` / `requireAdmin` / `jwtVerify` call site is admin-scoped. The new ORCID identity cookie (`digitopub_identity`) will be parallel to, and never confused with, the admin `auth_token` JWT.

### 1.1 Admin auth helpers (definitions — keep as-is)

| File | Symbol | Role |
|---|---|---|
| `src/lib/db/auth-edge.ts:4-23` | `getJwtSecret()` | Loads `JWT_SECRET` env, fails loud in production |
| `src/lib/db/auth-edge.ts:34-56` | `createSession(user)` | Mints `auth_token` httpOnly JWT cookie (admin only) |
| `src/lib/db/auth-edge.ts:58-78` | `getSession()` | Reads `auth_token` cookie, returns admin `User` or null |
| `src/lib/db/auth-edge.ts:80-83` | `destroySession()` | Clears `auth_token` cookie |
| `src/lib/db/auth.ts:4-11` | `verifyAdmin(userId)` | Confirms role in `admin_users` table |
| `src/lib/auth-middleware.ts:9-19` | `requireAuth` Hono middleware | 401 if no admin session |
| `src/lib/auth-middleware.ts:25-38` | `requireAdmin` Hono middleware | 401/403 if not admin/superadmin |
| `src/lib/auth-middleware.ts:43-61` | `requireRole(...roles)` | Generic role guard |

**Decision**: All of the above stay untouched. The new file `src/lib/identity-cookie.ts` will provide a sibling `getIdentity(request)` API that returns `{orcid, ojs_user_id} | null` from a separate cookie, with no shared code paths.

### 1.2 Call-site categorization

Total call sites grep'd: **92** across `src/` and `app/`. Categorized below.

#### Category (a) — admin-only, keep as-is (NO CHANGE NEEDED)

All admin Hono routes use `requireAdmin` correctly. Listed for completeness:

| File | Lines | Notes |
|---|---|---|
| `src/features/journals/server/route.ts` | 44 (`/debug-covers`), 717 (`POST /`), 757 (`PATCH /:id`), 796 (`DELETE /:id`) | Mutating journal admin routes |
| `src/features/messages/server/route.ts` | 24, 46, 93, 127 | All admin-only |
| `src/features/email-templates/server/route.ts` | 34, 66, 77, 116, 137, 195, 278, 305, 355 | All admin-only |
| `src/features/billing/server/route.ts` | 33, 125, 144, 215, 226, 248, 277 | All admin-only |
| `src/features/solutions/server/route.ts` | 68 (`POST /`), 94 (`PATCH /:id`), 130 (`DELETE /:id`) | Mutating only; `requireAdmin` |
| `src/features/help/server/route.ts` | 38 | Admin-only |
| `src/features/help/server/help-categories.ts` | 76, 107, 141 | Admin-only |
| `src/features/help/server/help-topics.ts` | 45, 76, 110, 131 | Admin-only |
| `src/features/about/server/route.ts` | 26 (`/admin`), 45, 82, 130, 152 | Admin-only |

#### Category (a, admin server pages) — keep as-is

These are admin route pages, all behind the middleware admin gate:

- `app/admin/dashboard/page.tsx:10`
- `app/admin/journals/page.tsx:12`
- `app/admin/submissions/page.tsx:154`
- `app/admin/submissions/[id]/page.tsx:12`
- `app/admin/messages/page.tsx:13`
- `app/admin/messages/[id]/page.tsx:15`
- `app/admin/authors/page.tsx:8`
- `app/admin/settings/page.tsx:10`
- `app/admin/pricing/page.tsx:6`
- `app/admin/analytics/page.tsx:8`

#### Category (a, middleware) — keep as-is

- `middleware.ts:27` — admin login redirect-if-already-authed (uses `jwtVerify`).
- `middleware.ts:50` — protects `/admin/*` routes (uses `jwtVerify`).
- `src/lib/db/auth-edge.ts:67` — `getSession()` internal `jwtVerify` call.

#### Category (a, public route reading admin session for staff-preview) — keep as-is, FLAGGED

| File | Line | What it does |
|---|---|---|
| `src/features/solutions/server/route.ts` | 21, 48 | Public `GET /solutions[/:id]` calls `getSession()`. If the caller is an admin, drafts are included; otherwise only `is_published: true` rows are returned. |

**Why this is fine even under the new constitution**: anonymous public callers still get `getSession() === null` → `is_published`-only path. Admins get the full set. No public user identity is ever consulted here. We will leave this code untouched.

#### Category (a, auth feature routes themselves)

`src/features/auth/server/route.ts` is the admin auth router:
- Line 259 (`GET /api/auth/me`) — admin-only "current user" endpoint. Keep.
- Plus `POST /login`, `POST /verify-code`, `POST /resend-code`, `POST /logout`. All admin-scoped.

We will mount the **new** ORCID public-user routes under a sibling base path: `/api/auth/orcid/start`, `/api/auth/orcid/callback`, `/api/auth/whoami`, `/api/auth/logout` (the public logout). These must not collide with the admin `POST /api/auth/logout`. **Open question O-3 below covers this.**

#### Category (b) — public route incorrectly using session (FIX)

**None found.** The current codebase is constitution-compliant on this axis. No public route checks `getSession()` to decide what to render or whether to allow the action.

#### Category (c) — new code we will add

| New file | Purpose |
|---|---|
| `src/lib/identity-cookie.ts` | `mintCookie`, `verifyCookie`, `getIdentity(request)` — handles `digitopub_identity` cookie (HMAC-signed, sliding+absolute expiry) |
| `src/lib/orcid-oauth.ts` | `buildAuthorizeUrl`, `exchangeCode`, `verifyOrcidToken` |
| `src/lib/consent.ts` | `getConsent`, `setConsent` for the `digitopub_consent` cookie |
| `src/lib/event-recorder.ts` | `recordEvent({...})` with idempotency rules |
| `src/lib/ip-hash.ts` | Daily-rotating salted SHA-256 IP hash |
| `src/server/routes/auth-orcid.ts` | OAuth start/callback + `whoami` + public logout |
| `src/server/routes/metrics.ts` | `POST /metrics/view`, `/metrics/download`, `/metrics/citation` |
| `src/server/routes/account.ts` | `GET /account/stats`, `DELETE /account/data` |

**Design rule**: `getIdentity(request)` is the **only** new helper that any feature code calls. It must never invoke `getSession()` or vice-versa, and the two cookies must have entirely different names, secrets, and verification code paths.

### 1.3 Tests that mock `getSession`

- `tests/integration/api-routes.test.ts:16` — mocks `getSession`. Will continue to pass; new public routes don't touch it.
- `tests/integration/security-auth.test.ts:27` — mocks `getSession`. Same.

We will add new test files for the identity cookie, ORCID flow, metrics, and consent without modifying these.

---

## 2. PDF Render / Download Sites

The prompt confirmed `modal-pdf-viewer.tsx` and `pdf-modal-overlay.tsx`. The audit found **two** additional surfaces.

### 2.1 Confirmed surfaces

| File | Lines | Surface |
|---|---|---|
| `app/journals/[id]/articles/[publicationId]/components/modal-pdf-viewer.tsx` | 17–109 | Article-detail sidebar trigger button → opens overlay |
| `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx` | 159–162 | Toolbar **New Tab** anchor (`<a target="_blank">`) |
| `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx` | 164–174 | Toolbar **Download** anchor (`<a download target="_blank">`) |
| `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx` | 250–262 | Loading-state "Open in a new tab" link |
| `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx` | 297–308 | Error-state **Open in new tab** retry link |
| `app/journals/[id]/articles/[publicationId]/components/pdf/pdf-modal-overlay.tsx` | 326–346 | Mobile fallback **Open in Browser** + **Download PDF** |

### 2.2 Additional surfaces found

| File | Lines | Surface |
|---|---|---|
| `app/journals/[id]/components/article-item.tsx` | 180–186 | Card-style PDF trigger inside the journal listing page (uses the same `<ModalPdfViewer>` with `triggerStyle="card"`). Gating in `usePdfModal.openModal` covers it. |
| `app/journals/[id]/articles/[publicationId]/components/article-sidebar.tsx` | 47–52 | Sidebar embedding of `<ModalPdfViewer>` for the article detail page (already in scope). |
| `app/api/pdf-proxy/route.ts` | entire file | Server-side same-origin proxy. **Defense-in-depth**: must also enforce gating server-side for non-OA galleys when the identity cookie is missing — otherwise a copy-pasted proxy URL would bypass the client-side modal. **Open question O-2 below.** |

### 2.3 Where to gate

The prompt says: *"In `pdf-modal-overlay.tsx`, wrap each download `<a>` with `useGatedAction`."* That covers all four surfaces inside the overlay. Plus:

- **View PDF trigger**: gate inside `openModal` in `usePdfModal.ts` so the modal itself does not open on a non-OA article without identity. (The prompt's `use-gated-action.ts` description includes "wraps PDF view, download, and (no-op for) citation export.")
- **Server-side proxy**: gate inside `app/api/pdf-proxy/route.ts` for non-OA articles. The proxy currently has no view-of-access concept; it would need to look up the publication's `access_status` to decide. **Open question O-2.**

The OA flag arrives via the `isOpenAccess` prop, which is sourced from `article-detail-service.ts:347` (`isOpenAccessStatus(article.access_status)`). Open access = issue access_status === 1 (`ISSUE_ACCESS_OPEN`).

---

## 3. Citation Export / Copy Sites

### 3.1 Confirmed

| File | Function | Lines | Behavior |
|---|---|---|---|
| `app/journals/[id]/articles/[publicationId]/components/citation-box.tsx` | `handleCopy` | 48–73 | Copies HTML+plaintext or just plaintext to clipboard |
| `app/journals/[id]/articles/[publicationId]/components/citation-box.tsx` | `handleExport` | 75–94 | Downloads `.ris` / `.bib` / `.txt` blob |

### 3.2 Other "copy" hits — out of scope

| File | What it copies | In scope? |
|---|---|---|
| `app/journals/[id]/components/archive-section.tsx:104` | Issue page URL (deep-link share) | ❌ No — not a citation. |

### 3.3 Where to fire `POST /api/metrics/citation`

In `handleCopy` (after successful clipboard write) and in `handleExport` (after `URL.createObjectURL`). Pass `{article_id, journal_id, format}`. **No gating** — citation export is always anonymous-allowed per the spec.

---

## 4. Article View Counting

The prompt asks us to confirm or propose: *"inside `usePdfModal` when `probeState === 'ready' && loaded === true`."*

### 4.1 Recommendation — DO BOTH

We propose **two distinct view event types**, distinguished by `source`:

| Event | When fired | Where | `source` |
|---|---|---|---|
| **Article page view** | On mount of `ArticlePageClient` (or after the data is hydrated) | `app/journals/[id]/articles/[publicationId]/components/article-page-client.tsx` | `"article_page"` |
| **PDF view** | When `probeState === 'ready' && loaded === true` for the first time per modal-open cycle | `usePdfModal.ts` (new effect, ref-guarded) | `"pdf_view"` |

The prompt language describes one `POST /api/metrics/view`; both call into it but tag the event with different `source` strings. Idempotency rule from the prompt — *"view = once per user-or-iphash per article per day"* — applies on the server side regardless of `source`, so abstract-read + PDF-view of the same article on the same day count as **one** view (with the highest-fidelity source kept). **Open question O-1 below covers whether to dedup across sources or per-source.**

### 4.2 Implementation note for `usePdfModal`

The condition `probeState === 'ready' && loaded === true` can flip true multiple times (initial load + retry). We must guard with a `viewFiredRef` that resets on `closeModal` so each modal-open cycle fires at most once.

---

## 5. NEEDS CLARIFICATION

The following items must be resolved before proceeding to Phase 1.

### O-1 — View dedup across sources

The prompt says: *"view = once per user-or-iphash per article per day"*. We are proposing two event sources (`article_page` and `pdf_view`). **Question**: Should the daily dedup key be `(article_id, identity_or_ip)` regardless of source, or `(article_id, identity_or_ip, source)`? Recommended: deduplicate **across sources** (one logical "view per day"), with `source` stored as the *highest-fidelity* observation (PDF beats abstract). This matches how COUNTER and most analytics tools count.

### O-2 — Server-side enforcement on `/api/pdf-proxy`

Client-side gating in `useGatedAction` blocks the UI but does not block a copy-pasted `/api/pdf-proxy?...` URL. **Question**: Should the proxy itself reject non-OA requests when the identity cookie is missing/invalid? Recommended: **yes**, return 401 with a JSON error pointing to the ORCID start URL. This requires the proxy to look up the publication's access_status (currently it does not), which adds one OJS query per request. Acceptable cost; we can cache the `(submissionId,galleyId) → isOpenAccess` mapping for 5 min.

### O-3 — Path collision: `POST /api/auth/logout`

The admin auth router already exposes `POST /api/auth/logout` at `src/features/auth/server/route.ts` (the admin "destroy session" endpoint). The plan says we add `POST /api/auth/logout` for the **public** ORCID identity. **Question**: How do we distinguish? Recommended: keep admin under `POST /api/auth/logout` (as-is), and use `POST /api/auth/orcid/logout` for the public identity (clears `digitopub_identity` only). Alternative: a single `POST /api/auth/logout` that clears whichever cookies are present. Recommended path is the namespaced one — clearer ownership, simpler tests, no risk of an admin call clearing the public cookie or vice-versa.

### O-4 — OJS write feature flag default

The plan says we may write to OJS `user_settings` to backfill the ORCID iD when matched by email. Default state of the feature flag? Recommended: **OFF in production until a human op explicitly enables it**, and **OFF in tests** unless the test enables it. The plan explicitly calls out *"this is the only OJS write digitopub ever performs; gate behind a feature flag and log every write."* Confirming default OFF.

### O-5 — Identity cookie name & scope

Plan calls it `digitopub_identity`. Cookie domain: `Domain` not specified. **Question**: Should the cookie be `Domain=.digitopub.com` (so OJS subdomains can read it) or scoped to `digitopub.com` only? Recommended: **scope to `digitopub.com` only** (do not set `Domain`). OJS lives at `submitmanager.com` (different registrable domain), so a `.digitopub.com` `Domain` flag offers no benefit and slightly widens attack surface.

### O-6 — Consent gating of metric writes

The plan says: *"Essential-only mode still allows metric writes but with `source='essential_only'` and no `ip_hash`/`ua_hash` (full anonymization)."* **Question**: For users who **decline** all (i.e., neither Accept-all nor Essential-only — they actively close the banner without choosing)? Recommended: treat unchosen state as Essential-only by default after 30 days of dismissal, but during the first 30 days fire **no** metric writes for that visitor. We need explicit confirmation.

### O-7 — `views_count` / `downloads_count` columns on `published_articles`

The Prisma schema has `views_count`, `downloads_count`, `citations_count` columns on `published_articles`. **Question**: Are these still being written anywhere? Audit found no writers (only readers in `article-detail-service.ts` indirectly via OJS `metrics_submission`). Plan adds parallel digitopub aggregates. Recommendation: **leave the columns** for now (some admin pages may read them); do not write to them; new aggregates live in `metrics_article_daily` / `metrics_article_monthly`.

### O-8 — `MetricCard` math: sum vs. union

`article-sidebar.tsx:75-85` currently shows OJS counts only (`article.citations`, `article.downloads`). Plan says: *"`MetricCard` should sum digitopub's `metrics_article_monthly` totals + OJS's existing `metrics_submission` totals."* **Question**: For a returning visitor who is signed in *and* has the identity cookie *and* whose action also caused an OJS-side metric (because OJS counts the underlying file fetch), do we double-count? Recommended: **yes, we accept double-counting** in P1, with a known-issues entry in the PR body. A "no-double-count" implementation would require dedup keys shared with OJS, which is out of scope for P1.

---

## 6. Stop & Request Review

Phase 0 is complete. **Do not** proceed to Phase 1 until the human reviewer has answered **O-1 through O-8** above (or has explicitly waived items). Per the project's stop conditions: *"Phase 0 NEEDS CLARIFICATION items unresolved at Phase 1."*

End of analysis.
