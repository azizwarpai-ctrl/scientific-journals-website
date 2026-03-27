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
- All SSO redirects MUST contain the exact, fully qualified relative path to the journal (e.g. `redirect=/index.php/{journalPath}/submission`).
- The system must not rely on the existing OJS session context to guess the user's intended destination. OJS sessions can be multi-journal or cross-journal, meaning any missing redirect instructions will land the user in their previously active journal context.

### Multi-Journal Session Behavior
- OJS maintains a **single session** across all journals on the same domain (submitmanager.com).
- When a user logs in via SSO, the OJS session is **not scoped** to a specific journal — it is domain-wide.
- If no explicit `redirect` parameter is provided during SSO, the user will land on the OJS site-level dashboard (`/index.php/index/login`), NOT on any specific journal's submission wizard.
- This prevents cross-journal leakage where a user intending to submit to journal A is accidentally routed to journal B.

### Admin Verification Flow
- The admin OTP verification flow (`verify-code-form.tsx`) is strictly for admin users.
- After successful OTP verification, admin users MUST be redirected to `/admin`, NOT to any OJS endpoint.
- The `/admin` endpoint requires token validation middleware (e.g., JWT auth) and must never be marked public.
- Any routing/route-config functions or constants that register `/admin` (referenced in `verify-code-form.tsx`) must enforce auth guarding and fail CI/validation if declared public or unguarded.
- The admin authentication system has no relationship to the OJS public user system.

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

## Content Management Boundaries

### CMS-Driven (Admin Panel)
- **About page**: Mission, vision, who we are, brand philosophy (via `/api/about`)
- **FAQs**: Question/answer pairs with categories (via `/api/faqs`)
- **Solutions**: Company solutions with descriptions and features (via `/api/solutions`)
- **Journals**: Synced from OJS, editable via admin (via `/api/journals`)
- **Platform Statistics**: Real-time metrics from OJS DB (via `/api/statistics`)

### Static (Acceptable)
- **Core values** on About page — brand constants that rarely change
- **Help guides** (Author/Reviewer guides) — standard academic publishing guidance
- **Navigation structure** — Navbar, Footer, routing
- **SEO metadata** — Page titles, meta descriptions

### Forbidden Static Content
- **Sample/fake data** — No hardcoded statistics, distributions, or simulated metrics
- **Marketing claims** — No unverifiable numerical claims ("thousands of researchers")
- **Placeholder images** — Must use real data or explicit "Coming Soon" states

## API Route Architecture

| Endpoint | Model | Purpose |
|----------|-------|---------|
| `/api/faqs` | `FAQ` (`faq_solutions` table) | FAQ entries for the Help Center |
| `/api/solutions` | `Solution` (`solutions` table) | Company solutions displayed on /solutions |
| `/api/journals` | `Journal` | Journal listing and management |
| `/api/about` | `SystemSetting` | About page CMS content |
| `/api/statistics` | OJS DB query | Platform-wide real-time stats |
| `/api/metrics` | OJS DB query | Home page counter metrics |

