/**
 * OJS review read service — live, READ-ONLY queries for the arbitration panel.
 *
 * Decision D1: no sync, no local mirror. Every function hits the OJS MySQL
 * database via `ojsQuery` and returns Zod-validated DTOs with plain-number
 * ids and ISO date strings. Row→DTO mappers are exported for unit testing.
 *
 * See specs/arbitration-panel/data-model.md for the full mapping contract.
 */

import type { RowDataPacket } from "mysql2/promise"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import {
    DECISION_LABELS,
    RECOMMENDATION_LABELS,
    REVIEW_METHOD_LABELS,
    REVIEW_ROUND_STATUS_LABELS,
    REVIEWER_ROLE_ID,
    STAGE_LABELS,
    SUBMISSION_STATUS_LABELS,
    buildOjsWorkflowUrl,
    completeSubmissionPredicate,
    labelFor,
} from "./ojs-review-constants"
import {
    decisionEventSchema,
    editorAssignmentSchema,
    reviewAssignmentSchema,
    reviewOverviewSchema,
    reviewRoundSchema,
    reviewerWorkloadSchema,
    submissionReviewDetailSchema,
    submissionSummarySchema,
} from "../schemas/review-schema"
import type {
    DecisionEvent,
    EditorAssignment,
    PersonRef,
    ReviewAssignment,
    ReviewOverview,
    ReviewRound,
    ReviewerWorkload,
    SubmissionReviewDetail,
    SubmissionSummary,
} from "../types"

// ---------------------------------------------------------------------------
// Row shapes (mysql2 RowDataPacket)
// ---------------------------------------------------------------------------

interface SubmissionRow extends RowDataPacket {
    submissionId: number
    title: string | null
    journalId: number
    journalTitle: string | null
    journalPath: string
    stageId: number
    status: number
    dateSubmitted: Date | string | null
    dateLastActivity: Date | string | null
    currentRound: number | null
    reviewsPending: number
    reviewsCompleted: number
}

interface RoundRow extends RowDataPacket {
    reviewRoundId: number
    round: number
    stageId: number
    status: number | null
}

interface AssignmentRow extends RowDataPacket {
    reviewId: number
    reviewRoundId: number | null
    reviewerId: number
    reviewerEmail: string | null
    reviewerUsername: string | null
    givenName: string | null
    familyName: string | null
    affiliation: string | null
    orcid: string | null
    recommendation: number | null
    reviewMethod: number | null
    dateAssigned: Date | string | null
    dateNotified: Date | string | null
    dateConfirmed: Date | string | null
    dateDue: Date | string | null
    dateResponseDue: Date | string | null
    dateCompleted: Date | string | null
    declined: number
    cancelled: number
    isOverdue: number
}

interface DecisionRow extends RowDataPacket {
    editDecisionId: number
    editorId: number
    decision: number
    reviewRoundId: number | null
    round: number | null
    dateDecided: Date | string | null
}

interface EditorRow extends RowDataPacket {
    userId: number
    userGroupId: number
    roleId: number
    dateAssigned: Date | string | null
    recommendOnly: number
    email: string | null
    username: string | null
    givenName: string | null
    familyName: string | null
}

interface ReviewerRow extends RowDataPacket {
    reviewerId: number
    email: string | null
    username: string | null
    givenName: string | null
    familyName: string | null
    affiliation: string | null
    orcid: string | null
    total: number
    active: number
    completed: number
    declined: number
    overdue: number
    avgDaysToComplete: number | null
}

interface OverviewRow extends RowDataPacket {
    submissionsInReview: number
    activeAssignments: number
    completedReviews: number
    overdueReviews: number
    avgDaysToComplete: number | null
}

interface CountRow extends RowDataPacket {
    total: number
}

// ---------------------------------------------------------------------------
// Shared SQL fragments
// ---------------------------------------------------------------------------

/** Localized publication title with locale fallback chain (data-model §1). */
const TITLE_SUBSELECT = `COALESCE(
        (SELECT ps.setting_value FROM publication_settings ps
            WHERE ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' AND ps.locale = s.locale LIMIT 1),
        (SELECT ps.setting_value FROM publication_settings ps
            WHERE ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' AND ps.locale = j.primary_locale LIMIT 1),
        (SELECT ps.setting_value FROM publication_settings ps
            WHERE ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' LIMIT 1)
    )`

const JOURNAL_TITLE_SUBSELECT = `(SELECT js.setting_value FROM journal_settings js
        WHERE js.journal_id = j.journal_id AND js.setting_name = 'name' AND js.locale = j.primary_locale LIMIT 1)`

const CURRENT_ROUND_SUBSELECT = `(SELECT MAX(rr.round) FROM review_rounds rr
        WHERE rr.submission_id = s.submission_id)`

/** EAV user_settings lookup, preferring the empty-locale row. */
function userSettingSubselect(userIdExpr: string, settingName: string): string {
    return `(SELECT us.setting_value FROM user_settings us
        WHERE us.user_id = ${userIdExpr} AND us.setting_name = '${settingName}'
        ORDER BY us.locale LIMIT 1)`
}

const SUBMISSION_SELECT = `SELECT
        s.submission_id AS submissionId,
        ${TITLE_SUBSELECT} AS title,
        s.context_id AS journalId,
        ${JOURNAL_TITLE_SUBSELECT} AS journalTitle,
        j.path AS journalPath,
        s.stage_id AS stageId,
        s.status AS status,
        s.date_submitted AS dateSubmitted,
        s.date_last_activity AS dateLastActivity,
        ${CURRENT_ROUND_SUBSELECT} AS currentRound,
        (SELECT COUNT(*) FROM review_assignments ra
            WHERE ra.submission_id = s.submission_id AND ra.round = ${CURRENT_ROUND_SUBSELECT}
              AND ra.declined = 0 AND ra.cancelled = 0 AND ra.date_completed IS NULL) AS reviewsPending,
        (SELECT COUNT(*) FROM review_assignments ra
            WHERE ra.submission_id = s.submission_id AND ra.round = ${CURRENT_ROUND_SUBSELECT}
              AND ra.date_completed IS NOT NULL) AS reviewsCompleted
    FROM submissions s
    JOIN journals j ON j.journal_id = s.context_id`

// ---------------------------------------------------------------------------
// Pure helpers / mappers (exported for unit tests)
// ---------------------------------------------------------------------------

/** datetime → ISO 8601 string | null. */
export function toIso(value: Date | string | null | undefined): string | null {
    if (value === null || value === undefined) return null
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
}

/** Assemble a PersonRef from EAV fragments with documented fallbacks. */
export function buildPersonRef(parts: {
    userId: number
    givenName: string | null
    familyName: string | null
    username: string | null
    email: string | null
    affiliation?: string | null
    orcid?: string | null
}): PersonRef {
    const joined = [parts.givenName, parts.familyName]
        .filter((p): p is string => !!p && p.trim().length > 0)
        .join(" ")
        .trim()
    const fullName = joined || parts.username || `User #${parts.userId}`
    return {
        userId: parts.userId,
        fullName,
        email: parts.email ?? null,
        affiliation: parts.affiliation ?? null,
        orcid: parts.orcid ?? null,
    }
}

export function mapSubmissionSummaryRow(row: SubmissionRow): SubmissionSummary {
    return submissionSummarySchema.parse({
        submissionId: Number(row.submissionId),
        title: row.title ?? "Untitled submission",
        journalId: Number(row.journalId),
        journalTitle: row.journalTitle ?? row.journalPath,
        journalPath: row.journalPath,
        stageId: Number(row.stageId),
        stageLabel: labelFor(STAGE_LABELS, Number(row.stageId)),
        status: Number(row.status),
        statusLabel: labelFor(SUBMISSION_STATUS_LABELS, Number(row.status)),
        dateSubmitted: toIso(row.dateSubmitted),
        dateLastActivity: toIso(row.dateLastActivity),
        currentRound: row.currentRound === null ? null : Number(row.currentRound),
        reviewsPending: Number(row.reviewsPending),
        reviewsCompleted: Number(row.reviewsCompleted),
        ojsUrl: buildOjsWorkflowUrl(row.journalPath, Number(row.submissionId)),
    })
}

export function mapReviewAssignmentRow(row: AssignmentRow): ReviewAssignment {
    const recommendation = row.recommendation === null ? null : Number(row.recommendation)
    const reviewMethod = row.reviewMethod === null ? null : Number(row.reviewMethod)
    return reviewAssignmentSchema.parse({
        reviewId: Number(row.reviewId),
        reviewer: buildPersonRef({
            userId: Number(row.reviewerId),
            givenName: row.givenName,
            familyName: row.familyName,
            username: row.reviewerUsername,
            email: row.reviewerEmail,
            affiliation: row.affiliation,
            orcid: row.orcid,
        }),
        recommendation,
        recommendationLabel: recommendation === null ? null : labelFor(RECOMMENDATION_LABELS, recommendation),
        reviewMethod,
        reviewMethodLabel: reviewMethod === null ? null : labelFor(REVIEW_METHOD_LABELS, reviewMethod),
        dateAssigned: toIso(row.dateAssigned),
        dateNotified: toIso(row.dateNotified),
        dateConfirmed: toIso(row.dateConfirmed),
        dateDue: toIso(row.dateDue),
        dateResponseDue: toIso(row.dateResponseDue),
        dateCompleted: toIso(row.dateCompleted),
        declined: Number(row.declined) === 1,
        cancelled: Number(row.cancelled) === 1,
        isOverdue: Number(row.isOverdue) === 1,
    })
}

export function mapReviewRoundRow(row: RoundRow, assignments: ReviewAssignment[]): ReviewRound {
    const status = row.status === null ? null : Number(row.status)
    return reviewRoundSchema.parse({
        reviewRoundId: Number(row.reviewRoundId),
        round: Number(row.round),
        stageId: Number(row.stageId),
        status,
        statusLabel: labelFor(REVIEW_ROUND_STATUS_LABELS, status),
        assignments,
    })
}

export function mapDecisionRow(row: DecisionRow): DecisionEvent {
    return decisionEventSchema.parse({
        editDecisionId: Number(row.editDecisionId),
        editorId: Number(row.editorId),
        decision: Number(row.decision),
        decisionLabel: labelFor(DECISION_LABELS, Number(row.decision)),
        reviewRoundId: row.reviewRoundId === null ? null : Number(row.reviewRoundId),
        round: row.round === null ? null : Number(row.round),
        dateDecided: toIso(row.dateDecided),
    })
}

export function mapEditorRow(row: EditorRow): EditorAssignment {
    return editorAssignmentSchema.parse({
        userId: Number(row.userId),
        name: buildPersonRef({
            userId: Number(row.userId),
            givenName: row.givenName,
            familyName: row.familyName,
            username: row.username,
            email: row.email,
        }).fullName,
        userGroupId: Number(row.userGroupId),
        roleId: Number(row.roleId),
        dateAssigned: toIso(row.dateAssigned),
        recommendOnly: Number(row.recommendOnly) === 1,
    })
}

export function mapReviewerWorkloadRow(row: ReviewerRow): ReviewerWorkload {
    return reviewerWorkloadSchema.parse({
        reviewer: buildPersonRef({
            userId: Number(row.reviewerId),
            givenName: row.givenName,
            familyName: row.familyName,
            username: row.username,
            email: row.email,
            affiliation: row.affiliation,
            orcid: row.orcid,
        }),
        total: Number(row.total),
        active: Number(row.active),
        completed: Number(row.completed),
        declined: Number(row.declined),
        overdue: Number(row.overdue),
        avgDaysToComplete: row.avgDaysToComplete === null ? null : Number(row.avgDaysToComplete),
    })
}

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

export interface ListOjsSubmissionsOptions {
    page: number
    limit: number
    journalId?: number
    stageId?: number
    status?: number
    search?: string
}

export interface ListOjsReviewersOptions {
    page: number
    limit: number
    search?: string
}

export interface PaginatedResult<T> {
    rows: T[]
    total: number
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

function buildSubmissionFilters(options: ListOjsSubmissionsOptions): { where: string; params: unknown[] } {
    const conditions: string[] = [completeSubmissionPredicate("s")]
    const params: unknown[] = []

    if (options.journalId !== undefined) {
        conditions.push("s.context_id = ?")
        params.push(options.journalId)
    }
    if (options.stageId !== undefined) {
        conditions.push("s.stage_id = ?")
        params.push(options.stageId)
    }
    if (options.status !== undefined) {
        conditions.push("s.status = ?")
        params.push(options.status)
    }
    if (options.search && options.search.trim().length > 0) {
        conditions.push(`EXISTS (SELECT 1 FROM publication_settings pss
            WHERE pss.publication_id = s.current_publication_id
              AND pss.setting_name = 'title' AND pss.setting_value LIKE ?)`)
        params.push(`%${options.search.trim()}%`)
    }

    return { where: conditions.join(" AND "), params }
}

export async function listOjsSubmissions(
    options: ListOjsSubmissionsOptions
): Promise<PaginatedResult<SubmissionSummary>> {
    const { where, params } = buildSubmissionFilters(options)
    const offset = (options.page - 1) * options.limit

    const countRows = await ojsQuery<CountRow>(
        `SELECT COUNT(*) AS total FROM submissions s JOIN journals j ON j.journal_id = s.context_id WHERE ${where}`,
        params
    )
    const total = Number(countRows[0]?.total ?? 0)

    const rows = await ojsQuery<SubmissionRow>(
        `${SUBMISSION_SELECT} WHERE ${where} ORDER BY s.date_last_activity DESC LIMIT ? OFFSET ?`,
        [...params, options.limit, offset]
    )

    return { rows: rows.map(mapSubmissionSummaryRow), total }
}

export async function getOjsSubmissionDetail(submissionId: number): Promise<SubmissionReviewDetail | null> {
    const submissionRows = await ojsQuery<SubmissionRow>(
        `${SUBMISSION_SELECT} WHERE s.submission_id = ?`,
        [submissionId]
    )
    const submissionRow = submissionRows[0]
    if (!submissionRow) return null
    const summary = mapSubmissionSummaryRow(submissionRow)

    const [roundRows, assignmentRows, decisionRows, editorRows] = await Promise.all([
        ojsQuery<RoundRow>(
            `SELECT review_round_id AS reviewRoundId, round, stage_id AS stageId, status
         FROM review_rounds WHERE submission_id = ? ORDER BY round ASC`,
            [submissionId]
        ),
        ojsQuery<AssignmentRow>(
            `SELECT
            ra.review_id AS reviewId,
            ra.review_round_id AS reviewRoundId,
            ra.reviewer_id AS reviewerId,
            u.email AS reviewerEmail,
            u.username AS reviewerUsername,
            ${userSettingSubselect("ra.reviewer_id", "givenName")} AS givenName,
            ${userSettingSubselect("ra.reviewer_id", "familyName")} AS familyName,
            ${userSettingSubselect("ra.reviewer_id", "affiliation")} AS affiliation,
            ${userSettingSubselect("ra.reviewer_id", "orcid")} AS orcid,
            ra.recommendation,
            ra.review_method AS reviewMethod,
            ra.date_assigned AS dateAssigned,
            ra.date_notified AS dateNotified,
            ra.date_confirmed AS dateConfirmed,
            ra.date_due AS dateDue,
            ra.date_response_due AS dateResponseDue,
            ra.date_completed AS dateCompleted,
            ra.declined,
            ra.cancelled,
            (ra.date_completed IS NULL AND ra.declined = 0 AND ra.cancelled = 0
              AND ra.date_due IS NOT NULL AND ra.date_due < NOW()) AS isOverdue
         FROM review_assignments ra
         JOIN users u ON u.user_id = ra.reviewer_id
         WHERE ra.submission_id = ?
         ORDER BY ra.round ASC, ra.review_id ASC`,
            [submissionId]
        ),
        ojsQuery<DecisionRow>(
            `SELECT edit_decision_id AS editDecisionId, editor_id AS editorId, decision,
                review_round_id AS reviewRoundId, round, date_decided AS dateDecided
         FROM edit_decisions WHERE submission_id = ? ORDER BY date_decided ASC`,
            [submissionId]
        ),
        ojsQuery<EditorRow>(
            `SELECT
            sa.user_id AS userId,
            sa.user_group_id AS userGroupId,
            ug.role_id AS roleId,
            sa.date_assigned AS dateAssigned,
            sa.recommend_only AS recommendOnly,
            u.email,
            u.username,
            ${userSettingSubselect("sa.user_id", "givenName")} AS givenName,
            ${userSettingSubselect("sa.user_id", "familyName")} AS familyName
         FROM stage_assignments sa
         JOIN user_groups ug ON ug.user_group_id = sa.user_group_id
         JOIN users u ON u.user_id = sa.user_id
         WHERE sa.submission_id = ? AND ug.role_id IN (16, 17)
         ORDER BY sa.date_assigned ASC`,
            [submissionId]
        ),
    ])

    const assignmentsByRound = new Map<number, ReviewAssignment[]>()
    for (const row of assignmentRows) {
        const assignment = mapReviewAssignmentRow(row)
        const key = row.reviewRoundId === null ? 0 : Number(row.reviewRoundId)
        const list = assignmentsByRound.get(key) ?? []
        list.push(assignment)
        assignmentsByRound.set(key, list)
    }

    const rounds = roundRows.map((row) =>
        mapReviewRoundRow(row, assignmentsByRound.get(Number(row.reviewRoundId)) ?? [])
    )

    // Assignments whose review_round_id is NULL (grouped under key 0) belong to
    // no known round — surface them in a synthetic "Unassigned" entry (round 0)
    // instead of silently dropping them.
    const unassigned = assignmentsByRound.get(0)
    if (unassigned && unassigned.length > 0) {
        rounds.push(
            reviewRoundSchema.parse({
                reviewRoundId: 0,
                round: 0,
                stageId: summary.stageId,
                status: null,
                statusLabel: "Unassigned",
                assignments: unassigned,
            })
        )
    }

    const decisions = decisionRows.map(mapDecisionRow)
    const editors = editorRows.map(mapEditorRow)

    return submissionReviewDetailSchema.parse({
        ...summary,
        rounds,
        decisions,
        editors,
    })
}

export async function listOjsReviewers(
    options: ListOjsReviewersOptions
): Promise<PaginatedResult<ReviewerWorkload>> {
    // Roster is every OJS user holding the Reviewer role (role_id 4096), not
    // only those with assignments — assignment stats are LEFT-joined and read
    // 0 when a reviewer has no assignments yet. `EXISTS` on the role membership
    // avoids row multiplication when a user is a reviewer in several journals.
    const roleExists = `EXISTS (
        SELECT 1 FROM user_user_groups uug
        JOIN user_groups ug ON ug.user_group_id = uug.user_group_id
        WHERE uug.user_id = u.user_id AND ug.role_id = ${REVIEWER_ROLE_ID})`

    const conditions: string[] = [roleExists]
    const params: unknown[] = []

    if (options.search && options.search.trim().length > 0) {
        const like = `%${options.search.trim()}%`
        conditions.push(`(u.email LIKE ? OR u.username LIKE ? OR EXISTS (
            SELECT 1 FROM user_settings us
            WHERE us.user_id = u.user_id
              AND us.setting_name IN ('givenName', 'familyName')
              AND us.setting_value LIKE ?))`)
        params.push(like, like, like)
    }
    const where = conditions.join(" AND ")
    const offset = (options.page - 1) * options.limit

    const countRows = await ojsQuery<CountRow>(
        `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
        params
    )
    const total = Number(countRows[0]?.total ?? 0)

    const rows = await ojsQuery<ReviewerRow>(
        `SELECT
            u.user_id AS reviewerId,
            u.email,
            u.username,
            ${userSettingSubselect("u.user_id", "givenName")} AS givenName,
            ${userSettingSubselect("u.user_id", "familyName")} AS familyName,
            ${userSettingSubselect("u.user_id", "affiliation")} AS affiliation,
            ${userSettingSubselect("u.user_id", "orcid")} AS orcid,
            COUNT(ra.review_id) AS total,
            SUM(ra.review_id IS NOT NULL AND ra.date_completed IS NULL AND ra.declined = 0 AND ra.cancelled = 0) AS active,
            SUM(ra.date_completed IS NOT NULL) AS completed,
            SUM(ra.declined = 1) AS declined,
            SUM(ra.review_id IS NOT NULL AND ra.date_completed IS NULL AND ra.declined = 0 AND ra.cancelled = 0
                AND ra.date_due IS NOT NULL AND ra.date_due < NOW()) AS overdue,
            AVG(CASE WHEN ra.date_completed IS NOT NULL
                THEN DATEDIFF(ra.date_completed, ra.date_assigned) END) AS avgDaysToComplete
         FROM users u
         LEFT JOIN review_assignments ra ON ra.reviewer_id = u.user_id
         WHERE ${where}
         GROUP BY u.user_id, u.email, u.username
         ORDER BY active DESC, total DESC
         LIMIT ? OFFSET ?`,
        [...params, options.limit, offset]
    )

    return { rows: rows.map(mapReviewerWorkloadRow), total }
}

// ---------------------------------------------------------------------------
// Overview (60s module-level cache)
// ---------------------------------------------------------------------------

const OVERVIEW_CACHE_TTL_MS = 60_000
let overviewCache: { data: ReviewOverview; expiresAt: number } | null = null

/** Test hook: reset the module-level overview cache. */
export function resetReviewOverviewCache(): void {
    overviewCache = null
}

export async function getOjsReviewOverview(): Promise<ReviewOverview> {
    if (overviewCache && overviewCache.expiresAt > Date.now()) {
        return overviewCache.data
    }

    const rows = await ojsQuery<OverviewRow>(
        `SELECT
            (SELECT COUNT(*) FROM submissions s
                WHERE s.stage_id IN (2, 3) AND s.status = 1
                  AND ${completeSubmissionPredicate("s")}) AS submissionsInReview,
            (SELECT COUNT(*) FROM review_assignments ra
                WHERE ra.date_completed IS NULL AND ra.declined = 0 AND ra.cancelled = 0) AS activeAssignments,
            (SELECT COUNT(*) FROM review_assignments ra
                WHERE ra.date_completed IS NOT NULL) AS completedReviews,
            (SELECT COUNT(*) FROM review_assignments ra
                WHERE ra.date_completed IS NULL AND ra.declined = 0 AND ra.cancelled = 0
                  AND ra.date_due IS NOT NULL AND ra.date_due < NOW()) AS overdueReviews,
            (SELECT AVG(DATEDIFF(ra.date_completed, ra.date_assigned)) FROM review_assignments ra
                WHERE ra.date_completed IS NOT NULL) AS avgDaysToComplete`
    )

    const row = rows[0]
    const data = reviewOverviewSchema.parse({
        submissionsInReview: Number(row?.submissionsInReview ?? 0),
        activeAssignments: Number(row?.activeAssignments ?? 0),
        completedReviews: Number(row?.completedReviews ?? 0),
        overdueReviews: Number(row?.overdueReviews ?? 0),
        avgDaysToComplete:
            row?.avgDaysToComplete === null || row?.avgDaysToComplete === undefined
                ? null
                : Number(row.avgDaysToComplete),
    })

    overviewCache = { data, expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS }
    return data
}
