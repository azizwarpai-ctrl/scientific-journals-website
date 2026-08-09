import { prisma } from "@/src/lib/db/config"
import type { SyncHealthJob, SyncHealthResponse, SyncHealthRunSummary } from "../types/admin-analytics-types"

const RECENT_RUNS_FETCH = 200

interface RunRow {
    id: bigint
    job_name: string
    status: string
    triggered_by: string
    started_at: Date
    finished_at: Date | null
    stats: unknown
    error: string | null
}

function durationMs(run: RunRow): number | null {
    return run.finished_at ? run.finished_at.getTime() - run.started_at.getTime() : null
}

function toRunSummary(run: RunRow): SyncHealthRunSummary {
    return {
        status: run.status,
        startedAt: run.started_at.toISOString(),
        durationMs: durationMs(run),
    }
}

/** Pure aggregation over ledger rows — exported for unit tests. */
export function summarizeSyncRuns(rows: RunRow[], perJobLimit: number): SyncHealthResponse {
    const byJob = new Map<string, RunRow[]>()
    for (const row of rows) {
        const list = byJob.get(row.job_name)
        if (list) list.push(row)
        else byJob.set(row.job_name, [row])
    }

    const jobs: SyncHealthJob[] = []
    let totalFailureStreak = 0
    for (const [jobName, runs] of byJob) {
        // rows arrive newest-first
        const last = runs[0]
        const lastSuccess = runs.find((r) => r.status === "success")

        // Consecutive non-success runs from the most recent backwards.
        // `partial` counts toward the streak (the job did not fully complete);
        // an in-flight `running` run neither breaks nor extends it.
        let failureStreak = 0
        for (const r of runs) {
            if (r.status === "running") continue
            if (r.status === "success") break
            failureStreak++
        }
        totalFailureStreak += failureStreak

        jobs.push({
            jobName,
            lastRun: {
                id: String(last.id),
                status: last.status,
                triggeredBy: last.triggered_by,
                startedAt: last.started_at.toISOString(),
                finishedAt: last.finished_at ? last.finished_at.toISOString() : null,
                durationMs: durationMs(last),
                error: last.error,
                stats: (last.stats as Record<string, unknown> | null) ?? null,
            },
            lastSuccessAt: lastSuccess ? lastSuccess.started_at.toISOString() : null,
            failureStreak,
            recentRuns: runs.slice(0, perJobLimit).map(toRunSummary),
        })
    }

    jobs.sort((a, b) => a.jobName.localeCompare(b.jobName))
    return { jobs, totalFailureStreak, computedAt: new Date().toISOString() }
}

export async function getSyncHealth(perJobLimit: number): Promise<SyncHealthResponse> {
    const rows = (await prisma.syncRun.findMany({
        orderBy: { started_at: "desc" },
        take: RECENT_RUNS_FETCH,
    })) as RunRow[]
    return summarizeSyncRuns(rows, perJobLimit)
}
