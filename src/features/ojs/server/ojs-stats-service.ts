/**
 * OJS platform-stats read service — live, READ-ONLY aggregate queries for the
 * admin dashboard, analytics summary, and authors page.
 *
 * Same D1 contract as `ojs-review-service.ts`: no sync, no local mirror. Every
 * function hits the OJS MySQL database via `ojsQuery` and throws on failure so
 * callers can render an explicit "OJS unavailable" state instead of fake zeros.
 *
 * All queries are scoped to the set of journal ids DigitoPub actually surfaces
 * (the synced `journal.ojs_id` set), mirroring `metrics/server/route.ts`, so
 * live counts line up with the per-journal aggregates in `ojs_journal_snapshots`.
 */

import type { RowDataPacket } from "mysql2/promise"
import { prisma } from "@/src/lib/db/config"
import { ojsQuery } from "./ojs-client"
import { completeSubmissionPredicate } from "@/src/features/reviews/server/ojs-review-constants"

// ---------------------------------------------------------------------------
// Shared SQL fragments (kept in sync with ojs-review-service.ts by convention;
// they reference the `s`/`j` aliases used in the queries below).
// ---------------------------------------------------------------------------

/** Localized publication title with locale fallback chain. */
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

/** Primary-author name fragment (given/family) for the current publication. */
function authorNameSubselect(setting: "givenName" | "familyName"): string {
    return `(SELECT aus.setting_value FROM authors au
        JOIN author_settings aus ON aus.author_id = au.author_id AND aus.setting_name = '${setting}'
        WHERE au.publication_id = s.current_publication_id
        ORDER BY au.seq ASC LIMIT 1)`
}

// ---------------------------------------------------------------------------
// Journal-id scoping
// ---------------------------------------------------------------------------

/**
 * The set of OJS journal ids DigitoPub surfaces, as validated positive
 * integers safe to inline in an IN() clause. Returns null when nothing is
 * synced yet (callers short-circuit to zero rather than emit `IN ()`).
 */
async function syncedJournalIdClause(): Promise<string | null> {
    const journals = await prisma.journal.findMany({
        where: { ojs_id: { not: null } },
        select: { ojs_id: true },
    })
    const ids = journals
        .map((j) => Number(j.ojs_id))
        .filter((n) => Number.isInteger(n) && n > 0)
    if (ids.length === 0) return null
    return ids.join(",")
}

// ---------------------------------------------------------------------------
// Platform stats
// ---------------------------------------------------------------------------

export interface OjsPlatformStats {
    /** Every submission in the surfaced journals. */
    totalSubmissions: number
    /** In peer review: stage 2/3, status queued, wizard complete. */
    inReview: number
    /** Accepted into copyediting/production (stage 4/5, status queued). */
    inProduction: number
    /** Published (status 3). Equals SUM(ojs_journal_snapshots.article_count). */
    published: number
    /** Declined (status 4). */
    declined: number
    /** Total review_assignments rows across the surfaced journals. */
    totalReviews: number
    /** Distinct author emails across the surfaced journals. */
    totalAuthors: number
}

interface PlatformStatsRow extends RowDataPacket {
    totalSubmissions: number
    inReview: number
    inProduction: number
    published: number
    declined: number
    totalReviews: number
    totalAuthors: number
}

const EMPTY_STATS: OjsPlatformStats = {
    totalSubmissions: 0,
    inReview: 0,
    inProduction: 0,
    published: 0,
    declined: 0,
    totalReviews: 0,
    totalAuthors: 0,
}

/**
 * One-roundtrip snapshot of the whole editorial pipeline, scoped to surfaced
 * journals. Throws if OJS is unreachable.
 */
export async function getOjsPlatformStats(): Promise<OjsPlatformStats> {
    const inClause = await syncedJournalIdClause()
    if (!inClause) return { ...EMPTY_STATS }

    const rows = await ojsQuery<PlatformStatsRow>(
        `SELECT
            (SELECT COUNT(*) FROM submissions s WHERE s.context_id IN (${inClause})) AS totalSubmissions,
            (SELECT COUNT(*) FROM submissions s
                WHERE s.context_id IN (${inClause}) AND s.stage_id IN (2,3) AND s.status = 1
                  AND ${completeSubmissionPredicate("s")}) AS inReview,
            (SELECT COUNT(*) FROM submissions s
                WHERE s.context_id IN (${inClause}) AND s.stage_id IN (4,5) AND s.status = 1) AS inProduction,
            (SELECT COUNT(*) FROM submissions s
                WHERE s.context_id IN (${inClause}) AND s.status = 3) AS published,
            (SELECT COUNT(*) FROM submissions s
                WHERE s.context_id IN (${inClause}) AND s.status = 4) AS declined,
            (SELECT COUNT(*) FROM review_assignments ra
                JOIN submissions s ON s.submission_id = ra.submission_id
                WHERE s.context_id IN (${inClause})) AS totalReviews,
            (SELECT COUNT(DISTINCT a.email) FROM authors a
                JOIN publications p ON p.publication_id = a.publication_id
                JOIN submissions s ON s.submission_id = p.submission_id
                WHERE s.context_id IN (${inClause}) AND a.email IS NOT NULL AND a.email != '') AS totalAuthors`
    )

    const r = rows[0]
    return {
        totalSubmissions: Number(r?.totalSubmissions ?? 0),
        inReview: Number(r?.inReview ?? 0),
        inProduction: Number(r?.inProduction ?? 0),
        published: Number(r?.published ?? 0),
        declined: Number(r?.declined ?? 0),
        totalReviews: Number(r?.totalReviews ?? 0),
        totalAuthors: Number(r?.totalAuthors ?? 0),
    }
}

interface JournalCountRow extends RowDataPacket {
    jid: number
    c: number
}

/**
 * Submission count per OJS journal id, scoped to surfaced journals. Used to
 * build the analytics "Submissions by Field" breakdown (join jid → local
 * journal.field in the caller). Throws if OJS is unreachable.
 */
export async function getOjsSubmissionCountsByJournal(): Promise<Map<string, number>> {
    const inClause = await syncedJournalIdClause()
    if (!inClause) return new Map()
    const rows = await ojsQuery<JournalCountRow>(
        `SELECT context_id AS jid, COUNT(*) AS c
         FROM submissions WHERE context_id IN (${inClause}) GROUP BY context_id`
    )
    const map = new Map<string, number>()
    for (const r of rows) map.set(String(r.jid), Number(r.c))
    return map
}

export interface OjsLast7Stats {
    newSubmissions: number
    completedReviews: number
    publishedArticles: number
}

interface Last7Row extends RowDataPacket {
    newSubmissions: number
    completedReviews: number
    publishedArticles: number
}

/**
 * Rolling-window counts from OJS (live), scoped to surfaced journals.
 * `windowStart` is an ISO string; bound as a parameter. Throws on OJS failure.
 */
export async function getOjsLast7Stats(windowStart: Date): Promise<OjsLast7Stats> {
    const inClause = await syncedJournalIdClause()
    if (!inClause) return { newSubmissions: 0, completedReviews: 0, publishedArticles: 0 }
    // MySQL DATETIME comparison. `toISOString()` is UTC, so slicing gives a UTC
    // wall-time 'YYYY-MM-DD HH:MM:SS' — the same basis as the UTC-stored OJS
    // DATETIMEs (pool `timezone: "Z"`), so the window boundary is consistent.
    const ws = windowStart.toISOString().slice(0, 19).replace("T", " ")
    const rows = await ojsQuery<Last7Row>(
        `SELECT
            (SELECT COUNT(*) FROM submissions s
                WHERE s.context_id IN (${inClause}) AND s.date_submitted >= ?) AS newSubmissions,
            (SELECT COUNT(*) FROM review_assignments ra
                JOIN submissions s ON s.submission_id = ra.submission_id
                WHERE s.context_id IN (${inClause}) AND ra.date_completed >= ?) AS completedReviews,
            (SELECT COUNT(*) FROM publications p
                JOIN submissions s ON s.submission_id = p.submission_id
                WHERE s.context_id IN (${inClause}) AND p.status = 3 AND p.date_published >= ?) AS publishedArticles`,
        [ws, ws, ws]
    )
    const r = rows[0]
    return {
        newSubmissions: Number(r?.newSubmissions ?? 0),
        completedReviews: Number(r?.completedReviews ?? 0),
        publishedArticles: Number(r?.publishedArticles ?? 0),
    }
}

// ---------------------------------------------------------------------------
// Snapshot aggregates (LOCAL — reads ojs_journal_snapshots, no OJS roundtrip)
// ---------------------------------------------------------------------------

export interface SnapshotAggregates {
    /** SUM(article_count) — published articles across surfaced journals. */
    publishedArticles: number
    /** SUM(views_total) — lifetime abstract/landing views. */
    viewsTotal: number
    /** SUM(downloads_total) — lifetime galley downloads. */
    downloadsTotal: number
    /** How many journals have a snapshot row (0 ⇒ never synced). */
    journalsWithSnapshots: number
}

/**
 * Reads the already-synced per-journal aggregates from `ojs_journal_snapshots`
 * (written by `refreshOjsJournalSnapshots`). Pure local Prisma read — never
 * touches OJS on the request path, so it works even when OJS is unreachable.
 */
export async function getSnapshotAggregates(): Promise<SnapshotAggregates> {
    const agg = await prisma.ojsJournalSnapshot.aggregate({
        _sum: { article_count: true, views_total: true, downloads_total: true },
        _count: true,
    })
    return {
        publishedArticles: agg._sum.article_count ?? 0,
        viewsTotal: Number(agg._sum.views_total ?? 0),
        downloadsTotal: Number(agg._sum.downloads_total ?? 0),
        journalsWithSnapshots: agg._count,
    }
}

// ---------------------------------------------------------------------------
// Recent submissions (dashboard "Recent Submissions" card)
// ---------------------------------------------------------------------------

export interface OjsRecentSubmission {
    submissionId: number
    title: string
    journalTitle: string
    authorName: string | null
    status: number
    dateSubmitted: string | null
}

interface RecentSubmissionRow extends RowDataPacket {
    submissionId: number
    title: string | null
    journalTitle: string | null
    journalPath: string
    authorGiven: string | null
    authorFamily: string | null
    status: number
    dateSubmitted: Date | string | null
}

function toIso(value: Date | string | null): string | null {
    if (value === null) return null
    // A naive 'YYYY-MM-DD HH:MM:SS' string from MySQL carries no zone and is
    // UTC — parse it explicitly as UTC so the result doesn't drift by the
    // runner's local offset. (Date values from mysql2 are already correct given
    // the pool's `timezone: "Z"` setting.)
    if (typeof value === "string") {
        const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value)
        if (m) {
            const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
            return Number.isNaN(d.getTime()) ? null : d.toISOString()
        }
    }
    const d = value instanceof Date ? value : new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function getOjsRecentSubmissions(limit = 5): Promise<OjsRecentSubmission[]> {
    const inClause = await syncedJournalIdClause()
    if (!inClause) return []
    const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : 5

    const rows = await ojsQuery<RecentSubmissionRow>(
        `SELECT
            s.submission_id AS submissionId,
            ${TITLE_SUBSELECT} AS title,
            ${JOURNAL_TITLE_SUBSELECT} AS journalTitle,
            j.path AS journalPath,
            ${authorNameSubselect("givenName")} AS authorGiven,
            ${authorNameSubselect("familyName")} AS authorFamily,
            s.status AS status,
            s.date_submitted AS dateSubmitted
        FROM submissions s
        JOIN journals j ON j.journal_id = s.context_id
        WHERE s.context_id IN (${inClause})
        ORDER BY s.date_submitted DESC
        LIMIT ${safeLimit}`
    )

    return rows.map((row) => {
        const name = [row.authorGiven, row.authorFamily]
            .filter((p): p is string => !!p && p.trim().length > 0)
            .join(" ")
            .trim()
        return {
            submissionId: Number(row.submissionId),
            title: row.title ?? "Untitled submission",
            journalTitle: row.journalTitle ?? row.journalPath,
            authorName: name || null,
            status: Number(row.status),
            dateSubmitted: toIso(row.dateSubmitted),
        }
    })
}

// ---------------------------------------------------------------------------
// Author summary (authors page)
// ---------------------------------------------------------------------------

export interface OjsAuthorSummary {
    name: string
    email: string
    submissions: number
    latestSubmission: string | null
}

interface AuthorSummaryRow extends RowDataPacket {
    email: string
    givenName: string | null
    familyName: string | null
    submissions: number
    latestSubmission: Date | string | null
}

/**
 * Distinct authors (keyed by email) across surfaced journals, with a
 * submission count and latest submission date. Names come from the
 * `author_settings` EAV (first non-empty givenName/familyName per email).
 */
export async function getOjsAuthorSummary(): Promise<OjsAuthorSummary[]> {
    const inClause = await syncedJournalIdClause()
    if (!inClause) return []

    const rows = await ojsQuery<AuthorSummaryRow>(
        `SELECT
            a.email AS email,
            MAX(gs.setting_value) AS givenName,
            MAX(fs.setting_value) AS familyName,
            COUNT(DISTINCT s.submission_id) AS submissions,
            MAX(s.date_submitted) AS latestSubmission
        FROM authors a
        JOIN publications p ON p.publication_id = a.publication_id
        JOIN submissions s ON s.submission_id = p.submission_id
        LEFT JOIN author_settings gs ON gs.author_id = a.author_id AND gs.setting_name = 'givenName'
        LEFT JOIN author_settings fs ON fs.author_id = a.author_id AND fs.setting_name = 'familyName'
        WHERE s.context_id IN (${inClause}) AND a.email IS NOT NULL AND a.email != ''
        GROUP BY a.email
        ORDER BY latestSubmission DESC`
    )

    return rows.map((row) => {
        const name = [row.givenName, row.familyName]
            .filter((p): p is string => !!p && p.trim().length > 0)
            .join(" ")
            .trim()
        return {
            name: name || row.email,
            email: row.email,
            submissions: Number(row.submissions),
            latestSubmission: toIso(row.latestSubmission),
        }
    })
}
