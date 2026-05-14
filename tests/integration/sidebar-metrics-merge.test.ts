import { describe, it, expect, beforeEach, vi } from "vitest"

const hoisted = vi.hoisted(() => ({
    ojsQuery: vi.fn(),
    isOjsConfigured: vi.fn(() => true),
    fetchNewAuthorAffiliations: vi.fn(async () => []),
    resolveAuthorAffiliation: vi.fn(() => null),
    parseOjsCoverFilename: vi.fn(() => null),
    buildCoverUrl: vi.fn(() => null),
    buildGalleyDownloadUrl: vi.fn(() => null),
    isOpenAccessStatus: vi.fn((s: number | null | undefined) => s === 1),
    sanitizeHtml: vi.fn((s: string) => s),
    metricsArticleMonthlyAggregate: vi.fn(),
}))

vi.mock("sanitize-html", () => ({
    default: hoisted.sanitizeHtml,
}))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
    ojsQuery: hoisted.ojsQuery,
    isOjsConfigured: hoisted.isOjsConfigured,
}))

vi.mock("@/src/features/journals/server/ojs-cover-utils", () => ({
    parseOjsCoverFilename: hoisted.parseOjsCoverFilename,
    buildCoverUrl: hoisted.buildCoverUrl,
}))

vi.mock("@/src/features/journals/server/ojs-galley-utils", () => ({
    buildGalleyDownloadUrl: hoisted.buildGalleyDownloadUrl,
    isOpenAccessStatus: hoisted.isOpenAccessStatus,
}))

vi.mock("@/src/features/journals/server/author-affiliation", () => ({
    fetchNewAuthorAffiliations: hoisted.fetchNewAuthorAffiliations,
    resolveAuthorAffiliation: hoisted.resolveAuthorAffiliation,
}))

vi.mock("@/src/lib/db/config", () => ({
    prisma: {
        metricsArticleMonthly: {
            aggregate: hoisted.metricsArticleMonthlyAggregate,
        },
    },
}))

import { fetchArticleDetail } from "@/src/features/journals/server/article-detail-service"

describe("article-detail-service merges OJS + digitopub metrics", () => {
    beforeEach(() => {
        hoisted.ojsQuery.mockReset()
        hoisted.metricsArticleMonthlyAggregate.mockReset()
    })

    it("sums OJS metrics_submission + digitopub metrics_article_monthly", async () => {
        // 1. Main article row.
        hoisted.ojsQuery.mockResolvedValueOnce([
            {
                publication_id: 100,
                submission_id: 200,
                date_published: "2026-01-01",
                doi: null,
                journal_id: 7,
                issue_id: 1,
                volume: "1",
                number: "1",
                year: "2026",
                journal_url_path: "physics",
                issue_title: null,
                journal_title: "Physics J",
                journal_abbreviation: "PJ",
                issn: null,
                e_issn: null,
                section_id: null,
                section_title: null,
                primary_locale: "en_US",
                access_status: 1, // OA
            },
        ])
        // 2. Publication settings.
        hoisted.ojsQuery.mockResolvedValueOnce([
            { setting_name: "title", setting_value: "Test article", locale: "en_US" },
        ])
        // 3. Keywords from controlled_vocabs (empty)
        hoisted.ojsQuery.mockResolvedValueOnce([])
        // 4. Authors (none)
        hoisted.ojsQuery.mockResolvedValueOnce([])
        // 5. Galleys (none)
        hoisted.ojsQuery.mockResolvedValueOnce([])
        // 6. Metrics from OJS: 100 views, 50 downloads.
        hoisted.ojsQuery.mockResolvedValueOnce([{ views: "100", downloads: "50" }])
        // 7. Citations from OJS: 3.
        hoisted.ojsQuery.mockResolvedValueOnce([{ count: 3 }])

        // 8. digitopub aggregate: 20 views, 5 downloads, 2 citations.
        hoisted.metricsArticleMonthlyAggregate.mockResolvedValueOnce({
            _sum: { views: 20, downloads: 5, citations: 2 },
        })

        const result = await fetchArticleDetail("7", 100)
        expect(result).not.toBeNull()
        expect(result!.views).toBe(120)
        expect(result!.downloads).toBe(55)
        expect(result!.citations).toBe(5)
    })

    it("tolerates digitopub aggregate failure and returns OJS-only counts", async () => {
        hoisted.ojsQuery.mockResolvedValueOnce([
            {
                publication_id: 100,
                submission_id: 200,
                date_published: "2026-01-01",
                doi: null,
                journal_id: 7,
                issue_id: 1,
                volume: "1",
                number: "1",
                year: "2026",
                journal_url_path: "physics",
                issue_title: null,
                journal_title: "Physics J",
                journal_abbreviation: "PJ",
                issn: null,
                e_issn: null,
                section_id: null,
                section_title: null,
                primary_locale: "en_US",
                access_status: 1,
            },
        ])
        hoisted.ojsQuery.mockResolvedValueOnce([
            { setting_name: "title", setting_value: "T", locale: "en_US" },
        ])
        hoisted.ojsQuery.mockResolvedValueOnce([])
        hoisted.ojsQuery.mockResolvedValueOnce([])
        hoisted.ojsQuery.mockResolvedValueOnce([])
        hoisted.ojsQuery.mockResolvedValueOnce([{ views: "10", downloads: "5" }])
        hoisted.ojsQuery.mockResolvedValueOnce([{ count: 1 }])
        hoisted.metricsArticleMonthlyAggregate.mockRejectedValueOnce(new Error("db down"))

        const result = await fetchArticleDetail("7", 100)
        expect(result).not.toBeNull()
        expect(result!.views).toBe(10)
        expect(result!.downloads).toBe(5)
        expect(result!.citations).toBe(1)
    })
})
