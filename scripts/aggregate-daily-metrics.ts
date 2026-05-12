/**
 * UIET-P1 nightly aggregation.
 *
 * Reads the previous UTC day's user_event rows and upserts one row into
 * metrics_article_daily per (article_id, day, source='digitopub'). Idempotent
 * via the UNIQUE index on (article_id, day, source).
 *
 * Usage:
 *   bun run scripts/aggregate-daily-metrics.ts
 *   bun run scripts/aggregate-daily-metrics.ts --day=2026-05-11
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"

function parseDay(argv: string[]): string {
    const flag = argv.find((a) => a.startsWith("--day="))
    if (flag) return flag.slice(6)
    // Default: previous UTC day.
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
}

interface AggRow {
    article_id: bigint
    journal_id: bigint
    views: bigint
    unique_views: bigint
    downloads: bigint
    unique_downloads: bigint
    citations: bigint
}

async function main() {
    const day = parseDay(process.argv)
    const start = new Date(`${day}T00:00:00.000Z`)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    // Raw aggregation query. We do GROUP BY (article_id, journal_id) so the
    // daily row carries both. unique_* counts use DISTINCT dedup_key.
    const rows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT
            article_id,
            journal_id,
            SUM(CASE WHEN event_type='view' THEN 1 ELSE 0 END) AS views,
            COUNT(DISTINCT CASE WHEN event_type='view' THEN dedup_key ELSE NULL END) AS unique_views,
            SUM(CASE WHEN event_type='download' THEN 1 ELSE 0 END) AS downloads,
            COUNT(DISTINCT CASE WHEN event_type='download' THEN dedup_key ELSE NULL END) AS unique_downloads,
            SUM(CASE WHEN event_type='citation_export' THEN 1 ELSE 0 END) AS citations
         FROM user_event
         WHERE created_at >= ? AND created_at < ?
         GROUP BY article_id, journal_id`,
        start,
        end
    )

    let upserted = 0
    for (const r of rows) {
        await prisma.metricsArticleDaily.upsert({
            where: {
                // Composite unique key: must match @@unique([article_id, day, source])
                article_id_day_source: {
                    article_id: r.article_id,
                    day,
                    source: "digitopub",
                },
            },
            create: {
                article_id: r.article_id,
                journal_id: r.journal_id,
                day,
                views: Number(r.views ?? 0n),
                unique_views: Number(r.unique_views ?? 0n),
                downloads: Number(r.downloads ?? 0n),
                unique_downloads: Number(r.unique_downloads ?? 0n),
                citations: Number(r.citations ?? 0n),
                source: "digitopub",
            },
            update: {
                journal_id: r.journal_id,
                views: Number(r.views ?? 0n),
                unique_views: Number(r.unique_views ?? 0n),
                downloads: Number(r.downloads ?? 0n),
                unique_downloads: Number(r.unique_downloads ?? 0n),
                citations: Number(r.citations ?? 0n),
                computed_at: new Date(),
            },
        })
        upserted++
    }

    // eslint-disable-next-line no-console
    console.log(`[aggregate-daily-metrics] day=${day} upserted=${upserted}`)
}

main()
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[aggregate-daily-metrics] failed:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
