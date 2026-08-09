/**
 * Hard-delete user_event rows older than ~18 months — thin CLI wrapper
 * around `retentionCleanup()` in src/features/metrics/server/jobs.ts
 * (shared with the POST /api/metrics/cron/retention endpoint).
 * Idempotent; safe to re-run. Run weekly. The CLI runs without a deadline —
 * it always drains to completion.
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"
import { retentionCleanup } from "@/src/features/metrics/server/jobs"
import { withSyncRun } from "@/src/features/ojs/server/sync-runs"

async function main() {
    const result = await withSyncRun("retention_cleanup", "cron", async () => {
        const r = await retentionCleanup()
        return { status: "success" as const, stats: { ...r }, result: r }
    })
    // eslint-disable-next-line no-console
    console.log(
        `[retention-cleanup] cutoff=${result.cutoff} total_deleted=${result.totalDeleted}`
    )
}

main()
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[retention-cleanup] failed:", err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
