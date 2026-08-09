import { describe, it, expect, vi, beforeEach } from 'vitest'

const ojsQueryMock = vi.fn()
vi.mock('@/src/features/ojs/server/ojs-client', () => ({
    ojsQuery: ojsQueryMock,
}))

const systemSettingFindUnique = vi.fn()
const systemSettingUpsert = vi.fn()
const journalFindMany = vi.fn()
const snapshotUpsert = vi.fn()

vi.mock('@/src/lib/db/config', () => ({
    prisma: {
        systemSetting: {
            findUnique: (...args: unknown[]) => systemSettingFindUnique(...args),
            upsert: (...args: unknown[]) => systemSettingUpsert(...args),
        },
        journal: {
            findMany: (...args: unknown[]) => journalFindMany(...args),
        },
        ojsJournalSnapshot: {
            upsert: (...args: unknown[]) => snapshotUpsert(...args),
        },
    },
}))

import { refreshOjsJournalSnapshots, SNAPSHOT_WATERMARK_KEY } from '@/src/features/ojs/server/ojs-journal-snapshots'

const WATERMARK = '2026-08-05T12:20:14.000Z'

describe('refreshOjsJournalSnapshots', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        systemSettingUpsert.mockResolvedValue({})
        snapshotUpsert.mockResolvedValue({})
        journalFindMany.mockResolvedValue([
            { id: BigInt(1), ojs_id: '7' },
            { id: BigInt(2), ojs_id: '9' },
        ])
    })

    it('skips entirely when the OJS watermark is unchanged', async () => {
        ojsQueryMock.mockResolvedValueOnce([{ w: new Date(WATERMARK) }])
        systemSettingFindUnique.mockResolvedValue({ setting_value: WATERMARK })

        const result = await refreshOjsJournalSnapshots()

        expect(result).toEqual({ refreshed: 0, skipped: true, watermark: WATERMARK })
        // Only the watermark query ran — none of the aggregate queries.
        expect(ojsQueryMock).toHaveBeenCalledTimes(1)
        expect(snapshotUpsert).not.toHaveBeenCalled()
    })

    it('refreshes all journal snapshots and advances the watermark when changed', async () => {
        ojsQueryMock
            .mockResolvedValueOnce([{ w: new Date(WATERMARK) }]) // watermark probe
            .mockResolvedValueOnce([{ jid: 7, c: 5 }]) // article counts
            .mockResolvedValueOnce([{ jid: 7, c: 2 }, { jid: 9, c: 1 }]) // issue counts
            .mockResolvedValueOnce([{ jid: 7, d: '2026-07-01 00:00:00' }]) // latest publication
            .mockResolvedValueOnce([{ jid: 7, views: '120', downloads: '30' }]) // metrics totals
        systemSettingFindUnique.mockResolvedValue({ setting_value: 'older-watermark' })

        const result = await refreshOjsJournalSnapshots()

        expect(result.skipped).toBe(false)
        expect(result.refreshed).toBe(2)
        expect(snapshotUpsert).toHaveBeenCalledTimes(2)

        const firstUpsert = snapshotUpsert.mock.calls[0][0]
        expect(firstUpsert.where).toEqual({ journal_id: BigInt(1) })
        expect(firstUpsert.create.article_count).toBe(5)
        expect(firstUpsert.create.issue_count).toBe(2)
        expect(firstUpsert.create.views_total).toBe(BigInt(120))
        expect(firstUpsert.create.downloads_total).toBe(BigInt(30))

        // Journal 9 had no article/metric rows — zero-filled, not skipped.
        const secondUpsert = snapshotUpsert.mock.calls[1][0]
        expect(secondUpsert.where).toEqual({ journal_id: BigInt(2) })
        expect(secondUpsert.create.article_count).toBe(0)
        expect(secondUpsert.create.issue_count).toBe(1)

        expect(systemSettingUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { setting_key: SNAPSHOT_WATERMARK_KEY } })
        )
    })

    it('force bypasses the watermark short-circuit', async () => {
        ojsQueryMock
            .mockResolvedValueOnce([{ w: new Date(WATERMARK) }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
        systemSettingFindUnique.mockResolvedValue({ setting_value: WATERMARK })

        const result = await refreshOjsJournalSnapshots({ force: true })

        expect(result.skipped).toBe(false)
        expect(snapshotUpsert).toHaveBeenCalledTimes(2)
    })
})
