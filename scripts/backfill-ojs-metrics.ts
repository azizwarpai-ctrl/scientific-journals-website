/**
 * One-time backfill: seed OJS's cumulative metrics_submission totals into
 * digitopub's metrics_article_monthly under source='ojs_legacy_backfill',
 * dated the day before the configured launch month.
 *
 * After this runs, the sidebar's OJS+digitopub sum is correct from day one
 * (the digitopub forward count starts at zero; the legacy backfill row
 * represents everything OJS measured before UIET-P1 launched).
 *
 * Idempotency: aborts if any rows already exist with source='ojs_legacy_backfill'.
 *
 * Usage:
 *   bun run scripts/backfill-ojs-metrics.ts --confirm-once
 *   bun run scripts/backfill-ojs-metrics.ts --confirm-once --launch-month=2026-05
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"
import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"

const OJS_ASSOC_TYPE_VIEW = 1048585
const OJS_ASSOC_TYPE_DOWNLOAD = 515

function parseLaunchMonth(argv: string[]): { year: number; month: number } {
    const flag = argv.find((a) => a.startsWith("--launch-month="))
    if (flag) {
        const [y, m] = flag.slice(15).split("-").map(Number)
        return { year: y, month: m }
    }
    const now = new Date()
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

interface OjsRow {
    submission_id: number
    journal_id: number
    views: string | number | null
    downloads: string | number | null
    citations: string | number | null
    publication_id: number | null
}

async function main() {
    if (!process.argv.includes("--confirm-once")) {
        console.error(
            "Refusing to run without --confirm-once. This script is a ONE-TIME backfill."
        )
        process.exit(1)
    }
    if (!isOjsConfigured()) {
        console.error("OJS is not configured (OJS_DATABASE_* env vars missing).")
        process.exit(1)
    }

    // Refuse to re-run if any legacy-backfill rows exist.
    const existing = await prisma.metricsArticleMonthly.findFirst({
        where: { source: "ojs_legacy_backfill" },
    })
    if (existing) {
        console.error(
            "[backfill] Aborting: metrics_article_monthly already contains rows " +
                "with source='ojs_legacy_backfill'. This script must only run once."
        )
        process.exit(1)
    }

    const launch = parseLaunchMonth(process.argv)
    // Record the backfill against the month BEFORE launch so the sum is
    // attributed to "historical OJS".
    const target = new Date(Date.UTC(launch.year, launch.month - 2, 1))
    const year = target.getUTCFullYear()
    const month = target.getUTCMonth() + 1
    console.log(`[backfill] Seeding OJS totals into ${year}-${String(month).padStart(2, "0")}`)

    // Read aggregated counts per (submission_id) from OJS, then merge in
    // publication_id (most recent published one per submission) so we can
    // store under article_id = publication_id (matches the rest of the schema).
    const rows = await ojsQuery<OjsRow>(
        `SELECT
            m.submission_id,
            s.context_id AS journal_id,
            SUM(CASE WHEN m.assoc_type = ${OJS_ASSOC_TYPE_VIEW} THEN m.metric ELSE 0 END) AS views,
            SUM(CASE WHEN m.assoc_type = ${OJS_ASSOC_TYPE_DOWNLOAD} THEN m.metric ELSE 0 END) AS downloads,
            (SELECT COUNT(*) FROM citations c WHERE c.publication_id = p.publication_id) AS citations,
            p.publication_id
         FROM metrics_submission m
         INNER JOIN submissions s ON s.submission_id = m.submission_id
         LEFT JOIN publications p ON p.submission_id = m.submission_id AND p.status = 3
         WHERE s.status = 3
         GROUP BY m.submission_id`
    )

    let inserted = 0
    for (const r of rows) {
        if (!r.publication_id) continue
        await prisma.metricsArticleMonthly.create({
            data: {
                article_id: BigInt(r.publication_id),
                journal_id: BigInt(r.journal_id),
                year,
                month,
                views: Number(r.views ?? 0),
                unique_views: 0,
                downloads: Number(r.downloads ?? 0),
                unique_downloads: 0,
                citations: Number(r.citations ?? 0),
                source: "ojs_legacy_backfill",
            },
        })
        inserted++
    }

    console.log(`[backfill] Inserted ${inserted} rows. Done.`)
}

main()
    .catch((err) => {
        console.error("[backfill] failed:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
