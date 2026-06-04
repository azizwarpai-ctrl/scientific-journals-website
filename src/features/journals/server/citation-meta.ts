import type { ArticleDetail, ArticleDetailAuthor } from "@/src/features/journals/types/article-detail-types"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
}

export function formatAuthor(author: ArticleDetailAuthor): string {
  const family = author.familyName?.trim() || ""
  const given = author.givenName?.trim() || ""
  if (family && given) return `${family}, ${given}`
  if (family) return family
  if (given) return given
  return ""
}

export function formatScholarDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}/${mm}/${dd}`
}

function parseLocale(locale: string): string {
  return locale.split(/[_-]/)[0].toLowerCase() || "en"
}

function parsePagesFromString(pages: string | null): { pageStart: string | null; pageEnd: string | null } {
  if (!pages) return { pageStart: null, pageEnd: null }
  const trimmed = pages.trim()
  const dashMatch = trimmed.match(/[-–—]/)
  if (!dashMatch) return { pageStart: trimmed || null, pageEnd: null }
  const dashIdx = dashMatch.index!
  const start = trimmed.slice(0, dashIdx).trim()
  const end = trimmed.slice(dashIdx + 1).trim()
  return { pageStart: start || null, pageEnd: end || null }
}

/** True if the URL points at any path under `/api/` (relative or absolute). */
function pointsAtApi(url: string): boolean {
  return /(^|\/\/[^/]+)?\/api\//.test(url) || url.includes("/api/pdf-proxy")
}

/**
 * Builds the real OJS download URL for the article's PDF galley, of the form
 * `${ojsBaseUrl}/${journalUrlPath}/article/download/${submissionId}/${galleyId}`.
 *
 * Built from the CANONICAL OJS identifiers carried on the ArticleDetail — the
 * OJS `submission_id`, the PDF galley's id, and the journal `url_path` — NOT
 * the route's `[publicationId]` param (which is the OJS publication_id and is
 * not guaranteed to equal submission_id). Returns null if any piece is missing
 * or if OJS_BASE_URL is unconfigured.
 */
export function buildOjsPdfDownloadUrl(article: ArticleDetail): string | null {
  if (!article.submissionId || !article.journalUrlPath) return null

  // Only match the galley whose downloadUrl exactly equals the resolved pdfUrl.
  // No fallback to galleys[0] — an unmatched galley could be the wrong file.
  const pdfGalley = article.galleys.find(
    (g) => g.downloadUrl && g.downloadUrl === article.pdfUrl
  )
  if (!pdfGalley) return null

  let base: string
  try {
    base = getOjsBaseUrl().replace(/\/$/, "")
  } catch {
    // OJS_BASE_URL not configured — cannot build a real download URL.
    return null
  }

  return `${base}/${article.journalUrlPath}/article/download/${article.submissionId}/${pdfGalley.galleyId}`
}

export interface BuildCitationMetaOptions {
  /**
   * When true, emit `citation_pdf_url` pointing at the real OJS download URL.
   * Only set this under Option B (EMIT_SCHOLAR_CITATION_META=true). A
   * robots-blocked `/api/` URL is NEVER emitted regardless of this flag.
   */
  emitPdfUrl?: boolean
}

export function buildCitationMeta(
  article: ArticleDetail,
  articleUrl: string,
  appBaseUrl: string,
  options: BuildCitationMetaOptions = {}
): Record<string, string | string[]> {
  const meta: Record<string, string | string[]> = {}

  const set = (key: string, value: string | null | undefined) => {
    const v = typeof value === "string" ? value.trim() : value
    if (v) meta[key] = v
  }

  const setMany = (key: string, values: (string | null | undefined)[]) => {
    const cleaned = values.map((v) => v?.trim()).filter((v): v is string => !!v)
    if (cleaned.length) meta[key] = cleaned
  }

  set("citation_title", article.title ? stripHtml(article.title) : null)

  const authorStrings = article.authors.map(formatAuthor).filter(Boolean)
  setMany("citation_author", authorStrings.length ? authorStrings : ["Unknown"])

  const pubDate = formatScholarDate(article.datePublished)
    ?? (article.year ? String(article.year) : null)
  set("citation_publication_date", pubDate)

  set("citation_journal_title", article.journalTitle)
  set("citation_issn", article.issn)

  if (article.volume !== null && article.volume !== undefined) {
    set("citation_volume", String(article.volume))
  }

  set("citation_issue", article.issueNumber)

  const { pageStart, pageEnd } = parsePagesFromString(article.pages)
  set("citation_firstpage", pageStart)
  set("citation_lastpage", pageEnd)

  set("citation_doi", article.doi)

  const base = appBaseUrl.replace(/\/$/, "")
  const absoluteArticleUrl = articleUrl.startsWith("http")
    ? articleUrl
    : base && `${base}${articleUrl}`
  set("citation_abstract_html_url", absoluteArticleUrl || null)

  // citation_pdf_url (R4): we must NEVER advertise a robots-blocked PDF URL.
  // The on-page "View PDF"/download links (article.pdfUrl) route through
  // `/api/pdf-proxy`, which is `Disallow: /api/` in robots.ts and receives an
  // `X-Robots-Tag: noindex` header. Emitting it would tell Scholar to fetch a
  // URL we forbid. So:
  //   - We only emit citation_pdf_url when explicitly asked (Option B), and
  //   - even then only the REAL OJS download URL, and
  //   - never any URL under `/api/`.
  if (options.emitPdfUrl) {
    const ojsPdfUrl = buildOjsPdfDownloadUrl(article)
    if (ojsPdfUrl && !pointsAtApi(ojsPdfUrl)) {
      set("citation_pdf_url", ojsPdfUrl)
    }
  }

  set("citation_language", parseLocale(article.locale || "en"))

  if (article.keywords.length > 0) {
    set("citation_keywords", article.keywords.join("; "))
  }

  meta["citation_publisher"] = "DigitoPub"

  return meta
}
