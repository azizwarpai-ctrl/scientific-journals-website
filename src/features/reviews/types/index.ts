/**
 * Arbitration panel DTO types (Stream A).
 *
 * All ids are plain numbers (mysql2 returns OJS bigint columns as JS numbers).
 * All datetimes are ISO 8601 strings or null. No BigInt anywhere in this
 * feature — see specs/arbitration-panel/data-model.md.
 */

/** Resolved OJS user identity (users + user_settings EAV). */
export interface PersonRef {
    userId: number
    fullName: string
    email: string | null
    affiliation: string | null
    orcid: string | null
}

/** One row of the submissions list. */
export interface SubmissionSummary {
    submissionId: number
    title: string
    journalId: number
    journalTitle: string
    journalPath: string
    stageId: number
    stageLabel: string
    status: number
    statusLabel: string
    dateSubmitted: string | null
    dateLastActivity: string | null
    currentRound: number | null
    reviewsPending: number
    reviewsCompleted: number
    ojsUrl: string
}

/** One reviewer invite inside a review round. */
export interface ReviewAssignment {
    reviewId: number
    reviewer: PersonRef
    recommendation: number | null
    recommendationLabel: string | null
    reviewMethod: number | null
    reviewMethodLabel: string | null
    dateAssigned: string | null
    dateNotified: string | null
    dateConfirmed: string | null
    dateDue: string | null
    dateResponseDue: string | null
    dateCompleted: string | null
    declined: boolean
    cancelled: boolean
    isOverdue: boolean
}

/** One review round with its assignments. */
export interface ReviewRound {
    reviewRoundId: number
    round: number
    stageId: number
    status: number | null
    statusLabel: string
    assignments: ReviewAssignment[]
}

/** One editorial decision on the timeline. */
export interface DecisionEvent {
    editDecisionId: number
    editorId: number
    decision: number
    decisionLabel: string
    reviewRoundId: number | null
    round: number | null
    dateDecided: string | null
}

/** An editor assigned to steer the submission. */
export interface EditorAssignment {
    userId: number
    name: string
    userGroupId: number
    roleId: number
    dateAssigned: string | null
    recommendOnly: boolean
}

/** Full detail DTO for /api/reviews/submissions/:id. */
export interface SubmissionReviewDetail extends SubmissionSummary {
    rounds: ReviewRound[]
    decisions: DecisionEvent[]
    editors: EditorAssignment[]
}

/** Per-reviewer workload aggregates. */
export interface ReviewerWorkload {
    reviewer: PersonRef
    total: number
    active: number
    completed: number
    declined: number
    overdue: number
    avgDaysToComplete: number | null
}

/** Aggregate stats for the reviews overview cards. */
export interface ReviewOverview {
    submissionsInReview: number
    activeAssignments: number
    completedReviews: number
    overdueReviews: number
    avgDaysToComplete: number | null
}
