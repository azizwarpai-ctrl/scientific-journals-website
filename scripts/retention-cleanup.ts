/**
 * Hard-delete user_event rows older than 18 months, in batches of 50000.
 * Idempotent; safe to re-run. Run weekly.
 */

import "dotenv/config"
import { prisma } from "@/src/lib/db/config"

const BATCH = 50_000
const RETENTION_DAYS = 18 * 30 // ~18 months

async function main() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    let totalDeleted = 0
    for (;;) {
        const result = await prisma.$executeRawUnsafe(
            "DELETE FROM user_event WHERE created_at < ? ORDER BY id LIMIT ?",
            cutoff,
            BATCH
        )
        const deleted = Number(result)
        totalDeleted += deleted
        if (deleted < BATCH) break
        // Yield a moment before the next batch to keep replicas comfortable.
        await new Promise((r) => setTimeout(r, 250))
    }

    // eslint-disable-next-line no-console
    console.log(
        `[retention-cleanup] cutoff=${cutoff.toISOString()} total_deleted=${totalDeleted}`
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
