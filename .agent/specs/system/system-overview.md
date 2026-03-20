# System Overview

## Definition
**digitopub** is a Next.js-based portal serving as a gateway and UI layer for scientific journals. It provides a discovery interface for journals, articles, and supplementary materials.

**submitmanager** (OJS) is the core journal management system based on Open Journal Systems (PKP). It is the single source of truth for identity, submissions, and editorial workflows.

## Responsibilities

### digitopub (Gateway)
- Displaying journal lists and metadata.
- Providing a registration gateway for new users (provisioning them into OJS via `ojs-user-bridge.php`).
- Initiating Single Sign-On (SSO) redirects to OJS via `sso_login.php`.
- Displaying public content (articles, issues).

### submitmanager (Identity Provider)
- **User Identity Management**: Storing and verifying credentials.
- **Session Management**: Handling user login states and sessions.
- **Roles & Permissions**: Managing Author, Reviewer, and Editor roles.
- **Submission Workflow**: Receiving and processing manuscript submissions.

## Forbidden Responsibilities (digitopub)
- **User Authentication**: digitopub MUST NOT verify passwords or credentials.
- **Local Identity Storage**: digitopub MUST NOT store user passwords or local authentication tokens for public users.
- **Session Authority**: digitopub MUST NOT maintain its own session state for public users to grant access to protected OJS resources.
- **Identity Issuance**: digitopub MUST NOT issue JWTs or session cookies for public user authentication.

## Dual Authentication Model

### Admin System (digitopub)
- **Scope**: Internal dashboard access (`/admin/*`).
- **Authentication**: Local login with email/password + OTP verification.
- **Session**: JWT-based session (`auth_token` cookie) managed locally.
- **Rules**: Admin users MUST NOT be mixed with OJS public users.

### Public System (OJS)
- **Scope**: Authors, Reviewers, and Readers.
- **Authentication**: Handled entirely by OJS (submitmanager.com).
- **Session**: digitopub MUST NOT maintain sessions for public users.
- **Integration**: digitopub acts as a registration gateway (provisioning via Bearer-authenticated PHP bridge) and uses stateless HMAC tokens for Single Sign-On (SSO).
- **Rules**: Returning users MUST authenticate directly on OJS.

### Forbidden Behaviors
- **Mixing Domains**: Storing public users in admin tables or using admin sessions in SSO flows.
- **Local Public Login**: Providing login forms for authors/reviewers on digitopub.
- **Session Path Leakage**: Admin JWTs affecting public route behavior or vice versa.

## Strict Rule
Any attempt to implement local authentication or identity management in digitopub for public users is an architectural violation.

## Identity Ownership Model

The system enforces strict identity separation:

- digitopub.com:
  - Owns ONLY admin authentication (JWT-based)
  - Has NO authority over public users
  - Does NOT persist or validate public user credentials

- submitmanager.com (OJS):
  - Owns ALL public user identities
  - Handles login, sessions, roles, submissions

## Redirect Authority Rules

digitopub must explicitly command OJS where to redirect users after SSO interpolation. 
- All SSO redirects MUST contain the exact, fully qualified relative path to the journal (e.g. `redirect=/index.php/{journalPath}/submission/wizard`).
- The system must not rely on the existing OJS session context to guess the user's intended destination. OJS sessions can be multi-journal or cross-journal, meaning any missing redirect instructions will land the user in their previously active journal context.

## SSO Behavior

Two flows exist:

### 1. New User (Provision + SSO)
digitopub → provision → generate token → redirect to OJS

### 2. Returning User (Direct Access)
digitopub → direct link → OJS handles login

digitopub MUST NOT:
- check session
- require login
- intercept submission
...
