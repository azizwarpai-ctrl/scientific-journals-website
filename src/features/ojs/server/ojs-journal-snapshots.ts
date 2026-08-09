import { prisma } from "@/src/lib/db/config"

export const SNAPSHOT_WATERMARK_KEY = "ojs_snapshot_watermark"

// OJS metrics_submission assoc_type constants (same values used by
// scripts/backfill-ojs-metrics.ts): abstract/landing views and galley
// downloads respectively.
const ASSOC_TYPE_SUBMISSION = 1048585
const ASSOC_TYPE_SUBMISSION_FILE = 515

export interface SnapshotRefreshResult {
    refreshed: number
    skipped: boolean
    watermark: string | null
}

/**
 * Mirrors per-journal hot aggregates (article/issue counts, latest
 * publication date, lifetime views/downloads) from OJS into
 * `ojs_journal_snapshots` so the admin dashboard never queries OJS MySQL on
 * the request path. OJS stays canonical; this is a pull-only cache with
 * provenance (`captured_at`).
 *
 * Watermark-incremental: `submissions`/`publications`/`issues` all carry
 * `last_modified` (verified against the live OJS 3.5.0.2 DB — see
 * docs/ops/discovery-2026-08.md). When nothing changed since the stored
 * watermark the refresh is skipped entirely. Pass `force` to bypass.
 */
export async function refreshOjsJournalSnapshots(
    opts: { force?: boolean } = {}
): Promise<SnapshotRefreshResult> {
    const { ojsQuery } = await import("./ojs-client")

    const watermarkRows = await ojsQuery<{ w: string | Date | null }>(
        `SELECT MAX(m) AS w FROM (
            SELECT MAX(last_modified) AS m FROM submissions
            UNION ALL SELECT MAX(last_modified) FROM publications
            UNION ALL SELECT MAX(last_modified) FROM issues
        ) t`
    )
    const rawWatermark = watermarkRows?.[0]?.w ?? null
    const watermark = rawWatermark instanceof Date ? rawWatermark.toISOString() : rawWatermark ? String(rawWatermark) : null

    if (!opts.force && watermark) {
        const stored = await prisma.systemSetting.findUnique({
            where: { setting_key: SNAPSHOT_WATERMARK_KEY },
            select: { setting_value: true },
        })
        if (stored?.setting_value === watermark) {
            return { refreshed: 0, skipped: true, watermark }
        }
    }

    // A handful of GROUP BYs over a small dataset (13 journals / ~100
    // submissions at discovery time) — full recompute is cheaper than
    // per-journal incremental bookkeeping at this scale.
    const [articleCounts, issueCounts, latestPublications, metricsTotals] = await Promise.all([
        ojsQuery<{ jid: number; c: number }>(
            `SELECT context_id AS jid, COUNT(*) AS c
             FROM submissions WHERE status = 3 GROUP BY context_id`
        ),
        ojsQuery<{ jid: number; c: number }>(
            `SELECT journal_id AS jid, COUNT(*) AS c
             FROM issues WHERE published = 1 GROUP BY journal_id`
        ),
        ojsQuery<{ jid: number; d: string | Date | null }>(
            `SELECT s.context_id AS jid, MAX(p.date_published) AS d
             FROM publications p
             INNER JOIN submissions s ON s.submission_id = p.submission_id
             WHERE p.status = 3 GROUP BY s.context_id`
        ),
        ojsQuery<{ jid: number; views: number | string | null; downloads: number | string | null }>(
            `SELECT context_id AS jid,
                    SUM(CASE WHEN assoc_type = ${ASSOC_TYPE_SUBMISSION} THEN metric ELSE 0 END) AS views,
                    SUM(CASE WHEN assoc_type = ${ASSOC_TYPE_SUBMISSION_FILE} THEN metric ELSE 0 END) AS downloads
             FROM metrics_submission GROUP BY context_id`
        ),
    ])

    const byJid = new Map<string, { articles?: number; issues?: number; latest?: Date | null; views?: bigint; downloads?: bigint }>()
    const entry = (jid: number | string) => {
        const key = String(jid)
        let e = byJid.get(key)
        if (!e) { e = {}; byJid.set(key, e) }
        return e
    }
    for (const r of articleCounts) entry(r.jid).articles = Number(r.c)
    for (const r of issueCounts) entry(r.jid).issues = Number(r.c)
    for (const r of latestPublications) {
        const d = r.d ? new Date(r.d) : null
        entry(r.jid).latest = d && !Number.isNaN(d.getTime()) ? d : null
    }
    for (const r of metricsTotals) {
        entry(r.jid).views = BigInt(Math.round(Number(r.views ?? 0)))
        entry(r.jid).downloads = BigInt(Math.round(Number(r.downloads ?? 0)))
    }

    // Resolve OJS journal_id → local Journal.id via the ojs_id linking key.
    const journals = await prisma.journal.findMany({
        where: { ojs_id: { not: null } },
        select: { id: true, ojs_id: true },
    })

    let refreshed = 0
    const capturedAt = new Date()
    for (const journal of journals) {
        const agg = byJid.get(journal.ojs_id as string) ?? {}
        await prisma.ojsJournalSnapshot.upsert({
            where: { journal_id: journal.id },
            create: {
                journal_id: journal.id,
                article_count: agg.articles ?? 0,
                issue_count: agg.issues ?? 0,
                latest_publication_at: agg.latest ?? null,
                views_total: agg.views ?? BigInt(0),
                downloads_total: agg.downloads ?? BigInt(0),
                captured_at: capturedAt,
            },
            update: {
                article_count: agg.articles ?? 0,
                issue_count: agg.issues ?? 0,
                latest_publication_at: agg.latest ?? null,
                views_total: agg.views ?? BigInt(0),
                downloads_total: agg.downloads ?? BigInt(0),
                captured_at: capturedAt,
            },
        })
        refreshed++
    }

    if (watermark) {
        await prisma.systemSetting.upsert({
            where: { setting_key: SNAPSHOT_WATERMARK_KEY },
            create: {
                setting_key: SNAPSHOT_WATERMARK_KEY,
                setting_value: watermark,
                description: "Max OJS last_modified seen at last snapshot refresh",
            },
            update: { setting_value: watermark },
        })
    }

    return { refreshed, skipped: false, watermark }
}
