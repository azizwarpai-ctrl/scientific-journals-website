import { describe, it, expect } from "vitest"

describe("ArticleDetail type includes audio fields", () => {
  it("audioUrl and audioDurationSeconds exist in the type", async () => {
    const detail: import("@/src/features/journals/types/article-detail-types").ArticleDetail = {
      publicationId: 1,
      submissionId: 1,
      journalId: 1,
      title: "Test",
      abstract: null,
      doi: null,
      keywords: [],
      pages: null,
      datePublished: null,
      locale: "en_US",
      authors: [],
      sectionTitle: null,
      articleCoverUrl: null,
      galleys: [],
      pdfUrl: null,
      pdfDownloadUrl: null,
      issueId: 1,
      issueTitle: null,
      volume: null,
      issueNumber: null,
      year: null,
      journalTitle: null,
      journalAbbreviation: null,
      issn: null,
      eIssn: null,
      journalUrlPath: "",
      isOpenAccess: true,
      audioUrl: "/api/audio/test-key",
      audioDurationSeconds: 120,
      views: 0,
      downloads: 0,
      citations: 0,
    }

    expect(detail.audioUrl).toBe("/api/audio/test-key")
    expect(detail.audioDurationSeconds).toBe(120)
  })

  it("audioUrl can be null", async () => {
    const detail: import("@/src/features/journals/types/article-detail-types").ArticleDetail = {
      publicationId: 1,
      submissionId: 1,
      journalId: 1,
      title: "Test",
      abstract: null,
      doi: null,
      keywords: [],
      pages: null,
      datePublished: null,
      locale: "en_US",
      authors: [],
      sectionTitle: null,
      articleCoverUrl: null,
      galleys: [],
      pdfUrl: null,
      pdfDownloadUrl: null,
      issueId: 1,
      issueTitle: null,
      volume: null,
      issueNumber: null,
      year: null,
      journalTitle: null,
      journalAbbreviation: null,
      issn: null,
      eIssn: null,
      journalUrlPath: "",
      isOpenAccess: true,
      audioUrl: null,
      audioDurationSeconds: null,
      views: 0,
      downloads: 0,
      citations: 0,
    }

    expect(detail.audioUrl).toBeNull()
    expect(detail.audioDurationSeconds).toBeNull()
  })
})

describe("CurrentIssueArticle type includes audio fields", () => {
  it("audioUrl and audioDurationSeconds are optional", async () => {
    const article: import("@/src/features/journals/types/current-issue-types").CurrentIssueArticle = {
      publicationId: 1,
      submissionId: 1,
      title: "Test",
      abstract: null,
      authors: [],
      datePublished: null,
      sectionTitle: null,
      sectionId: null,
      articleCoverUrl: null,
      pdfUrl: null,
      pdfDownloadUrl: null,
      isOpenAccess: true,
    }

    expect(article.audioUrl).toBeUndefined()
    expect(article.audioDurationSeconds).toBeUndefined()

    const withAudio: import("@/src/features/journals/types/current-issue-types").CurrentIssueArticle = {
      ...article,
      audioUrl: "/api/audio/test",
      audioDurationSeconds: 60,
    }

    expect(withAudio.audioUrl).toBe("/api/audio/test")
    expect(withAudio.audioDurationSeconds).toBe(60)
  })
})
