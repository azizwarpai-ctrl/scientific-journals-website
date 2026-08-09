import { prisma } from "@/src/lib/db/config"

export type SyncRunStatus = "running" | "success" | "partial" | "failed"
export type SyncRunTrigger = "cron" | "http" | "drift" | "manual"

/**
 * Observability ledger for recurring jobs. Locking stays in
 * `system_settings` (`ojs_sync_lock`); a SyncRun row records what actually
 * happened so failures are visible without shell access to the host.
 *
 * Ledger writes are best-effort: a failure to write the ledger must never
 * break the job itself.
 */
export async function startRun(
    jobName: string,
    triggeredBy: SyncRunTrigger
): Promise<bigint | null> {
    try {
        const run = await prisma.syncRun.create({
            data: { job_name: jobName, triggered_by: triggeredBy },
            select: { id: true },
        })
        return run.id
    } catch (error) {
        console.error(`[sync-runs] failed to record start of ${jobName}:`, error)
        return null
    }
}

export async function finishRun(
    runId: bigint | null,
    status: Exclude<SyncRunStatus, "running">,
    stats?: Record<string, unknown>,
    error?: string
): Promise<void> {
    if (runId === null) return
    try {
        await prisma.syncRun.update({
            where: { id: runId },
            data: {
                status,
                finished_at: new Date(),
                stats: stats ? JSON.parse(JSON.stringify(stats)) : undefined,
                // Mirror the ojs-write-guard convention: cap stored error text.
                error: error ? error.slice(0, 1000) : undefined,
            },
        })
    } catch (err) {
        console.error(`[sync-runs] failed to record finish of run ${runId}:`, err)
    }
}

/**
 * Wraps a job body with start/finish ledger writes. The job decides its own
 * status via the returned object; thrown errors are recorded as `failed`
 * and re-thrown.
 */
export async function withSyncRun<T>(
    jobName: string,
    triggeredBy: SyncRunTrigger,
    job: () => Promise<{ status: Exclude<SyncRunStatus, "running">; stats?: Record<string, unknown>; error?: string; result: T }>
): Promise<T> {
    const runId = await startRun(jobName, triggeredBy)
    try {
        const outcome = await job()
        await finishRun(runId, outcome.status, outcome.stats, outcome.error)
        return outcome.result
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await finishRun(runId, "failed", undefined, message)
        throw error
    }
}
