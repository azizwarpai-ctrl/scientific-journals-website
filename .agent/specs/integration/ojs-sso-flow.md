---
description: Integration Spec for OJS SSO
---

# OJS SSO Integration Spec

## 1. Core Principles
The SSO mechanism is designed ONLY for **Just-In-Time (JIT) Handover** immediately following a new user registration. It must NEVER be used to re-authenticate returning users.

## 2. Token Lifecycle (HMAC)
- **Structure:** `<base64(payload)>.<sha256_hmac_signature>`
- **Payload:** `{"email": "user@example.com", "timestamp": 1234567890}`
- **Expiry:** Tokens are valid for five (5) minutes strictly.
- **Stateless:** digitopub maintains no database or session entry for these tokens.

## 3. Provisioning & Issuance (digitopub)

### Endpoint
- **Path:** `POST /api/ojs/register/register`
- **Handler:** `src/features/ojs/server/provision-route.ts`
- **Rate Limited:** 5 requests per IP per 15-minute window (IP-based, in-memory)
- **Input Validation:** `registerSchema` (Zod) on JSON body
- **Query Parameter:** `journalPath` (optional) — scopes the post-SSO redirect to the target journal's submission wizard

### Flow
1. Validate request body and check rate limit.
2. Provision user into OJS via `ojs-user-bridge.php` (Bearer-authenticated).
3. Generate stateless HMAC token: `base64(payload).sha256_hmac_signature`.
4. Fire-and-forget registration confirmation email.
5. Construct SSO redirect URL: `{OJS_BASE_URL}/sso_login.php?token=...&redirect=/index.php/{journalPath}/submission&source=...`.
6. Return `201` with `{ ssoUrl, status: "sso_redirect" }` — the frontend performs the redirect.

### Key Rules
- Tokens are issued **only** by `provision-route.ts` immediately after successful OJS user provisioning.
- The system MUST NOT expose any public API endpoint that accepts an email address and returns a signed SSO token (e.g., no `POST /api/ojs/sso`).

## 4. Consumption (`sso_login.php`)
- `sso_login.php` resides on the OJS domain.
- It receives the token via the URL query string.
- It receives a `redirect` query parameter that MUST be strictly formatted as `/index.php/{journalPath}/submission`.
- It makes a synchronous internal HTTPS cURL request back to `digitopub` at `GET /api/ojs/sso/validate?token=...`.
- If the token is valid, `sso_login.php` explicitly logs the user into the OJS session framework and redirects to the exact `redirect` destination.

### Required Redirect Format
- **Pattern:** `/index.php/{journalPath}/submission`
- **journalPath:** Must correspond to a valid journal `path` column in the OJS `journals` table.
- The `redirect` parameter MUST be URL-encoded when appended to the `sso_login.php` query string.

### Fallback Behavior
- If `redirect` is missing or empty, `sso_login.php` defaults to `/index.php/index/login` (OJS dashboard).
- It MUST NOT default to a submission wizard path, as this would cause cross-journal leakage.
- Missing redirect parameters are logged as warnings for debugging.

### journalPath Handling
- The `journalPath` must be passed through the entire registration chain:
  1. Frontend registration wizard → `POST /api/ojs/register?journalPath=X`
  2. `provision-route.ts` → reads from query string → passes to `ojs-user-bridge.php`
  3. `provision-route.ts` → constructs SSO URL with `redirect=/index.php/{journalPath}/submission`
  4. `sso_login.php` → reads `redirect` parameter → redirects after login

## 5. Returning User Flow
- digitopub plays **zero** role in returning user authentication.
- Returning users are directed via standard hyperlinks to OJS.
- **Post-Login Destination Control**: All links to OJS that may trigger a login prompt MUST include a `source` query parameter containing the intended destination path (e.g., `https://submitmanager.com/index.php/login?source=/index.php/{journalPath}/submission`). This ensures OJS honors the specific journal context after the user authenticates, regardless of previous session state.

## 6. Anti-Caching Requirements (Hostinger/CDNs)
To prevent sessions from leaking or being blocked by stale 403/401 responses (common in Varnish/Hostinger environments):
- digitopub server MUST emit `Cache-Control: no-store, no-cache, must-revalidate` for all API routes (implemented in middleware in `src/server/app.ts`).
- The OJS SSO endpoint (`sso_login.php` or the OJS SSO handler) MUST set the same anti-cache headers on its responses (e.g., add `header('Cache-Control: no-store, no-cache, must-revalidate')` in `sso_login.php`).
- Tests will validate the Cache-Control header on the OJS SSO redirect/consumption response to ensure this requirement is unambiguous and testable.

## 7. Debug Checklist — Common Redirect Issues

When users report being redirected to the wrong journal:

1. **Verify `ojs_path`**: Check that the journal's `ojs_path` column in the digitopub DB matches the actual OJS journal path (case-sensitive).
2. **Inspect the `<a>` href**: In DevTools, verify the "Submit Manuscript" button link includes the correct journal path.
3. **Check OJS session**: OJS uses domain-wide sessions. If a user was previously logged into journal A, OJS may redirect from any generic page to journal A's context.
4. **Test in incognito**: A fresh session (no existing OJS cookies) should navigate correctly.
5. **Check `sso_login.php` fallback**: Ensure it defaults to `/index.php/index/login`, not a submission wizard path.
