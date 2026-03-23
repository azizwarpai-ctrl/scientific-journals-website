---
description: UI Spec for Submission Flow
---

# Submission Flow UI Spec

## 1. Catch-All Submission Flow Behavior

The "Submit Manuscript" button on journal detail pages (`app/journals/[id]/page.tsx`) must behave uniformly regardless of local browser state or user context.

- **Action:** Must render a raw anchor tag or direct external navigation link pointing strictly to the OJS submission pattern `{OJS_BASE_URL}/index.php/{journalPath}/submission`.
- **Target URL Pattern:** `{OJS_BASE_URL}/index.php/{journalPath}/submission`
  - *Note:* `OJS_BASE_URL` is derived from the `NEXT_PUBLIC_OJS_BASE_URL` environment variable, which defaults to `https://submitmanager.com`.
- **Conditionals:** The button MUST NOT check local state (e.g., `registeredEmail` in Zustand or `localStorage`) to alter its destination.
- **Cross-Journal Leakage:** The submit button must strictly and entirely respect the actively viewed journal and hardcode its explicit destination. Do not rely on "last visited" or existing OJS cookie context.

## 2. UX Rules
- **No Local Login Prompts:** digitopub MUST NEVER render a login modal or page for public users attempting to submit a manuscript.
- **Direct Handover:** The UI acts as a stateless content directory. When a user wishes to interact transactionally (submit, review), they are handed off to the OJS domain.
- **New Users:** New users who complete the registration wizard on digitopub are automatically bridged and redirected to OJS. The frontend does not need to retain their identity state post-registration.

## 3. Cross-Journal Leakage Prevention
- The Submit Manuscript button MUST always respect the actively viewed journal and hardcode the explicit OJS path for that journal.
- The registration wizard MUST propagate the originating journal's `ojs_path` through the entire flow via `selectedJournalPath` in the registration store.
- No component may rely on OJS cookie context, "last visited" state, or session-derived journal context.
- If `journalPath` cannot be determined, the SSO redirect MUST default to the OJS dashboard (`/index.php/index/login`), NOT to any submission wizard.

