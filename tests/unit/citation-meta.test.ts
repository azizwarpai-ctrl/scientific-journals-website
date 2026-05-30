import { describe, it, expect } from "vitest"
import { buildCitationMeta } from "@/src/features/journals/server/citation-meta"
import type { ArticleDetail } from "@/src/features/journals/types/article-detail-types"

function makeArticle(overrides: Partial<ArticleDetail> = {}): ArticleDetail {
  return {
    publicationId: 999,
    submissionId: 100,
    journalId: 7,
    title: "On the Migratory Patterns of Test Fixtures",
    abstract: "<p>An abstract.</p>",
    doi: "10.1234/abc.100",
    keywords: ["fixtures", "testing"],
    pages: "10-20",
    datePublished: "2024-03-15",
    locale: "en_US",
    authors: [
      { givenName: "Ada", familyName: "Lovelace", affiliation: null, orcid: null },
    ],
    sectionTitle: "Articles",
    articleCoverUrl: null,
    galleys: [
      { galleyId: 5, label: "PDF", locale: "en", downloadUrl: "/api/pdf-proxy?x=1" },
    ],
    pdfUrl: "/api/pdf-proxy?x=1",
    issueId: 3,
    issueTitle: "Spring",
    volume: 12,
    issueNumber: "2",
    year: 2024,
    journalTitle: "Journal of Testing",
    journalAbbreviation: "JoT",
    issn: "1234-5678",
    eIssn: "8765-4321",
    journalUrlPath: "jot",
    isOpenAccess: true,
    views: 0,
    downloads: 0,
    citations: 0,
    ...overrides,
  }
}

describe("buildCitationMeta", () => {
  const articleUrl = "/journals/7/articles/999"
  const appBase = "https://digitopub.com"

  it("emits the core citation_* fields", () => {
    const meta = buildCitationMeta(makeArticle(), articleUrl, appBase)
    expect(meta.citation_title).toBe("On the Migratory Patterns of Test Fixtures")
    expect(meta.citation_author).toEqual(["Lovelace, Ada"])
    expect(meta.citation_doi).toBe("10.1234/abc.100")
    expect(meta.citation_journal_title).toBe("Journal of Testing")
  })

  it("omits citation_pdf_url by default (never advertises a robots-blocked /api/ URL)", () => {
    const meta = buildCitationMeta(makeArticle(), articleUrl, appBase)
    expect(meta.citation_pdf_url).toBeUndefined()
  })

  it("still omits citation_pdf_url when emitPdfUrl is false", () => {
    const meta = buildCitationMeta(makeArticle(), articleUrl, appBase, { emitPdfUrl: false })
    expect(meta.citation_pdf_url).toBeUndefined()
  })

  it("emits the real OJS download URL as citation_pdf_url when emitPdfUrl is true", () => {
    const meta = buildCitationMeta(makeArticle(), articleUrl, appBase, { emitPdfUrl: true })
    // OJS_BASE_URL is set to http://localhost:8000 by vitest.config.ts.
    // Built from the canonical OJS submissionId (100), PDF galleyId (5) and
    // journal url_path (jot) — never the route param, never an /api/ URL.
    expect(meta.citation_pdf_url).toBe(
      "http://localhost:8000/jot/article/download/100/5"
    )
    expect(String(meta.citation_pdf_url)).not.toContain("/api/")
  })

  it("never emits an /api/ citation_pdf_url even when emitPdfUrl is true and only galley data is missing", () => {
    const meta = buildCitationMeta(
      makeArticle({ galleys: [], submissionId: 100 }),
      articleUrl,
      appBase,
      { emitPdfUrl: true }
    )
    expect(meta.citation_pdf_url).toBeUndefined()
  })
})
