/**
 * UIET-P1 nightly aggregation — thin CLI wrapper around
 * `aggregateDailyMetrics()` in src/features/metrics/server/jobs.ts (shared
 * with the POST /api/metrics/cron/daily endpoint).
 *
 * Usage:
 *   bun run scripts/aggregate-daily-metrics.ts
 *   bun run scripts/aggregate-daily-metrics.ts --day=2026-05-11
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"
import { aggregateDailyMetrics } from "@/src/features/metrics/server/jobs"
import { withSyncRun } from "@/src/features/ojs/server/sync-runs"

function parseDay(argv: string[]): string | undefined {
    const flag = argv.find((a) => a.startsWith("--day="))
    return flag ? flag.slice(6) : undefined
}

async function main() {
    const result = await withSyncRun("metrics_daily_aggregation", "cron", async () => {
        const r = await aggregateDailyMetrics(parseDay(process.argv))
        return { status: "success" as const, stats: { ...r }, result: r }
    })
    // eslint-disable-next-line no-console
    console.log(`[aggregate-daily-metrics] day=${result.day} upserted=${result.upserted}`)
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
