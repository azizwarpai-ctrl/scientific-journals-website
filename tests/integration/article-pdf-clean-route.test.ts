import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GET, HEAD } from "@/app/journals/[id]/articles/[publicationId]/pdf/route"
import * as resolveJournalModule from "@/src/features/journals/server/resolve-journal"
import * as articleDetailService from "@/src/features/journals/server/article-detail-service"
import * as pdfStreamModule from "@/src/features/ojs/server/ojs-pdf-stream"
import { NextResponse } from "next/server"

describe("Article Clean PDF Route (/journals/[id]/articles/[publicationId]/pdf)", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns 404 for invalid (non-numeric) publicationId format", async () => {
    const req = new Request("https://digitopub.com/journals/ijmp/articles/abc/pdf")
    const res = await GET(req, {
      params: Promise.resolve({ id: "ijmp", publicationId: "abc" }),
    })
    expect(res.status).toBe(404)
  })

  it("returns 404 when journal cannot be resolved", async () => {
    vi.spyOn(resolveJournalModule, "resolveJournalOjsId").mockResolvedValueOnce({
      found: false,
    } as any)

    const req = new Request("https://digitopub.com/journals/nonexistent/articles/100/pdf")
    const res = await GET(req, {
      params: Promise.resolve({ id: "nonexistent", publicationId: "100" }),
    })
    expect(res.status).toBe(404)
    expect(await res.text()).toContain("Journal not found")
  })

  it("returns 404 when article is not found in OJS DB", async () => {
    vi.spyOn(resolveJournalModule, "resolveJournalOjsId").mockResolvedValueOnce({
      found: true,
      ojsId: "7",
      prismaId: 7n,
      ojsPath: "ijmp",
    })
    vi.spyOn(articleDetailService, "fetchArticleDetail").mockResolvedValueOnce(null)

    const req = new Request("https://digitopub.com/journals/ijmp/articles/99999/pdf")
    const res = await GET(req, {
      params: Promise.resolve({ id: "ijmp", publicationId: "99999" }),
    })
    expect(res.status).toBe(404)
    expect(await res.text()).toContain("Article not found")
  })

  it("returns 404 when article has no PDF galley", async () => {
    vi.spyOn(resolveJournalModule, "resolveJournalOjsId").mockResolvedValueOnce({
      found: true,
      ojsId: "7",
      prismaId: 7n,
      ojsPath: "ijmp",
    })
    vi.spyOn(articleDetailService, "fetchArticleDetail").mockResolvedValueOnce({
      publicationId: 100,
      submissionId: 200,
      journalId: 7,
      journalUrlPath: "ijmp",
      locale: "en_US",
      galleys: [],
    } as any)

    const req = new Request("https://digitopub.com/journals/ijmp/articles/100/pdf")
    const res = await GET(req, {
      params: Promise.resolve({ id: "ijmp", publicationId: "100" }),
    })
    expect(res.status).toBe(404)
    expect(await res.text()).toContain("PDF not found")
  })

  it("redirects 302 to external URL when galley is remote", async () => {
    vi.spyOn(resolveJournalModule, "resolveJournalOjsId").mockResolvedValueOnce({
      found: true,
      ojsId: "7",
      prismaId: 7n,
      ojsPath: "ijmp",
    })
    vi.spyOn(articleDetailService, "fetchArticleDetail").mockResolvedValueOnce({
      publicationId: 100,
      submissionId: 200,
      journalId: 7,
      journalUrlPath: "ijmp",
      locale: "en_US",
      galleys: [
        {
          galleyId: 10,
          label: "PDF",
          locale: "en_US",
          downloadUrl: "https://external-archive.org/papers/100.pdf",
        },
      ],
    } as any)

    const req = new Request("https://digitopub.com/journals/ijmp/articles/100/pdf")
    const res = await GET(req, {
      params: Promise.resolve({ id: "ijmp", publicationId: "100" }),
    })
    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toBe("https://external-archive.org/papers/100.pdf")
  })

  it("delegates to streamOjsPdf for local PDF galleys", async () => {
    vi.spyOn(resolveJournalModule, "resolveJournalOjsId").mockResolvedValueOnce({
      found: true,
      ojsId: "7",
      prismaId: 7n,
      ojsPath: "ijmp",
    })
    vi.spyOn(articleDetailService, "fetchArticleDetail").mockResolvedValueOnce({
      publicationId: 200048,
      submissionId: 200048,
      journalId: 7,
      journalUrlPath: "ijmp",
      locale: "en_US",
      galleys: [
        {
          galleyId: 200107,
          label: "PDF",
          locale: "en_US",
          fileId: 200351,
          downloadUrl: "/journals/ijmp/articles/200048/pdf",
        },
      ],
    } as any)

    const mockStreamRes = new NextResponse("PDF content", {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="ijmp-200048.pdf"',
      },
    })
    const streamSpy = vi
      .spyOn(pdfStreamModule, "streamOjsPdf")
      .mockResolvedValueOnce(mockStreamRes)

    const req = new Request("https://digitopub.com/journals/ijmp/articles/200048/pdf")
    const res = await GET(req, {
      params: Promise.resolve({ id: "ijmp", publicationId: "200048" }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(streamSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        journal: "ijmp",
        submissionId: "200048",
        galleyId: "200107",
        fileId: "200351",
        filename: "ijmp-200048.pdf",
        contentDisposition: "inline",
      })
    )
  })

  it("HEAD returns 200 with PDF headers when article exists", async () => {
    vi.spyOn(resolveJournalModule, "resolveJournalOjsId").mockResolvedValueOnce({
      found: true,
      ojsId: "7",
      prismaId: 7n,
      ojsPath: "ijmp",
    })
    vi.spyOn(articleDetailService, "fetchArticleDetail").mockResolvedValueOnce({
      publicationId: 200048,
      submissionId: 200048,
      journalId: 7,
      journalUrlPath: "ijmp",
      locale: "en_US",
      galleys: [
        {
          galleyId: 200107,
          label: "PDF",
          locale: "en_US",
          downloadUrl: "/journals/ijmp/articles/200048/pdf",
        },
      ],
    } as any)

    const req = new Request("https://digitopub.com/journals/ijmp/articles/200048/pdf", {
      method: "HEAD",
    })
    const res = await HEAD(req, {
      params: Promise.resolve({ id: "ijmp", publicationId: "200048" }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Content-Disposition")).toContain("ijmp-200048.pdf")
  })
})
