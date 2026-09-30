import { NextResponse } from "next/server"
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"
import { fetchArticleDetail } from "@/src/features/journals/server/article-detail-service"
import { streamOjsPdf } from "@/src/features/ojs/server/ojs-pdf-stream"

interface RouteContext {
  params: Promise<{
    id: string
    publicationId: string
  }>
}

/**
 * Public, clean PDF route for DigitoPub articles:
 * `/journals/[id]/articles/[publicationId]/pdf`
 *
 * Direct stream endpoint serving native PDF headers without being gated under `/api/`
 * (which is blocked by robots.txt). Crawlable by Google Scholar.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id, publicationId: rawPubId } = await context.params

  if (!/^[1-9]\d*$/.test(rawPubId)) {
    return new NextResponse("Invalid article ID format", { status: 404 })
  }

  const publicationId = parseInt(rawPubId, 10)

  const resolved = await resolveJournalOjsId(id)
  if (!resolved.found || !resolved.ojsId) {
    return new NextResponse("Journal not found", { status: 404 })
  }

  const article = await fetchArticleDetail(resolved.ojsId, publicationId)
  if (!article) {
    return new NextResponse("Article not found", { status: 404 })
  }

  const pdfGalley =
    article.galleys.find(
      (g) => g.label?.toLowerCase().includes("pdf") && g.locale === article.locale
    ) ||
    article.galleys.find((g) => g.label?.toLowerCase().includes("pdf")) ||
    article.galleys[0]

  if (!pdfGalley) {
    return new NextResponse("PDF not found for this article", { status: 404 })
  }

  // Handle external remote galleys via 302 redirect
  if (
    pdfGalley.downloadUrl &&
    /^https?:\/\//i.test(pdfGalley.downloadUrl) &&
    !pdfGalley.downloadUrl.includes("/pdf")
  ) {
    return NextResponse.redirect(pdfGalley.downloadUrl, 302)
  }

  const filename = `${article.journalUrlPath || "article"}-${publicationId}.pdf`

  return streamOjsPdf({
    journal: article.journalUrlPath,
    submissionId: String(article.submissionId),
    galleyId: String(pdfGalley.galleyId),
    fileId: pdfGalley.fileId ? String(pdfGalley.fileId) : undefined,
    filename,
    contentDisposition: "inline",
  })
}

export async function HEAD(request: Request, context: RouteContext) {
  const { id, publicationId: rawPubId } = await context.params

  if (!/^[1-9]\d*$/.test(rawPubId)) {
    return new NextResponse(null, { status: 404 })
  }

  const publicationId = parseInt(rawPubId, 10)

  const resolved = await resolveJournalOjsId(id)
  if (!resolved.found || !resolved.ojsId) {
    return new NextResponse(null, { status: 404 })
  }

  const article = await fetchArticleDetail(resolved.ojsId, publicationId)
  if (!article) {
    return new NextResponse(null, { status: 404 })
  }

  const pdfGalley =
    article.galleys.find(
      (g) => g.label?.toLowerCase().includes("pdf") && g.locale === article.locale
    ) ||
    article.galleys.find((g) => g.label?.toLowerCase().includes("pdf")) ||
    article.galleys[0]

  if (!pdfGalley) {
    return new NextResponse(null, { status: 404 })
  }

  const filename = `${article.journalUrlPath || "article"}-${publicationId}.pdf`

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Accept-Ranges": "none",
    },
  })
}
