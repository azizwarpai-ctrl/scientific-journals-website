# Feature Specification: Arbitration Panel (OJS-backed Peer-Review Monitor)

**Feature Branch**: `feat/arbitration-panel`
**Feature Code**: Stream A (epic #138)
**Created**: 2026-07-25
**Status**: Draft
**Input**: GitHub issues #126–#130. Read-only admin panel that monitors the OJS peer-review pipeline live from the OJS MySQL database, with deep links into the OJS editorial workflow. No OJS writes, no sync, no local mirror.

## User Scenarios & Testing *(mandatory)*

User stories are independently testable slices. Implement them in order; each one yields a deployable increment.

---

### User Story 1 — Review pipeline overview (Priority: P1)

An editor (admin) opens `/admin/reviews` and sees aggregate statistics for the whole OJS peer-review pipeline: submissions currently in review, active review assignments, completed reviews, overdue reviews, and average days to complete. The numbers reflect the live OJS database.

**Why this priority**: This is the panel's reason to exist — a single glance at arbitration health. Every other story drills down from here.

**Independent Test**: Sign in as admin, open `/admin/reviews`, and compare the four stat cards against equivalent counts computed by hand from the OJS backend UI (submissions in review stage, assignments without `date_completed`, etc.).

**Acceptance Scenarios**:

1. **Given** a signed-in admin and a reachable OJS database, **When** they open `/admin/reviews`, **Then** the stat cards render live aggregates within one page load.
2. **Given** the OJS database is not configured (`OJS_DATABASE_HOST` unset), **When** the admin opens `/admin/reviews`, **Then** an "OJS not configured" banner renders and no error is thrown.
3. **Given** the OJS database is down, **When** the admin opens `/admin/reviews`, **Then** an "OJS unavailable" banner renders and the page remains usable (no crash, no infinite spinner).
4. **Given** an anonymous or non-admin visitor, **When** they call `GET /api/reviews/overview` directly, **Then** the response is 401/403.

---

### User Story 2 — Submission review monitoring (Priority: P1)

An editor opens `/admin/submissions` and sees every OJS submission with its current workflow stage, status, journal, review-round progress (pending vs completed review counts), and dates. They can filter by journal, stage, and status, search by title, and paginate. Each row links to the submission detail view and offers an "Open in OJS" deep link into the OJS editorial workflow.

**Why this priority**: This is the day-to-day working surface — finding submissions that are stuck. P1 together with US-1.

**Independent Test**: Open `/admin/submissions`, pick one row, and cross-check stage, status, and review counts against the same submission in the OJS backend. Click "Open in OJS" and land on the OJS workflow page for that submission.

**Acceptance Scenarios**:

1. **Given** a signed-in admin, **When** they open `/admin/submissions`, **Then** a paginated list of live OJS submissions renders with stage/status badges and review progress.
2. **Given** the list, **When** the admin filters by stage or status or searches by title, **Then** the list and pagination totals update accordingly.
3. **Given** any row, **When** the admin clicks "Open in OJS", **Then** a new tab opens at `{OJS_BASE}/index.php/{journalPath}/workflow/access/{submissionId}`.
4. **Given** any row, **When** the admin clicks the submission title, **Then** they navigate to `/admin/submissions/{ojs_submission_id}` (plain numeric id — never a BigInt).

---

### User Story 3 — Submission review detail (Priority: P1)

An editor opens a submission detail page and sees the full arbitration picture for that submission: every review round, every review assignment (reviewer identity, recommendation, review method, assigned/due/completed dates, declined/cancelled flags, overdue highlighting), the editorial decision timeline, and the assigned editors — plus an "Open in OJS" deep link.

**Why this priority**: The detail view is where arbitration decisions are informed. Must ship with US-2.

**Independent Test**: Open `/admin/submissions/{id}` for a submission with at least one completed review round; verify rounds, assignments, recommendations, and decisions match the OJS backend's workflow page for that submission.

**Acceptance Scenarios**:

1. **Given** a submission with multiple review rounds, **When** the admin opens its detail page, **Then** each round renders as a collapsible section with its assignments.
2. **Given** an assignment past its `date_due` with no `date_completed` and not declined/cancelled, **When** the detail renders, **Then** that assignment is visually marked overdue.
3. **Given** a submission with editorial decisions, **When** the detail renders, **Then** the decision timeline lists each decision with its label and date in chronological order.
4. **Given** a nonexistent submission id, **When** the admin opens the detail page, **Then** a not-found state renders (API responds 404).
5. **Given** any detail page, **When** it renders, **Then** no `.slice` is called on numeric ids and no dead links (`/admin/reviews/new`, `/admin/submissions/{id}/edit`) are present.

---

### User Story 4 — Reviewer workload (Priority: P2)

An editor views a paginated table of OJS reviewers with workload aggregates: total, active, completed, declined, and overdue assignment counts, plus average days to complete. This supports balanced reviewer selection and identifying chronically late reviewers.

**Why this priority**: Valuable for arbitration decisions but not required to monitor the pipeline day-to-day; P2.

**Independent Test**: Open the reviewers view, pick a reviewer, and verify their counts against their assignment history in the OJS backend (Users & Roles → reviewer).

**Acceptance Scenarios**:

1. **Given** a signed-in admin, **When** they open the reviewers view, **Then** a paginated table of reviewers with workload aggregates renders.
2. **Given** a reviewer with overdue assignments, **When** the table renders, **Then** their overdue count is non-zero and highlighted.
3. **Given** a search term, **When** the admin searches, **Then** the table filters by reviewer name or email.

---

### Edge Cases

- **OJS not configured**: every endpoint returns 200 `{success: true, configured: false, data: null|[]}`; the UI renders the unconfigured banner. No exception escapes.
- **OJS unreachable / query failure**: after `ojsQuery` retries are exhausted, endpoints return 503 `{success: false, error: "OJS_UNAVAILABLE"}`; the UI renders the down banner.
- **Unknown enum values** (new OJS version adds a status/recommendation/decision code): the label maps fall back to `Unknown ({value})` — never crash, never blank.
- **Missing localized title**: `publication_settings` title lookup falls back `submission locale → journal primary_locale → any available locale → "Untitled submission"`.
- **Reviewer with missing `user_settings` names**: falls back to `users.username`, then `User #{id}`.
- **`submission_progress` sentinel drift** (OJS 3.3 vs 3.4): the list queries filter incomplete submissions with a single documented predicate constant (`submission_progress = '' OR submission_progress = '0'`), verified against live data before merge; the finding is reported to Stream B (issue #131).
- **Huge result sets**: all list endpoints are paginated with `parsePagination` (default 20, max 100); aggregates use SQL, not in-memory reduction.
- **Overview cache staleness**: `/overview` is cached 60 s module-level; numbers may lag reality by up to a minute. Acceptable by design.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Data access (P1)

- **FR-001 (P1)**: All OJS data MUST be read live via `ojsQuery` from `src/features/ojs/server/ojs-client.ts`. No sync job, no local mirror tables, no Prisma reads of legacy `Review`/`Submission` models for this panel.
- **FR-002 (P1)**: The panel MUST NOT write to the OJS database under any circumstance. Read-only `SELECT` queries only.
- **FR-003 (P1)**: No schema changes to the digitopub database. Zero new Prisma models or migrations.
- **FR-004 (P1)**: OJS row ids (`submission_id`, `review_id`, `user_id`, …) MUST be typed as plain numbers (mysql2 returns numbers), never `BigInt`. Dates MUST be serialized to ISO 8601 strings.

#### API (P1)

- **FR-005 (P1)**: `GET /api/reviews/overview` MUST return aggregate stats DTO (60 s cache). Admin-only.
- **FR-006 (P1)**: `GET /api/reviews/submissions` MUST return paginated `SubmissionSummary[]` including `ojsUrl`, using `parsePagination`/`paginatedResponse`. Filters: `journalId`, `stageId`, `status`, `search`. Admin-only.
- **FR-007 (P1)**: `GET /api/reviews/submissions/:id` MUST return the detail DTO (rounds + assignments + decisions + editors + `ojsUrl`) or 404 `{success: false, error: "Not found"}`. `:id` validated with `z.coerce.number().int().positive()`. Admin-only.
- **FR-008 (P1)**: `GET /api/reviews/reviewers` MUST return paginated reviewer workload DTOs. Admin-only.
- **FR-009 (P1)**: Every endpoint MUST be guarded by `requireAdmin` (`src/lib/auth-middleware.ts`) — 401 unauthenticated, 403 non-admin.
- **FR-010 (P1)**: When `isOjsConfigured()` is false, endpoints MUST return 200 with `{success: true, configured: false, data: null|[]}`. When OJS queries fail, endpoints MUST return 503 `{success: false, error: "OJS_UNAVAILABLE"}`.
- **FR-011 (P1)**: The legacy `GET /api/reviews/` (Prisma-backed) endpoint MUST be removed.

#### Deep links (P1)

- **FR-012 (P1)**: OJS workflow URLs MUST be built by a single pure helper `buildOjsWorkflowUrl(journalPath, submissionId)` → `{publicBase}/index.php/{journalPath}/workflow/access/{submissionId}`, using `getPublicOjsBaseUrl()` from `src/features/ojs/utils/ojs-config.ts`. No hand-assembled OJS URLs in components or pages.

#### UI (P1/P2)

- **FR-013 (P1)**: `/admin/reviews` MUST render overview stat cards and MUST NOT contain an "Assign Reviewer" button (write actions belong in OJS).
- **FR-014 (P1)**: `/admin/submissions` MUST render the OJS-backed submission list (client-side hooks, `staleTime: 60_000`) with stage/status badges and "Open in OJS" buttons.
- **FR-015 (P1)**: `/admin/submissions/[id]` MUST treat `[id]` as the OJS `submission_id` (plain number) and render rounds, assignments, decisions, editors, and an "Open in OJS" link. It MUST NOT contain links to `/admin/reviews/new` or `/admin/submissions/[id]/edit`.
- **FR-016 (P2)**: The reviewers workload table MUST render on the reviews page (or a tab thereof) with overdue highlighting.
- **FR-017 (P1)**: Degraded states (`configured: false`, `OJS_UNAVAILABLE`) MUST render as an explicit banner component on every panel page.
- **FR-018 (P1)**: Motion polish: ease-out transitions ≤ 250 ms, no `scale(0)` mount animations, list stagger 30–80 ms, `:active` `scale(0.97)` on pressables, `transition` declared on specific properties only.

### Key Entities

- **SubmissionSummary**: `{submissionId, title, journalId, journalTitle, journalPath, stageId, stageLabel, status, statusLabel, dateSubmitted, dateLastActivity, currentRound, reviewsPending, reviewsCompleted, ojsUrl}`.
- **ReviewRound**: `{reviewRoundId, round, stageId, status, statusLabel, assignments: ReviewAssignment[]}`.
- **ReviewAssignment**: `{reviewId, reviewer: PersonRef, recommendation, recommendationLabel, reviewMethod, reviewMethodLabel, dateAssigned, dateNotified, dateConfirmed, dateDue, dateResponseDue, dateCompleted, declined, cancelled, isOverdue}`.
- **DecisionEvent**: `{editDecisionId, editorId, decision, decisionLabel, reviewRoundId, round, dateDecided}`.
- **EditorAssignment**: `{userId, name, userGroupId, roleId, dateAssigned, recommendOnly}`.
- **PersonRef**: `{userId, fullName, email, affiliation|null, orcid|null}`.
- **ReviewerWorkload**: `{reviewer: PersonRef, total, active, completed, declined, overdue, avgDaysToComplete|null}`.
- **ReviewOverview**: `{submissionsInReview, activeAssignments, completedReviews, overdueReviews, avgDaysToComplete|null, configured: true}`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every panel page renders live OJS data that matches the OJS backend UI for at least one manually cross-checked submission (rounds, assignments, decisions, editors).
- **SC-002**: Every "Open in OJS" deep link on list and detail pages lands on the correct OJS workflow page (manual click-through of each link type).
- **SC-003**: With `OJS_DATABASE_HOST` unset, all four endpoints return 200 `configured: false` and all panel pages render the unconfigured banner with zero server errors.
- **SC-004**: With the OJS database unreachable, all four endpoints return 503 `OJS_UNAVAILABLE` and pages render the down banner.
- **SC-005**: No requests to the OJS database other than `SELECT` (verified by code review of the service module — no `INSERT`/`UPDATE`/`DELETE` tokens).
- **SC-006**: The three known crashes/dead ends are gone: no `updated_at` access on `Review`, no `.slice` on BigInt ids, no links to `/admin/reviews/new` or `/admin/submissions/[id]/edit` (verified by grep + manual click-through).
- **SC-007**: `bun run lint && bun run test && bun run build` pass on the feature branch.
- **SC-008**: Integration tests cover: happy-path envelopes, pagination math, `configured: false`, 503, 404, and 401/403 for all four endpoints.
