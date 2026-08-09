import { describe, it, expect, vi, beforeEach } from 'vitest'

const dailyFindFirst = vi.fn()
const dailyGroupBy = vi.fn()
const monthlyFindFirst = vi.fn()
const monthlyGroupBy = vi.fn()
const submissionFindMany = vi.fn()
const publishedFindMany = vi.fn()

vi.mock('@/src/lib/db/config', () => ({
    prisma: {
        metricsArticleDaily: {
            findFirst: (...a: unknown[]) => dailyFindFirst(...a),
            groupBy: (...a: unknown[]) => dailyGroupBy(...a),
        },
        metricsArticleMonthly: {
            findFirst: (...a: unknown[]) => monthlyFindFirst(...a),
            groupBy: (...a: unknown[]) => monthlyGroupBy(...a),
        },
        submission: { findMany: (...a: unknown[]) => submissionFindMany(...a) },
        publishedArticle: { findMany: (...a: unknown[]) => publishedFindMany(...a) },
    },
}))

import { buildDateSpine, getTimeseries } from '@/src/features/admin-analytics/server/timeseries'
import { timeseriesQuerySchema } from '@/src/features/admin-analytics/schemas/timeseries-schema'

describe('buildDateSpine', () => {
    it('builds an inclusive daily spine across month boundaries', () => {
        const spine = buildDateSpine('2026-01-30', '2026-02-02', 'day')
        expect(spine).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'])
    })

    it('handles leap-year February', () => {
        const spine = buildDateSpine('2024-02-28', '2024-03-01', 'day')
        expect(spine).toEqual(['2024-02-28', '2024-02-29', '2024-03-01'])
    })

    it('builds a monthly spine across year boundaries', () => {
        const spine = buildDateSpine('2025-11', '2026-02', 'month')
        expect(spine).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
    })

    it('single-point spine when from === to', () => {
        expect(buildDateSpine('2026-08-08', '2026-08-08', 'day')).toEqual(['2026-08-08'])
        expect(buildDateSpine('2026-08', '2026-08', 'month')).toEqual(['2026-08'])
    })
})

describe('timeseriesQuerySchema', () => {
    const base = { metrics: 'views', interval: 'day', from: '2026-08-01', to: '2026-08-08' }

    it('parses CSV metrics and coerces journalId', () => {
        const q = timeseriesQuerySchema.parse({ ...base, metrics: 'views, downloads', journalId: '7' })
        expect(q.metrics).toEqual(['views', 'downloads'])
        expect(q.journalId).toBe(BigInt(7))
    })

    it('rejects unknown metrics', () => {
        expect(() => timeseriesQuerySchema.parse({ ...base, metrics: 'views,bogus' })).toThrow()
    })

    it('rejects from > to', () => {
        expect(() => timeseriesQuerySchema.parse({ ...base, from: '2026-08-09', to: '2026-08-01' })).toThrow()
    })

    it('rejects ranges over 400 points', () => {
        expect(() => timeseriesQuerySchema.parse({ ...base, from: '2024-01-01', to: '2026-08-08' })).toThrow()
    })

    it('accepts YYYY-MM bounds for interval=month and rejects month 13', () => {
        const q = timeseriesQuerySchema.parse({ ...base, interval: 'month', from: '2026-01', to: '2026-06' })
        expect(q.interval).toBe('month')
        expect(() => timeseriesQuerySchema.parse({ ...base, interval: 'month', from: '2026-13', to: '2026-14' })).toThrow()
    })
})

describe('getTimeseries — null-vs-zero contract', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        submissionFindMany.mockResolvedValue([])
        publishedFindMany.mockResolvedValue([])
    })

    it('all-null points with hasData:false when the metrics table is empty', async () => {
        dailyFindFirst.mockResolvedValue(null)
        dailyGroupBy.mockResolvedValue([])

        const q = timeseriesQuerySchema.parse({ metrics: 'views', interval: 'day', from: '2026-08-01', to: '2026-08-03' })
        const result = await getTimeseries(q)

        expect(result.series[0].hasData).toBe(false)
        expect(result.series[0].points.map((p) => p.value)).toEqual([null, null, null])
    })

    it('honest zeros for missing days once any data exists', async () => {
        dailyFindFirst.mockResolvedValue({ id: BigInt(1) })
        dailyGroupBy.mockResolvedValue([
            { day: '2026-08-02', _sum: { views: 5, unique_views: 3, downloads: 1, unique_downloads: 1, citations: 0 } },
        ])

        const q = timeseriesQuerySchema.parse({ metrics: 'views', interval: 'day', from: '2026-08-01', to: '2026-08-03' })
        const result = await getTimeseries(q)

        expect(result.series[0].hasData).toBe(true)
        expect(result.series[0].points).toEqual([
            { date: '2026-08-01', value: 0 },
            { date: '2026-08-02', value: 5 },
            { date: '2026-08-03', value: 0 },
        ])
    })

    it('count metrics are always truthful (hasData true, zeros allowed)', async () => {
        submissionFindMany.mockResolvedValue([
            { submission_date: new Date('2026-08-02T10:00:00.000Z') },
            { submission_date: new Date('2026-08-02T15:00:00.000Z') },
        ])

        const q = timeseriesQuerySchema.parse({ metrics: 'submissions', interval: 'day', from: '2026-08-01', to: '2026-08-03' })
        const result = await getTimeseries(q)

        expect(result.series[0].hasData).toBe(true)
        expect(result.series[0].points).toEqual([
            { date: '2026-08-01', value: 0 },
            { date: '2026-08-02', value: 2 },
            { date: '2026-08-03', value: 0 },
        ])
    })

    it('excludes ojs_legacy_backfill rows from the source filter', async () => {
        dailyFindFirst.mockResolvedValue(null)
        dailyGroupBy.mockResolvedValue([])

        const q = timeseriesQuerySchema.parse({ metrics: 'downloads', interval: 'day', from: '2026-08-01', to: '2026-08-01' })
        await getTimeseries(q)

        const groupByArgs = dailyGroupBy.mock.calls[0][0] as { where: { source: unknown } }
        expect(groupByArgs.where.source).toEqual({ not: 'ojs_legacy_backfill' })
        const findFirstArgs = dailyFindFirst.mock.calls[0][0] as { where: { source: unknown } }
        expect(findFirstArgs.where.source).toEqual({ not: 'ojs_legacy_backfill' })
    })

    it('monthly interval buckets by year-month', async () => {
        monthlyFindFirst.mockResolvedValue({ id: BigInt(1) })
        monthlyGroupBy.mockResolvedValue([
            { year: 2026, month: 7, _sum: { views: 10, unique_views: 8, downloads: 2, unique_downloads: 2, citations: 1 } },
        ])

        const q = timeseriesQuerySchema.parse({ metrics: 'views,citations', interval: 'month', from: '2026-06', to: '2026-08' })
        const result = await getTimeseries(q)

        expect(result.series[0].points).toEqual([
            { date: '2026-06', value: 0 },
            { date: '2026-07', value: 10 },
            { date: '2026-08', value: 0 },
        ])
        expect(result.series[1].points[1]).toEqual({ date: '2026-07', value: 1 })
    })
})
