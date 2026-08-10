import { z } from "zod"
import { STAGE_LABELS, SUBMISSION_STATUS_LABELS } from "@/src/features/reviews/server/ojs-review-constants"

/**
 * Zod schemas for the arbitration panel DTOs (Stream A).
 * Mirrors src/features/reviews/types — the service validates every row set
 * through these before it leaves the server boundary.
 */

export const personRefSchema = z.object({
    userId: z.number().int(),
    fullName: z.string(),
    email: z.string().nullable(),
    affiliation: z.string().nullable(),
    orcid: z.string().nullable(),
})

export const submissionSummarySchema = z.object({
    submissionId: z.number().int(),
    title: z.string(),
    journalId: z.number().int(),
    journalTitle: z.string(),
    journalPath: z.string(),
    stageId: z.number().int(),
    stageLabel: z.string(),
    status: z.number().int(),
    statusLabel: z.string(),
    dateSubmitted: z.string().nullable(),
    dateLastActivity: z.string().nullable(),
    currentRound: z.number().int().nullable(),
    reviewsPending: z.number().int(),
    reviewsCompleted: z.number().int(),
    ojsUrl: z.string(),
})

export const reviewAssignmentSchema = z.object({
    reviewId: z.number().int(),
    reviewer: personRefSchema,
    recommendation: z.number().int().nullable(),
    recommendationLabel: z.string().nullable(),
    reviewMethod: z.number().int().nullable(),
    reviewMethodLabel: z.string().nullable(),
    dateAssigned: z.string().nullable(),
    dateNotified: z.string().nullable(),
    dateConfirmed: z.string().nullable(),
    dateDue: z.string().nullable(),
    dateResponseDue: z.string().nullable(),
    dateCompleted: z.string().nullable(),
    declined: z.boolean(),
    cancelled: z.boolean(),
    isOverdue: z.boolean(),
})

export const reviewRoundSchema = z.object({
    reviewRoundId: z.number().int(),
    round: z.number().int(),
    stageId: z.number().int(),
    status: z.number().int().nullable(),
    statusLabel: z.string(),
    assignments: z.array(reviewAssignmentSchema),
})

export const decisionEventSchema = z.object({
    editDecisionId: z.number().int(),
    editorId: z.number().int(),
    decision: z.number().int(),
    decisionLabel: z.string(),
    reviewRoundId: z.number().int().nullable(),
    round: z.number().int().nullable(),
    dateDecided: z.string().nullable(),
})

export const editorAssignmentSchema = z.object({
    userId: z.number().int(),
    name: z.string(),
    userGroupId: z.number().int(),
    roleId: z.number().int(),
    dateAssigned: z.string().nullable(),
    recommendOnly: z.boolean(),
})

export const submissionReviewDetailSchema = submissionSummarySchema.extend({
    rounds: z.array(reviewRoundSchema),
    decisions: z.array(decisionEventSchema),
    editors: z.array(editorAssignmentSchema),
})

export const reviewerWorkloadSchema = z.object({
    reviewer: personRefSchema,
    total: z.number().int(),
    active: z.number().int(),
    completed: z.number().int(),
    declined: z.number().int(),
    overdue: z.number().int(),
    avgDaysToComplete: z.number().nullable(),
})

export const reviewOverviewSchema = z.object({
    submissionsInReview: z.number().int(),
    activeAssignments: z.number().int(),
    completedReviews: z.number().int(),
    overdueReviews: z.number().int(),
    avgDaysToComplete: z.number().nullable(),
})

/** Path param validator for /submissions/:id. */
export const submissionIdParamSchema = z.coerce.number().int().positive()

/** zValidator("param") wrapper for /submissions/:id. */
export const submissionIdParamObjectSchema = z.object({
    id: submissionIdParamSchema,
})

// Known enum values come from the label maps — the panel only filters on
// stages/statuses it can render.
const KNOWN_STAGE_IDS = Object.keys(STAGE_LABELS).map(Number)
const KNOWN_SUBMISSION_STATUSES = Object.keys(SUBMISSION_STATUS_LABELS).map(Number)

const pageQuerySchema = z.coerce.number().int().positive().optional()
const limitQuerySchema = z.coerce.number().int().positive().max(100).optional()

/** Query validator for GET /reviews/submissions. */
export const submissionsListQuerySchema = z.object({
    page: pageQuerySchema,
    limit: limitQuerySchema,
    journalId: z.coerce.number().int().positive().optional(),
    stageId: z.coerce
        .number()
        .int()
        .refine((v) => KNOWN_STAGE_IDS.includes(v), { message: "Unknown stage id" })
        .optional(),
    status: z.coerce
        .number()
        .int()
        .refine((v) => KNOWN_SUBMISSION_STATUSES.includes(v), { message: "Unknown submission status" })
        .optional(),
    search: z.string().optional(),
})

/** Query validator for GET /reviews/reviewers. */
export const reviewersListQuerySchema = z.object({
    page: pageQuerySchema,
    limit: limitQuerySchema,
    search: z.string().optional(),
})
