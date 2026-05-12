/**
 * Recompute lifetime per-ORCID totals into user_metrics.
 * Idempotent. Run nightly after aggregate-daily-metrics.
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"

interface AggRow {
    orcid: string
    views: bigint
    downloads: bigint
    citations: bigint
    first_seen_at: Date
    last_event_at: Date
}

async function main() {
    const rows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT
            orcid,
            SUM(CASE WHEN event_type='view' THEN 1 ELSE 0 END) AS views,
            SUM(CASE WHEN event_type='download' THEN 1 ELSE 0 END) AS downloads,
            SUM(CASE WHEN event_type='citation_export' THEN 1 ELSE 0 END) AS citations,
            MIN(created_at) AS first_seen_at,
            MAX(created_at) AS last_event_at
         FROM user_event
         WHERE orcid IS NOT NULL
         GROUP BY orcid`
    )

    let upserted = 0
    for (const r of rows) {
        await prisma.userMetrics.upsert({
            where: { orcid: r.orcid },
            create: {
                orcid: r.orcid,
                views: Number(r.views ?? 0n),
                downloads: Number(r.downloads ?? 0n),
                citations: Number(r.citations ?? 0n),
                first_seen_at: r.first_seen_at,
                last_event_at: r.last_event_at,
            },
            update: {
                views: Number(r.views ?? 0n),
                downloads: Number(r.downloads ?? 0n),
                citations: Number(r.citations ?? 0n),
                last_event_at: r.last_event_at,
            },
        })
        upserted++
    }

    // eslint-disable-next-line no-console
    console.log(`[update-user-metrics] upserted=${upserted}`)
}

main()
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[update-user-metrics] failed:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
