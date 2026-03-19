# OJS SSO & Integration Flow

## 1. Architectural Boundaries

### Strict Separation
digitopub and OJS maintain a strict "Identity Barrier". digitopub acts as a transparent lens for OJS data but remains blind to user identity for returning visitors.

### Data Ownership
- **Journal Metadata**: Synced or queried by digitopub.
- **User Accounts**: Owned exclusively by OJS.
- **Submission State**: Owned exclusively by OJS.

### Actions digitopub MUST NOT do:
1. **User Identity Detection**: Do not use `getSession()`, `auth()`, or any local identity hooks in public-facing routes.
2. **Credential Verification**: Do not implement any form that asks for a password and verifies it against a local or remote database in a non-OJS context.
3. **Session Persistence**: Do not store OJS session cookies or tokens in digitopub's database or local storage (except for transient registration context).
4. **Login Routes**: The routes `/login`, `/register` (local auth version), `/verify-code`, and `/reset-password` are forbidden in digitopub.

## 2. Registration Flow
1. **User Input**: User fills out the registration form on digitopub.
2. **Provisioning**: digitopub sends a `POST` request to the OJS API (provisioning endpoint) with the user details.
3. **SSO Token Generation**: Upon successful OJS provisioning, digitopub generates a stateless HMAC-signed SSO token.
4. **Redirect**: digitopub returns a redirect URL to its own frontend, which then performs a client-side redirect to OJS (`sso_login.php?token=...`).
5. **OJS Authentication**: OJS validates the token via a callback to digitopub and logs the user in.

## 3. Submission Flow

### Case A: Fresh Registration
1. **Context Check**: User fills out the registration form.
2. **SSO Trigger**: Registration process automatically generates an SSO token.
3. **SSO Redirect**: digitopub redirects to OJS `sso_login.php`.

### Case B: Submit (Returning User)
1. **Direct Link**: digitopub provides a direct link to the OJS submission wizard (`/index.php/{journal}/submission/wizard`).
2. **OJS Intercept**: OJS detects the unauthenticated request and prompts the user to log in via the OJS login page.
3. **Native Auth**: The returning user authenticates directly with OJS. The gateway is completely uninvolved in returning user access.

## 4. SSO Contract (Stateless)

### Token Structure
The SSO token is a stateless, signed HMAC-SHA256 string.
Format: `payloadBase64.signature`

- **Payload**: A Base64-encoded JSON string: `{"email": "user@example.com", "timestamp": 1234567890}`.
- **Signature**: An HMAC-SHA256 hash of the payload using the `SSO_SECRET`.

### Validation Rules
1. **Format Check**: The token must contain exactly one dot separating payload and signature.
2. **Signature Verification**: Recompute the HMAC of the payload and compare it to the signature using `crypto.timingSafeEqual`.
3. **Expiration**: The `timestamp` in the payload must be within the last 5 minutes (300 seconds).

### Security Requirements
- **SSO_SECRET**: Must be unique, long, and never committed to source control.
- **Timing Safe**: All signature comparisons must be timing-safe (using `crypto.timingSafeEqual`).
