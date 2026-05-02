import type { ArticleDetail, ArticleDetailAuthor } from "@/src/features/journals/types/article-detail-types"

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
  const dashIdx = trimmed.indexOf("-")
  if (dashIdx === -1) return { pageStart: trimmed || null, pageEnd: null }
  const start = trimmed.slice(0, dashIdx).trim()
  const end = trimmed.slice(dashIdx + 1).trim()
  return { pageStart: start || null, pageEnd: end || null }
}

export function buildCitationMeta(
  article: ArticleDetail,
  articleUrl: string
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

  set("citation_publication_date", formatScholarDate(article.datePublished))
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

  meta["citation_abstract_html_url"] = articleUrl

  if (article.pdfUrl) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""
    const pdfUrl = article.pdfUrl.startsWith("http")
      ? article.pdfUrl
      : `${appUrl}${article.pdfUrl}`
    set("citation_pdf_url", pdfUrl)
  }

  set("citation_language", parseLocale(article.locale || "en"))

  if (article.keywords.length > 0) {
    set("citation_keywords", article.keywords.join("; "))
  }

  meta["citation_publisher"] = "DigitoPub"

  return meta
}
