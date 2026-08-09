import { prisma } from "@/src/lib/db/config"
import {
    normalizeBound,
    type TimeseriesMetric,
    type TimeseriesQuery,
} from "../schemas/timeseries-schema"
import type { TimeseriesResponse, TimeseriesSeries } from "../types/admin-analytics-types"

/**
 * Sources per metric:
 * - views/unique_views/downloads/unique_downloads/citations come from the
 *   UIET-P1 aggregation tables (metrics_article_daily / _monthly).
 *   `source='ojs_legacy_backfill'` rows are EXCLUDED: they encode "all
 *   pre-launch history" collapsed into one month and would chart as a fake
 *   traffic spike. Cumulative lifetime totals belong to snapshots/summary,
 *   not this chart.
 * - submissions / published_articles are counted from their own tables'
 *   date columns — always truthful, so `hasData` is always true for them.
 *
 * Null rules (fabrication-guard contract): when a metrics-table metric has
 * ZERO rows overall (collection never ran), every point is `null` and
 * `hasData` is false — the UI renders "No data yet", never a flat zero line.
 * Once any data exists, missing days are honest zeros.
 */

const METRIC_COLUMNS = {
    views: "views",
    unique_views: "unique_views",
    downloads: "downloads",
    unique_downloads: "unique_downloads",
    citations: "citations",
} as const

type MetricsTableMetric = keyof typeof METRIC_COLUMNS

function isMetricsTableMetric(m: TimeseriesMetric): m is MetricsTableMetric {
    return m in METRIC_COLUMNS
}

/** Dense, inclusive date spine (`YYYY-MM-DD` for day, `YYYY-MM` for month). */
export function buildDateSpine(from: string, to: string, interval: "day" | "month"): string[] {
    const spine: string[] = []
    if (interval === "day") {
        const end = Date.parse(`${to}T00:00:00.000Z`)
        for (let t = Date.parse(`${from}T00:00:00.000Z`); t <= end; t += 86_400_000) {
            spine.push(new Date(t).toISOString().slice(0, 10))
        }
        return spine
    }
    const [fy, fm] = from.split("-").map(Number)
    const [ty, tm] = to.split("-").map(Number)
    for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? (y++, m = 1) : m++) {
        spine.push(`${y}-${String(m).padStart(2, "0")}`)
    }
    return spine
}

interface BucketTotals {
    views: number
    unique_views: number
    downloads: number
    unique_downloads: number
    citations: number
}

async function loadMetricsBuckets(
    query: TimeseriesQuery,
    from: string,
    to: string
): Promise<{ buckets: Map<string, BucketTotals>; anyRows: boolean }> {
    const journalFilter = query.journalId !== undefined ? { journal_id: query.journalId } : {}
    const sourceFilter = { source: { not: "ojs_legacy_backfill" } }
    const buckets = new Map<string, BucketTotals>()

    if (query.interval === "day") {
        const [anyRow, rows] = await Promise.all([
            prisma.metricsArticleDaily.findFirst({ where: { ...sourceFilter, ...journalFilter }, select: { id: true } }),
            prisma.metricsArticleDaily.groupBy({
                by: ["day"],
                where: { ...sourceFilter, ...journalFilter, day: { gte: from, lte: to } },
                _sum: { views: true, unique_views: true, downloads: true, unique_downloads: true, citations: true },
            }),
        ])
        for (const r of rows) {
            buckets.set(r.day, {
                views: r._sum.views ?? 0,
                unique_views: r._sum.unique_views ?? 0,
                downloads: r._sum.downloads ?? 0,
                unique_downloads: r._sum.unique_downloads ?? 0,
                citations: r._sum.citations ?? 0,
            })
        }
        return { buckets, anyRows: anyRow !== null }
    }

    const [fy, fm] = from.split("-").map(Number)
    const [ty, tm] = to.split("-").map(Number)
    const [anyRow, rows] = await Promise.all([
        prisma.metricsArticleMonthly.findFirst({ where: { ...sourceFilter, ...journalFilter }, select: { id: true } }),
        prisma.metricsArticleMonthly.groupBy({
            by: ["year", "month"],
            where: {
                ...sourceFilter,
                ...journalFilter,
                OR: [
                    { year: { gt: fy, lt: ty } },
                    ...(fy === ty
                        ? [{ year: fy, month: { gte: fm, lte: tm } }]
                        : [
                              { year: fy, month: { gte: fm } },
                              { year: ty, month: { lte: tm } },
                          ]),
                ],
            },
            _sum: { views: true, unique_views: true, downloads: true, unique_downloads: true, citations: true },
        }),
    ])
    for (const r of rows) {
        buckets.set(`${r.year}-${String(r.month).padStart(2, "0")}`, {
            views: r._sum.views ?? 0,
            unique_views: r._sum.unique_views ?? 0,
            downloads: r._sum.downloads ?? 0,
            unique_downloads: r._sum.unique_downloads ?? 0,
            citations: r._sum.citations ?? 0,
        })
    }
    return { buckets, anyRows: anyRow !== null }
}

function bucketKeyForDate(d: Date, interval: "day" | "month"): string {
    const iso = d.toISOString()
    return interval === "day" ? iso.slice(0, 10) : iso.slice(0, 7)
}

async function loadCountBuckets(
    metric: "submissions" | "published_articles",
    query: TimeseriesQuery,
    from: string,
    to: string
): Promise<Map<string, number>> {
    const rangeStart = new Date(`${query.interval === "day" ? from : `${from}-01`}T00:00:00.000Z`)
    // Exclusive upper bound: day after `to` (or first day of month after `to`).
    let rangeEnd: Date
    if (query.interval === "day") {
        rangeEnd = new Date(Date.parse(`${to}T00:00:00.000Z`) + 86_400_000)
    } else {
        const [y, m] = to.split("-").map(Number)
        rangeEnd = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1))
    }

    const journalFilter = query.journalId !== undefined ? { journal_id: query.journalId } : {}
    const buckets = new Map<string, number>()

    // Tiny tables (~100 rows) — fetch the date column and bucket in JS.
    if (metric === "submissions") {
        const rows = await prisma.submission.findMany({
            where: { ...journalFilter, submission_date: { gte: rangeStart, lt: rangeEnd } },
            select: { submission_date: true },
        })
        for (const r of rows) {
            const key = bucketKeyForDate(r.submission_date, query.interval)
            buckets.set(key, (buckets.get(key) ?? 0) + 1)
        }
    } else {
        const rows = await prisma.publishedArticle.findMany({
            where: { ...journalFilter, publication_date: { gte: rangeStart, lt: rangeEnd } },
            select: { publication_date: true },
        })
        for (const r of rows) {
            const key = bucketKeyForDate(r.publication_date, query.interval)
            buckets.set(key, (buckets.get(key) ?? 0) + 1)
        }
    }
    return buckets
}

export async function getTimeseries(query: TimeseriesQuery): Promise<TimeseriesResponse> {
    const from = normalizeBound(query.from, query.interval) as string
    const to = normalizeBound(query.to, query.interval) as string
    const spine = buildDateSpine(from, to, query.interval)

    const needsMetricsTable = query.metrics.some(isMetricsTableMetric)
    const metricsData = needsMetricsTable
        ? await loadMetricsBuckets(query, from, to)
        : { buckets: new Map<string, BucketTotals>(), anyRows: false }

    const series: TimeseriesSeries[] = []
    for (const metric of query.metrics) {
        if (isMetricsTableMetric(metric)) {
            const hasData = metricsData.anyRows
            series.push({
                metric,
                hasData,
                points: spine.map((date) => ({
                    date,
                    value: hasData ? metricsData.buckets.get(date)?.[metric] ?? 0 : null,
                })),
            })
        } else {
            const buckets = await loadCountBuckets(metric, query, from, to)
            series.push({
                metric,
                hasData: true,
                points: spine.map((date) => ({ date, value: buckets.get(date) ?? 0 })),
            })
        }
    }

    return {
        interval: query.interval,
        from,
        to,
        series,
        computedAt: new Date().toISOString(),
    }
}
