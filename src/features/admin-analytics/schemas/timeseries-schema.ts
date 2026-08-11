import { z } from "zod"

export const TIMESERIES_METRICS = [
    "views",
    "unique_views",
    "downloads",
    "unique_downloads",
    "citations",
    "submissions",
    "published_articles",
] as const

export type TimeseriesMetric = (typeof TIMESERIES_METRICS)[number]

const metricEnum = z.enum(TIMESERIES_METRICS)

const DATE_RE = /^\d{4}-\d{2}(-\d{2})?$/

/**
 * Query for GET /admin-analytics/timeseries.
 *
 * `metrics` arrives as a comma-separated string (`?metrics=views,downloads`).
 * `from`/`to` accept `YYYY-MM-DD` (interval=day) or `YYYY-MM` (interval=month);
 * range size is capped at 400 points to bound response size and query cost.
 */
export const timeseriesQuerySchema = z
    .object({
        metrics: z
            .string()
            .transform((s) => s.split(",").map((m) => m.trim()).filter(Boolean))
            .pipe(z.array(metricEnum).min(1).max(TIMESERIES_METRICS.length)),
        interval: z.enum(["day", "month"]).default("day"),
        from: z.string().regex(DATE_RE, "Expected YYYY-MM-DD or YYYY-MM"),
        to: z.string().regex(DATE_RE, "Expected YYYY-MM-DD or YYYY-MM"),
        journalId: z.coerce.bigint().positive().optional(),
    })
    .superRefine((q, ctx) => {
        const from = normalizeBound(q.from, q.interval)
        const to = normalizeBound(q.to, q.interval)
        if (from === null || to === null) {
            ctx.addIssue({
                code: "custom",
                message: `Invalid ${q.interval === "day" ? "date" : "month"} bound`,
            })
            return
        }
        if (from > to) {
            ctx.addIssue({ code: "custom", message: "`from` must be <= `to`" })
            return
        }
        const points = q.interval === "day" ? daySpanInclusive(from, to) : monthSpanInclusive(from, to)
        if (points > 400) {
            ctx.addIssue({ code: "custom", message: `Range too large: ${points} points (max 400)` })
        }
    })

export type TimeseriesQuery = z.infer<typeof timeseriesQuerySchema>

/**
 * Query for GET /admin-analytics/sync-health.
 *
 * `limit` valid range is 1..50. `.catch(10).default(10)` preserves the prior
 * handler behavior: missing, invalid, or out-of-range values return 10 rather
 * than producing a 400.
 */
export const syncHealthQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).catch(10).default(10),
})

export type SyncHealthQuery = z.infer<typeof syncHealthQuerySchema>

/** Normalizes a bound to the interval's canonical form; null when invalid. */
export function normalizeBound(bound: string, interval: "day" | "month"): string | null {
    if (interval === "month") {
        const month = bound.slice(0, 7)
        return /^\d{4}-\d{2}$/.test(month) && isValidMonth(month) ? month : null
    }
    const day = bound.length === 7 ? `${bound}-01` : bound
    const d = new Date(`${day}T00:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function isValidMonth(month: string): boolean {
    const m = Number(month.slice(5, 7))
    return m >= 1 && m <= 12
}

export function daySpanInclusive(fromDay: string, toDay: string): number {
    const from = Date.parse(`${fromDay}T00:00:00.000Z`)
    const to = Date.parse(`${toDay}T00:00:00.000Z`)
    return Math.round((to - from) / 86_400_000) + 1
}

export function monthSpanInclusive(fromMonth: string, toMonth: string): number {
    const [fy, fm] = fromMonth.split("-").map(Number)
    const [ty, tm] = toMonth.split("-").map(Number)
    return (ty - fy) * 12 + (tm - fm) + 1
}
