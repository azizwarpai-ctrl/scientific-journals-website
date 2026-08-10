/**
 * OJS review enum maps and deep-link builders for the arbitration panel.
 *
 * Pure module — no I/O, no env access beyond the centralized OJS URL helpers.
 * Every label map has an explicit `Unknown ({value})` fallback so new enum
 * values from a future OJS version never crash or blank the UI.
 *
 * ⚠ Enum values follow OJS 3.x constants and MUST be spot-checked against the
 * installed OJS version (3.3 vs 3.4 constant drift is a known risk — see
 * specs/arbitration-panel/data-model.md §"Enum maps").
 */

import { DEFAULT_OJS_LANDING_BASE_URL, getPublicOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

/** Workflow stage ids (submissions.stage_id, review_rounds.stage_id). */
export const STAGE_LABELS: Readonly<Record<number, string>> = {
    1: "Submission",
    2: "Internal Review",
    3: "External Review",
    4: "Copyediting",
    5: "Production",
}

/** Submission status (submissions.status). */
export const SUBMISSION_STATUS_LABELS: Readonly<Record<number, string>> = {
    1: "Queued",
    3: "Published",
    4: "Declined",
    5: "Scheduled",
}

/** Reviewer recommendation (review_assignments.recommendation). */
export const RECOMMENDATION_LABELS: Readonly<Record<number, string>> = {
    1: "Accept",
    2: "Revisions Required",
    3: "Resubmit for Review",
    4: "Resubmit Elsewhere",
    5: "Decline Submission",
    6: "See Comments",
}

/** Editorial decision (edit_decisions.decision). */
export const DECISION_LABELS: Readonly<Record<number, string>> = {
    1: "Accept",
    2: "Revisions Requested",
    3: "Resubmit for Review",
    4: "Decline",
    6: "Send to Review",
    7: "Send to Production",
    8: "New Review Round",
}

/** Review round status (review_rounds.status). */
export const REVIEW_ROUND_STATUS_LABELS: Readonly<Record<number, string>> = {
    1: "Pending Reviewers",
    2: "Pending Reviews",
    3: "Reviews Ready",
    4: "Reviews Completed",
    5: "Reviews Overdue",
    6: "Revisions Submitted",
    7: "Resubmit for Review",
    8: "Resubmitted for Review",
    9: "Returned to Review",
}

/** Review method (review_assignments.review_method). */
export const REVIEW_METHOD_LABELS: Readonly<Record<number, string>> = {
    1: "Double-Blind",
    2: "Blind",
    3: "Open",
}

/**
 * Label lookup with explicit fallback. Returns `Unknown ({value})` for any
 * value not present in the map (and for null/undefined when allowNull is not
 * desired the caller handles nulls before calling).
 */
export function labelFor(map: Readonly<Record<number, string>>, value: number | null | undefined): string {
    if (value === null || value === undefined) return "Unknown"
    return map[value] ?? `Unknown (${value})`
}

/**
 * ⚠ Completeness sentinel for `submissions.submission_progress`.
 *
 * The column is `varchar(50)`: a completed submission wizard is marked with
 * '' or '0'. This predicate MUST be verified against the live OJS database
 * (OJS 3.3 vs 3.4 drift) — it lives here so a correction touches exactly one
 * line. Finding to be reported on issue #131 (Stream B sync point).
 */
export function completeSubmissionPredicate(alias: string): string {
    return `(${alias}.submission_progress = '' OR ${alias}.submission_progress = '0')`
}

function publicBase(): string {
    return (getPublicOjsBaseUrl() ?? DEFAULT_OJS_LANDING_BASE_URL).replace(/\/ojs$/i, "")
}

/**
 * Deep link into the OJS editorial workflow for a submission.
 * Pattern: {publicBase}/index.php/{journalPath}/workflow/access/{submissionId}
 */
export function buildOjsWorkflowUrl(journalPath: string, submissionId: number | string): string {
    const slug = encodeURIComponent(journalPath)
    return `${publicBase()}/index.php/${slug}/workflow/access/${submissionId}`
}

/**
 * Deep link to the OJS users & roles management screen for a journal
 * (reviewer administration lives there in OJS 3.x).
 * Pattern: {publicBase}/index.php/{journalPath}/management/settings/users
 */
export function buildOjsReviewerUrl(journalPath: string): string {
    const slug = encodeURIComponent(journalPath)
    return `${publicBase()}/index.php/${slug}/management/settings/users`
}
