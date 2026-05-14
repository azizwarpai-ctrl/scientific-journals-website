/**
 * Monthly rollup. Reads metrics_article_daily for the target month (default:
 * previous month UTC) and upserts one row per article into metrics_article_monthly.
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"

function parseTargetMonth(argv: string[]): { year: number; month: number } {
    const flag = argv.find((a) => a.startsWith("--month="))
    if (flag) {
        const [y, m] = flag.slice(8).split("-").map(Number)
        return { year: y, month: m }
    }
    const now = new Date()
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    return { year: target.getUTCFullYear(), month: target.getUTCMonth() + 1 }
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
    const { year, month } = parseTargetMonth(process.argv)
    const mm = String(month).padStart(2, "0")
    const dayPrefix = `${year}-${mm}-`

    const rows = await prisma.$queryRawUnsafe<AggRow[]>(
        `SELECT
            article_id,
            journal_id,
            SUM(views) AS views,
            SUM(unique_views) AS unique_views,
            SUM(downloads) AS downloads,
            SUM(unique_downloads) AS unique_downloads,
            SUM(citations) AS citations
         FROM metrics_article_daily
         WHERE day LIKE ? AND source='digitopub'
         GROUP BY article_id, journal_id`,
        `${dayPrefix}%`
    )

    let upserted = 0
    for (const r of rows) {
        await prisma.metricsArticleMonthly.upsert({
            where: {
                article_id_year_month_source: {
                    article_id: r.article_id,
                    year,
                    month,
                    source: "digitopub",
                },
            },
            create: {
                article_id: r.article_id,
                journal_id: r.journal_id,
                year,
                month,
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
    console.log(`[aggregate-monthly-metrics] ${year}-${mm} upserted=${upserted}`)
}

main()
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[aggregate-monthly-metrics] failed:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
