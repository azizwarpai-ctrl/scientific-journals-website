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
- Tokens are issued **only** by `src/features/ojs/server/provision-route.ts` immediately after a successful MySQL row insertion into the OJS database.
- The system MUST NOT expose any public API endpoint that accepts an email address and returns a signed SSO token. (e.g., no `POST /api/ojs/sso`).

## 4. Consumption (`sso_login.php`)
- `sso_login.php` resides on the OJS domain.
- It receives the token via the URL query string.
- It receives a `redirect` query parameter that MUST be strictly formatted as `/index.php/{journalPath}/submission/wizard`.
- It makes a synchronous internal HTTPS cURL request back to `digitopub` at `GET /api/ojs/sso/validate?token=...`.
- If the token is valid, `sso_login.php` explicitly logs the user into the OJS session framework and redirects to the exact `redirect` destination.

### Required Redirect Format
- **Pattern:** `/index.php/{journalPath}/submission/wizard`
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
  3. `provision-route.ts` → constructs SSO URL with `redirect=/index.php/{journalPath}/submission/wizard`
  4. `sso_login.php` → reads `redirect` parameter → redirects after login

## 5. Returning User Flow
- digitopub plays **zero** role in returning user authentication.
- Returning users are directed via standard hyperlinks to OJS. OJS handles any necessary login prompts.

