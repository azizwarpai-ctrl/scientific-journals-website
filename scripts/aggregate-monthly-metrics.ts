/**
 * Monthly rollup — thin CLI wrapper around `aggregateMonthlyMetrics()` in
 * src/features/metrics/server/jobs.ts (shared with the
 * POST /api/metrics/cron/monthly endpoint).
 *
 * Usage:
 *   bun run scripts/aggregate-monthly-metrics.ts
 *   bun run scripts/aggregate-monthly-metrics.ts --month=2026-05
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"
import { aggregateMonthlyMetrics } from "@/src/features/metrics/server/jobs"
import { withSyncRun } from "@/src/features/ojs/server/sync-runs"

function parseTargetMonth(argv: string[]): { year: number; month: number } | undefined {
    const flag = argv.find((a) => a.startsWith("--month="))
    if (!flag) return undefined
    const [y, m] = flag.slice(8).split("-").map(Number)
    return { year: y, month: m }
}

async function main() {
    const result = await withSyncRun("metrics_monthly_aggregation", "cron", async () => {
        const r = await aggregateMonthlyMetrics(parseTargetMonth(process.argv))
        return { status: "success" as const, stats: { ...r }, result: r }
    })
    const mm = String(result.month).padStart(2, "0")
    // eslint-disable-next-line no-console
    console.log(`[aggregate-monthly-metrics] ${result.year}-${mm} upserted=${result.upserted}`)
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
