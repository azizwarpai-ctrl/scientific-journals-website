/**
 * Recompute lifetime per-ORCID totals into user_metrics — thin CLI wrapper
 * around `updateUserMetrics()` in src/features/metrics/server/jobs.ts
 * (shared with the POST /api/metrics/cron/user endpoint).
 * Idempotent. Run nightly after aggregate-daily-metrics.
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"
import { updateUserMetrics } from "@/src/features/metrics/server/jobs"
import { withSyncRun } from "@/src/features/ojs/server/sync-runs"

async function main() {
    const result = await withSyncRun("user_metrics_update", "cron", async () => {
        const r = await updateUserMetrics()
        return { status: "success" as const, stats: { ...r }, result: r }
    })
    // eslint-disable-next-line no-console
    console.log(`[update-user-metrics] upserted=${result.upserted}`)
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
