import type { RowDataPacket } from "mysql2/promise"
import { prisma } from "@/src/lib/db/config"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { getOjsSubmissionCountsByJournal } from "@/src/features/ojs/server/ojs-stats-service"
import { getSyncedJournalIds } from "@/src/features/ojs/server/ojs-shared"
import { completeSubmissionPredicate } from "@/src/features/reviews/server/ojs-review-constants"
import { deriveFunnel } from "../utils/funnel"
import type {
  MonthlyPoint,
  StatusDistribution,
  JournalBreakdownRow,
} from "@/src/features/admin-analytics/types/charts-types"

export { deriveFunnel }

/**
 * Returns parameter placeholders and parameter values for context_id queries.
 * Handles both scoped journalId and the full set of synced journal IDs.
 */
function contextParams(ids: number[], journalId?: number): { sql: string; params: any[] } {
  if (journalId && Number.isInteger(journalId) && journalId > 0) {
    return { sql: "= ?", params: [journalId] }
  }
  return { sql: `IN (${ids.map(() => "?").join(",")})`, params: [...ids] }
}

/** N "YYYY-MM" labels (UTC), oldest→newest, ending in `end`'s month. */
export function monthSpine(end: Date, months: number): string[] {
  const out: string[] = []
  const y = end.getUTCFullYear()
  const m = end.getUTCMonth() // 0-based
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1))
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return out
}

interface YmRow extends RowDataPacket { ym: string; c: number | string }

export async function getMonthlySeries(
  opts: { journalId?: number; months?: number; now?: Date } = {}
): Promise<MonthlyPoint[]> {
  const months = opts.months && opts.months > 0 && opts.months <= 24 ? opts.months : 12
  const spine = monthSpine(opts.now ?? new Date(), months)
  const ids = await getSyncedJournalIds()
  const base: MonthlyPoint[] = spine.map((month) => ({ month, submissions: 0, publications: 0 }))
  if (!ids.length) return base
  // A scoped journalId must be a member of the synced set, else the query
  // would leak counts for a journal DigitoPub does not surface.
  if (opts.journalId && !ids.includes(opts.journalId)) return base

  const { sql: ctxSql, params: ctxParams } = contextParams(ids, opts.journalId)
  // Lower bound = first day of the oldest spine month (UTC), 'YYYY-MM-01 00:00:00'.
  const since = `${spine[0]}-01 00:00:00`

  const [subs, pubs] = await Promise.all([
    ojsQuery<YmRow>(
      `SELECT DATE_FORMAT(s.date_submitted, '%Y-%m') AS ym, COUNT(*) AS c
       FROM submissions s
       WHERE s.context_id ${ctxSql} AND s.date_submitted >= ?
       GROUP BY ym`,
      [...ctxParams, since]
    ),
    ojsQuery<YmRow>(
      `SELECT DATE_FORMAT(p.date_published, '%Y-%m') AS ym, COUNT(*) AS c
       FROM publications p
       JOIN submissions s ON s.submission_id = p.submission_id
       WHERE s.context_id ${ctxSql} AND p.status = 3 AND p.date_published >= ?
       GROUP BY ym`,
      [...ctxParams, since]
    ),
  ])

  const byMonth = new Map(base.map((p) => [p.month, p]))
  for (const r of subs) { const p = byMonth.get(r.ym); if (p) p.submissions = Number(r.c) }
  for (const r of pubs) { const p = byMonth.get(r.ym); if (p) p.publications = Number(r.c) }
  return base
}

interface StatusRow extends RowDataPacket {
  inReview: number; inProduction: number; published: number; declined: number
}

export async function getStatusDistribution(
  opts: { journalId?: number } = {}
): Promise<StatusDistribution> {
  const empty = { inReview: 0, inProduction: 0, published: 0, declined: 0 }
  const ids = await getSyncedJournalIds()
  if (!ids.length) return empty
  // A scoped journalId must be a member of the synced set (see getMonthlySeries).
  if (opts.journalId && !ids.includes(opts.journalId)) return empty
  const { sql: ctxSql, params: ctxParams } = contextParams(ids, opts.journalId)
  const rows = await ojsQuery<StatusRow>(
    `SELECT
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctxSql}
          AND s.stage_id IN (2,3) AND s.status = 1 AND ${completeSubmissionPredicate("s")}) AS inReview,
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctxSql}
          AND s.stage_id IN (4,5) AND s.status = 1) AS inProduction,
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctxSql} AND s.status = 3) AS published,
       (SELECT COUNT(*) FROM submissions s WHERE s.context_id ${ctxSql} AND s.status = 4) AS declined`,
     [...ctxParams, ...ctxParams, ...ctxParams, ...ctxParams]
  )
  const r = rows[0]
  return {
    inReview: Number(r?.inReview ?? 0),
    inProduction: Number(r?.inProduction ?? 0),
    published: Number(r?.published ?? 0),
    declined: Number(r?.declined ?? 0),
  }
}

export async function getByJournalBreakdown(): Promise<JournalBreakdownRow[]> {
  const [snapshots, counts] = await Promise.all([
    prisma.ojsJournalSnapshot.findMany({
      select: {
        article_count: true,
        views_total: true,
        downloads_total: true,
        journal: { select: { ojs_id: true, title: true } },
      },
    }),
    getOjsSubmissionCountsByJournal(),
  ])
  return snapshots.reduce<JournalBreakdownRow[]>((rows, s) => {
    const ojsId = s.journal?.ojs_id
    if (!ojsId) return rows
    rows.push({
      ojsId,
      title: s.journal?.title ?? ojsId,
      submissions: counts.get(ojsId) ?? 0,
      articles: s.article_count ?? 0,
      views: Number(s.views_total ?? 0),
      downloads: Number(s.downloads_total ?? 0),
    })
    return rows
  }, [])
}

