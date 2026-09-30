/**
 * Issue #175 — submission_id fallback in fetchArticleDetail
 *
 * When an OJS DOI resolver (or legacy URL) supplies a submission_id instead of
 * a publication_id, the first query returns no rows.  The service must then
 * re-query using `submissions.submission_id` joined to
 * `submissions.current_publication_id`, and recurse with the resolved
 * publication_id so all downstream logic runs against the correct record.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ----- module mock --------------------------------------------------------
// We mock the OJS query client so we can simulate mismatched IDs without
// a real database.

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
  ojsQuery: vi.fn(),
}))

// Stub out prisma / storage so the function never tries to hit real services.
vi.mock("@/src/lib/db/config", () => ({
  prisma: {
    articleAudio: { findFirst: vi.fn().mockResolvedValue(null) },
    metricsArticleMonthly: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { views: 0, downloads: 0, citations: 0 } }),
    },
  },
}))

vi.mock("@/src/lib/storage", () => ({
  getStorage: vi.fn().mockReturnValue({ signedReadUrl: vi.fn().mockResolvedValue("") }),
}))

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { fetchArticleDetail } from "@/src/features/journals/server/article-detail-service"

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

const PUBLISHED = 3

/** Minimal ArticleDbRow fixture (publication-first lookup) */
const makeArticleRow = (overrides: Record<string, unknown> = {}) => ({
  publication_id: 1001,
  submission_id: 2001,
  date_published: "2024-06-01",
  doi: "10.1234/test.001",
  journal_id: 5,
  issue_id: 42,
  volume: "1",
  number: "1",
  year: "2024",
  journal_url_path: "testjournal",
  issue_title: "Vol 1 No 1",
  journal_title: "Test Journal",
  journal_abbreviation: "TJ",
  issn: "1234-5678",
  e_issn: "8765-4321",
  section_id: 10,
  section_title: "Articles",
  primary_locale: "en_US",
  access_status: 1,
  ...overrides,
})

/** Convenience: make the mock return a sequence of responses */
function mockOjsSequence(responses: unknown[][]) {
  const mock = vi.mocked(ojsQuery)
  let call = 0
  mock.mockImplementation(async () => {
    const res = responses[call] ?? []
    call++
    return res as Awaited<ReturnType<typeof ojsQuery>>
  })
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("fetchArticleDetail — submission_id fallback (Issue #175)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when both publication_id and submission_id lookups find nothing", async () => {
    mockOjsSequence([
      // 1st call: publication_id lookup → empty
      [],
      // 2nd call: submission_id fallback → empty
      [],
    ])

    const result = await fetchArticleDetail("5", 9999)
    expect(result).toBeNull()
  })

  it("resolves and returns article when only submission_id lookup matches", async () => {
    const resolvedRow = makeArticleRow({ publication_id: 1001, submission_id: 2001 })

    // The fallback returns a row with publication_id = 1001.
    // The recursive call with publication_id = 1001 should then succeed.
    mockOjsSequence([
      // 1st call (publication_id = 9999) → not found
      [],
      // 2nd call: submission_id fallback (submission_id = 9999) → resolves to pub 1001
      [resolvedRow],
      // 3rd call: recursive — publication_id = 1001 main query → found
      [resolvedRow],
      // 4th call: publication_settings (no keywords → triggers 5th call)
      [{ setting_name: "title", setting_value: "Fallback Article", locale: "en_US" }],
      // 5th call: controlled_vocabs keyword fetch
      [],
      // 6th call: authors
      [],
      // 7th call: galleys
      [],
      // 8th call: metrics_submission
      [{ views: 0, downloads: 0 }],
      // 9th call: citations
      [{ count: 0 }],
    ])

    const result = await fetchArticleDetail("5", 9999)
    expect(result).not.toBeNull()
    expect(result!.publicationId).toBe(1001)
    expect(result!.submissionId).toBe(2001)
    expect(result!.title).toBe("Fallback Article")
  })

  it("does NOT trigger fallback when publication_id lookup succeeds", async () => {
    const row = makeArticleRow()

    mockOjsSequence([
      // 1st call: publication_id lookup → found directly
      [row],
      // 2nd call: publication_settings (no keywords → triggers 3rd call)
      [{ setting_name: "title", setting_value: "Direct Article", locale: "en_US" }],
      // 3rd call: controlled_vocabs keyword fetch
      [],
      // 4th call: authors
      [],
      // 5th call: galleys
      [],
      // 6th call: metrics_submission
      [{ views: 10, downloads: 5 }],
      // 7th call: citations
      [{ count: 2 }],
    ])

    const result = await fetchArticleDetail("5", 1001)
    expect(result).not.toBeNull()
    expect(result!.publicationId).toBe(1001)
    expect(result!.title).toBe("Direct Article")

    const queryMock = vi.mocked(ojsQuery)
    // The service makes the following queries for a successful direct lookup:
    //   1. publication_id primary lookup
    //   2. publication_settings
    //   3. controlled_vocabs keyword fetch (when keywords list is empty)
    //   4. authors
    //   5. galleys
    //   6. metrics_submission
    //   7. citations
    // The submission_id fallback query must NOT be among these calls.
    expect(queryMock).toHaveBeenCalledTimes(7)
    // None of the SQL strings should contain the submissions-first JOIN pattern
    const calls = queryMock.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(calls.some((sql: string) => sql.includes("FROM submissions s") && sql.includes("current_publication_id"))).toBe(false)
  })

  it("returns null for invalid (non-numeric) journal ID even with fallback", async () => {
    const result = await fetchArticleDetail("not-a-number", 100)
    expect(result).toBeNull()
    // ojsQuery should never have been called at all
    expect(vi.mocked(ojsQuery)).not.toHaveBeenCalled()
  })
})
