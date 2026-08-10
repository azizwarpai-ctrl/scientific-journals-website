# Data Model: Arbitration Panel (OJS → Panel DTO mapping)

**Feature**: Arbitration Panel (Stream A, epic #138)
**Spec**: [./spec.md](./spec.md)
**Date**: 2026-07-25
**Source schema**: `submit-manager-database-schema-ojs/dbkgvcunttgs97.sql` (live OJS dump)

## Overview

Zero new tables. Zero schema changes on either database. This document is the **data contract ("datagram")** between the OJS MySQL database and the panel DTOs served by `/api/reviews/*`. All access is live, read-only `SELECT` via `ojsQuery` (`src/features/ojs/server/ojs-client.ts`).

**Type rules**:
- mysql2 returns OJS `bigint` columns as JS **numbers** (all ids here are well below 2^53). DTO ids are plain numbers — never `BigInt`, never passed through `serializeRecord()`.
- All `datetime` columns are serialized to ISO 8601 strings (`DATE_FORMAT(col, '%Y-%m-%dT%H:%i:%sZ')` or JS-side `toISOString()`); `NULL` datetimes become `null`.
- OJS `smallint` flags (`declined`, `cancelled`, `recommend_only`) become booleans.

| DTO | OJS source tables |
|---|---|
| `SubmissionSummary` | `submissions`, `journals`, `journal_settings`, `publications`, `publication_settings`, `review_rounds`, `review_assignments` |
| `ReviewRound` | `review_rounds` |
| `ReviewAssignment` | `review_assignments`, `users`, `user_settings` |
| `DecisionEvent` | `edit_decisions` |
| `EditorAssignment` | `stage_assignments`, `user_groups`, `users`, `user_settings` |
| `PersonRef` | `users`, `user_settings` (EAV) |
| `ReviewerWorkload` | `review_assignments`, `users`, `user_settings` (GROUP BY reviewer) |
| `ReviewOverview` | aggregates over `submissions`, `review_assignments` |

---

## 1. `SubmissionSummary` — list row

| DTO field | OJS source | Notes |
|---|---|---|
| `submissionId` | `submissions.submission_id` | PK |
| `title` | `publication_settings.setting_value` where `publication_id = submissions.current_publication_id` AND `setting_name='title'` | Locale fallback chain below |
| `journalId` | `submissions.context_id` → `journals.journal_id` | |
| `journalTitle` | `journal_settings.setting_value` where `setting_name='name'`, journal `primary_locale` | Fallback: `journals.path` |
| `journalPath` | `journals.path` | Needed for `ojsUrl` |
| `stageId` | `submissions.stage_id` | Enum map §A |
| `status` | `submissions.status` | Enum map §B |
| `dateSubmitted` | `submissions.date_submitted` | ISO |
| `dateLastActivity` | `submissions.date_last_activity` | ISO |
| `currentRound` | `MAX(review_rounds.round)` for the submission's current `stage_id` | `null` if no rounds |
| `reviewsPending` | COUNT of `review_assignments` in current round: not declined, not cancelled, `date_completed IS NULL` | |
| `reviewsCompleted` | COUNT of `review_assignments` in current round: `date_completed IS NOT NULL` | |
| `ojsUrl` | derived: `buildOjsWorkflowUrl(journalPath, submissionId)` | Never stored |

**Title locale fallback** (correlated subselect, in priority order):
1. `publication_settings.locale = submissions.locale`
2. `publication_settings.locale = journals.primary_locale`
3. any `publication_settings` title row for the publication
4. literal `'Untitled submission'`

**Completeness predicate** (⚠ verify against live data — OJS 3.3 vs 3.4 drift, see §G): list queries exclude incomplete in-progress wizard submissions with

```sql
(submissions.submission_progress = '' OR submissions.submission_progress = '0')
```

`submission_progress` is `varchar(50)` in the dump. This predicate lives in ONE exported constant so a live-data correction touches a single line.

## 2. `ReviewRound` — one per review round

| DTO field | OJS source |
|---|---|
| `reviewRoundId` | `review_rounds.review_round_id` |
| `round` | `review_rounds.round` |
| `stageId` | `review_rounds.stage_id` |
| `status` | `review_rounds.status` → enum map §E |
| `assignments` | `ReviewAssignment[]` where `review_assignments.review_round_id = review_rounds.review_round_id` |

## 3. `ReviewAssignment` — one per reviewer invite

| DTO field | OJS source | Notes |
|---|---|---|
| `reviewId` | `review_assignments.review_id` | PK |
| `reviewer` | `PersonRef` for `review_assignments.reviewer_id` | §6 |
| `recommendation` | `review_assignments.recommendation` | Enum map §C; `NULL` until submitted |
| `reviewMethod` | `review_assignments.review_method` | Enum map §F |
| `dateAssigned` | `date_assigned` | ISO / null |
| `dateNotified` | `date_notified` | ISO / null |
| `dateConfirmed` | `date_confirmed` | ISO / null |
| `dateDue` | `date_due` | ISO / null |
| `dateResponseDue` | `date_response_due` | ISO / null |
| `dateCompleted` | `date_completed` | ISO / null |
| `declined` | `declined` (smallint) | boolean |
| `cancelled` | `cancelled` (smallint) | boolean |
| `isOverdue` | derived: `date_completed IS NULL AND declined = 0 AND cancelled = 0 AND date_due < NOW()` | computed in SQL |

## 4. `DecisionEvent` — editorial decision timeline entry

| DTO field | OJS source |
|---|---|
| `editDecisionId` | `edit_decisions.edit_decision_id` |
| `editorId` | `edit_decisions.editor_id` |
| `decision` | `edit_decisions.decision` → enum map §D |
| `reviewRoundId` | `edit_decisions.review_round_id` (nullable) |
| `round` | `edit_decisions.round` |
| `dateDecided` | `edit_decisions.date_decided` → ISO |

Ordered by `date_decided ASC` for the timeline.

## 5. `EditorAssignment` — who is steering the submission

| DTO field | OJS source | Notes |
|---|---|---|
| `userId` | `stage_assignments.user_id` | |
| `name` | `PersonRef.fullName` for that user | §6 |
| `userGroupId` | `stage_assignments.user_group_id` | |
| `roleId` | `user_groups.role_id` | Editor roles only (§H) |
| `dateAssigned` | `stage_assignments.date_assigned` → ISO | |
| `recommendOnly` | `stage_assignments.recommend_only` | boolean |

Filter: `user_groups.role_id IN (16, 17)` (journal manager / section editor — see §H verify note).

## 6. `PersonRef` — resolved user identity (EAV)

`users` has no name columns; names live in the `user_settings` EAV table.

| DTO field | OJS source |
|---|---|
| `userId` | `users.user_id` |
| `fullName` | `TRIM(CONCAT(givenName, ' ', familyName))` from `user_settings` where `setting_name IN ('givenName','familyName')`, locale `''` or user locale; fallback `users.username`, then `'User #{user_id}'` |
| `email` | `users.email` |
| `affiliation` | `user_settings.setting_value` where `setting_name='affiliation'` (nullable) |
| `orcid` | `user_settings.setting_value` where `setting_name='orcid'` (nullable) |

Implementation: correlated subselects per setting (matches existing codebase patterns) or a small follow-up query batched by `user_id IN (...)`.

## 7. `ReviewerWorkload` — per-reviewer aggregates

GROUP BY `review_assignments.reviewer_id` JOIN `users`:

| DTO field | Derivation |
|---|---|
| `reviewer` | `PersonRef` |
| `total` | `COUNT(*)` |
| `active` | `SUM(date_completed IS NULL AND declined = 0 AND cancelled = 0)` |
| `completed` | `SUM(date_completed IS NOT NULL)` |
| `declined` | `SUM(declined = 1)` |
| `overdue` | `SUM(date_completed IS NULL AND declined = 0 AND cancelled = 0 AND date_due < NOW())` |
| `avgDaysToComplete` | `AVG(DATEDIFF(date_completed, date_assigned))` over completed rows; `null` when none |

Search filter matches `users.email` or the resolved name. Pagination via a COUNT over distinct reviewers with assignments.

## 8. `ReviewOverview` — aggregate stats

| DTO field | Derivation |
|---|---|
| `submissionsInReview` | COUNT `submissions` where `stage_id IN (2, 3)` (internal + external review), `status = 1` (queued), complete per §1 predicate |
| `activeAssignments` | COUNT `review_assignments` where `date_completed IS NULL AND declined = 0 AND cancelled = 0` |
| `completedReviews` | COUNT `review_assignments` where `date_completed IS NOT NULL` |
| `overdueReviews` | COUNT `review_assignments` where active AND `date_due < NOW()` |
| `avgDaysToComplete` | `AVG(DATEDIFF(date_completed, date_assigned))` over completed; `null` when none |

Cached 60 s at module level in the service.

---

## Enum maps

Every map MUST have an `Unknown ({value})` fallback. Each map carries a **"verify against installed OJS version"** note — OJS 3.3 vs 3.4 constant drift is a known risk (sync point with Stream B, issue #131).

### A. Workflow stage (`submissions.stage_id`, `review_rounds.stage_id`)

| Value | Constant (OJS 3.x) | Label |
|---|---|---|
| 1 | `WORKFLOW_STAGE_ID_SUBMISSION` | Submission |
| 2 | `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` | Internal Review |
| 3 | `WORKFLOW_STAGE_ID_EXTERNAL_REVIEW` | External Review |
| 4 | `WORKFLOW_STAGE_ID_EDITING` | Copyediting |
| 5 | `WORKFLOW_STAGE_ID_PRODUCTION` | Production |

⚠ Verify: OJS 2.x used a different numbering; the dump must be spot-checked (e.g. `SELECT stage_id, COUNT(*) FROM submissions GROUP BY stage_id`).

### B. Submission status (`submissions.status`)

| Value | Constant | Label |
|---|---|---|
| 1 | `STATUS_QUEUED` | Queued |
| 3 | `STATUS_PUBLISHED` | Published |
| 4 | `STATUS_DECLINED` | Declined |
| 5 | `STATUS_SCHEDULED` | Scheduled |

### C. Reviewer recommendation (`review_assignments.recommendation`)

| Value | Constant | Label |
|---|---|---|
| 1 | `SUBMISSION_REVIEWER_RECOMMENDATION_ACCEPT` | Accept |
| 2 | `..._PENDING_REVISIONS` | Revisions Required |
| 3 | `..._RESUBMIT_HERE` | Resubmit for Review |
| 4 | `..._RESUBMIT_ELSEWHERE` | Resubmit Elsewhere |
| 5 | `..._DECLINE` | Decline Submission |
| 6 | `..._SEE_COMMENTS` | See Comments |

### D. Editorial decision (`edit_decisions.decision`)

| Value | Constant | Label |
|---|---|---|
| 1 | `SUBMISSION_EDITOR_DECISION_ACCEPT` | Accept |
| 2 | `..._PENDING_REVISIONS` | Revisions Requested |
| 3 | `..._RESUBMIT` | Resubmit for Review |
| 4 | `..._DECLINE` | Decline |
| 6 | `..._EXTERNAL_REVIEW` | Send to Review ⚠ verify |
| 7 | `..._SEND_TO_PRODUCTION` | Send to Production ⚠ verify |
| 8 | `..._INITIAL_DECISION` | New Round / Initial ⚠ verify |

### E. Review round status (`review_rounds.status`)

| Value | Label |
|---|---|
| 1 | Pending Reviewers |
| 2 | Pending Reviews |
| 3 | Reviews Ready |
| 4 | Reviews Completed |
| 5 | Reviews Overdue |
| 6 | Revisions Submitted |
| 7 | Resubmit for Review |
| 8 | Resubmitted for Review |
| 9 | Returned to Review |

⚠ Verify: OJS 3.4 adds recommendation-phase statuses (10+); map only what the live instance emits and rely on the `Unknown` fallback otherwise.

### F. Review method (`review_assignments.review_method`)

| Value | Constant | Label |
|---|---|---|
| 1 | `SUBMISSION_REVIEW_METHOD_ANONYMOUS` | Double-Blind |
| 2 | `SUBMISSION_REVIEW_METHOD_BLIND` | Blind |
| 3 | `SUBMISSION_REVIEW_METHOD_OPEN` | Open |

### G. `submission_progress` completeness sentinel

- Type in dump: `varchar(50)` (not int) — string comparison required.
- Working predicate: `submission_progress = '' OR submission_progress = '0'` means "submission wizard complete".
- ⚠ **MUST be verified against the live OJS database before merge** (`SELECT submission_progress, COUNT(*) FROM submissions GROUP BY submission_progress`) and the finding reported on issue #131 (Stream B sync point). The predicate lives in one exported constant (`COMPLETE_SUBMISSION_PREDICATE`) so the fix is one line.

### H. `user_groups.role_id` (editor filter for `EditorAssignment`)

| Value | Constant | Label |
|---|---|---|
| 16 | `ROLE_ID_MANAGER` | Journal Manager |
| 17 | `ROLE_ID_SUB_EDITOR` | Section Editor |
| 4096 | `ROLE_ID_REVIEWER` | Reviewer (excluded from editor filter) |
| 4097 | `ROLE_ID_ASSISTANT` | Assistant (excluded) |

⚠ Verify: the epic referenced "role_id 16/17"; confirm the live instance assigns editors under those groups (`SELECT ug.role_id, COUNT(*) FROM stage_assignments sa JOIN user_groups ug USING (user_group_id) GROUP BY ug.role_id`).

---

## Serialization

No `BigInt` anywhere in this feature — mysql2 numbers are JSON-safe. DTOs are validated with Zod schemas in `src/features/reviews/schemas/review-schema.ts` before leaving the service layer. Dates are the only transformation: `datetime → ISO string | null`.
