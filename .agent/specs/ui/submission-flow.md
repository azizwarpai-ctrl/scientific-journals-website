---
description: UI Spec for Submission Flow
---

# Submission Flow UI Spec

## 1. Submit Button Behavior
The "Submit Manuscript" button on journal detail pages (`app/journals/[id]/page.tsx`) must behave uniformly regardless of local browser state.

- **Action:** Must render a raw anchor tag or direct external navigation link pointing to the OJS submission wizard.
- **Target URL Pattern:** `{OJS_BASE_URL}/index.php/{journalPath}/submission/wizard`
  - *Note:* `OJS_BASE_URL` is derived from the `NEXT_PUBLIC_OJS_BASE_URL` environment variable, which defaults to `https://submitmanager.com`.
- **Conditionals:** The button MUST NOT check local state (e.g., `registeredEmail` in Zustand or `localStorage`) to alter its destination.

## 2. UX Rules
- **No Local Login Prompts:** digitopub MUST NEVER render a login modal or page for public users attempting to submit a manuscript.
- **Direct Handover:** The UI acts as a stateless content directory. When a user wishes to interact transactionally (submit, review), they are handed off to the OJS domain.
- **New Users:** New users who complete the registration wizard on digitopub are automatically bridged and redirected to OJS. The frontend does not need to retain their identity state post-registration.
