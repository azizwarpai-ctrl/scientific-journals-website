import type { ArticleDetail } from "../types/article-detail-types"

export type CitationFormat = "apa" | "mla" | "chicago" | "bibtex"

function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return ""
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function formatAuthorsAPA(authors: ArticleDetail['authors']): string {
  if (!authors || authors.length === 0) return "Anonymous"
  
  return authors.map((a, i) => {
    const family = escapeHtml(a.familyName || '')
    const given = a.givenName ? `${escapeHtml(a.givenName.charAt(0))}.` : ''
    const formatted = `${family}, ${given}`.trim()
    
    if (i === authors.length - 1 && authors.length > 1) {
      return `&amp; ${formatted}`
    }
    return formatted
  }).join(", ")
}

export function generateCitation(article: ArticleDetail, format: CitationFormat): string {
  const year = escapeHtml(article.year || (article.datePublished ? new Date(article.datePublished).getFullYear() : "n.d."))
  const title = escapeHtml(article.title || "Untitled")
  const journal = escapeHtml(article.journalAbbreviation || article.journalTitle || "Unknown Journal")
  const volume = article.volume ? escapeHtml(article.volume) : ""
  const issue = article.issueNumber ? `(${escapeHtml(article.issueNumber)})` : ""
  const pages = article.pages ? `, ${escapeHtml(article.pages)}` : ""
  const doiStr = article.doi ? ` https://doi.org/${escapeHtml(article.doi)}` : ""
  
  if (format === "apa") {
    const authorsStr = formatAuthorsAPA(article.authors)
    return `${authorsStr} (${year}). ${title}. <i>${journal}</i>, <i>${volume}</i>${issue}${pages}.${doiStr}`
  }

  if (format === "mla") {
    const authors = article.authors
    let authorsStr = "Anonymous"
    if (authors.length === 1) {
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}`
    } else if (authors.length === 2) {
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}, and ${escapeHtml(authors[1].givenName || '')} ${escapeHtml(authors[1].familyName || '')}`
    } else if (authors.length > 2) {
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}, et al`
    }
    authorsStr = authorsStr.trim()
    if (!authorsStr.endsWith(".")) authorsStr += "."

    const volStr = article.volume ? `vol. ${escapeHtml(article.volume)}` : ""
    const noStr = article.issueNumber ? `no. ${escapeHtml(article.issueNumber)}` : ""
    const volNo = [volStr, noStr].filter(Boolean).join(", ")
    const pStr = article.pages ? `pp. ${escapeHtml(article.pages)}` : ""
    
    const parts = [
      `<i>${journal}</i>`,
      volNo,
      year.toString(),
      pStr,
      doiStr.trim()
    ].filter(Boolean).join(", ")

    return `${authorsStr} "${title}." ${parts}.`
  }

  if (format === "chicago") {
    const authors = article.authors
    let authorsStr = "Anonymous"
    if (authors.length === 1) {
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}`
    } else if (authors.length >= 2) {
      const rest = authors.slice(1).map(a => `${escapeHtml(a.givenName || '')} ${escapeHtml(a.familyName || '')}`).join(", ")
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}, and ${rest}`
    }
    authorsStr = authorsStr.trim()
    if (!authorsStr.endsWith(".")) authorsStr += "."

    const noStr = article.issueNumber ? `, no. ${escapeHtml(article.issueNumber)}` : ""
    const pgStr = article.pages ? `: ${escapeHtml(article.pages)}` : ""

    return `${authorsStr} "${title}." <i>${journal}</i> ${volume}${noStr} (${year})${pgStr}.${doiStr}`
  }

  if (format === "bibtex") {
    const authorsStr = article.authors.length > 0 
      ? article.authors.map(a => `${escapeHtml(a.familyName || '')}, ${escapeHtml(a.givenName || '')}`).join(" and ")
      : "Anonymous"
    
    const id = article.authors.length > 0
      ? `${escapeHtml(article.authors[0]?.familyName || 'Author')}${year}`.replace(/\s+/g, "")
      : `Anonymous${year}`
    
    return `@article{${id},
  author = {${authorsStr}},
  title = {${title}},
  journal = {${journal}},
  volume = {${article.volume || ''}},
  number = {${article.issueNumber || ''}},
  year = {${year}},
  pages = {${article.pages || ''}},
  doi = {${article.doi || ''}}
}`
  }

  return `${title} (${year})`
}

