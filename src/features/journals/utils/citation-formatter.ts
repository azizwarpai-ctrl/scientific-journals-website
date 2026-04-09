import type { ArticleDetail } from "@/src/features/journals"

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

function bibtexEscape(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return ""
  return String(text)
    .replace(/\\/g, "\\\\") // Must be first
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/&/g, "\\&")
    .replace(/_/g, "\\_")
    .replace(/\^/g, "\\^")
    .replace(/~/g, "\\~")
    .trim()
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

export function generateCitation(
  article: ArticleDetail, 
  format: CitationFormat,
  options?: { htmlPreview?: boolean }
): string {
  // Robust year extraction
  let year: string | number = "n.d."
  if (article.year != null) {
    year = article.year
  } else if (article.datePublished) {
    const d = new Date(article.datePublished)
    if (!isNaN(d.getTime())) {
      year = d.getFullYear()
    }
  }

  const escapedYear = escapeHtml(year)
  const title = escapeHtml(article.title || "Untitled")
  const journal = escapeHtml(article.journalAbbreviation || article.journalTitle || "Unknown Journal")
  const volume = article.volume != null ? escapeHtml(article.volume) : ""
  const issue = article.issueNumber != null ? `(${escapeHtml(article.issueNumber)})` : ""
  const pages = article.pages ? `, ${escapeHtml(article.pages)}` : ""
  const doiStr = article.doi ? ` https://doi.org/${escapeHtml(article.doi)}` : ""
  
  if (format === "apa") {
    const authorsStr = formatAuthorsAPA(article.authors)
    // APA style: Journal Title, Volume(Issue), Pages.
    // If volume is missing, avoid the empty italic tag and ensure correct comma/space logic.
    const volSection = volume ? `, <i>${volume}</i>${issue}` : (issue ? ` ${issue}` : "")
    return `${authorsStr} (${escapedYear}). ${title}. <i>${journal}</i>${volSection}${pages}.${doiStr}`
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

    const volStr = article.volume != null ? `vol. ${escapeHtml(article.volume)}` : ""
    const noStr = article.issueNumber ? `no. ${escapeHtml(article.issueNumber)}` : ""
    const volNo = [volStr, noStr].filter(Boolean).join(", ")
    const pStr = article.pages ? `pp. ${escapeHtml(article.pages)}` : ""
    
    const parts = [
      `<i>${journal}</i>`,
      volNo,
      escapedYear.toString(),
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
    } else if (authors.length === 2) {
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}, and ${escapeHtml(authors[1].givenName || '')} ${escapeHtml(authors[1].familyName || '')}`
    } else if (authors.length >= 3) {
      const rest = authors.slice(1, -1).map(a => `${escapeHtml(a.givenName || '')} ${escapeHtml(a.familyName || '')}`)
      const last = authors[authors.length - 1]
      const lastStr = `${escapeHtml(last.givenName || '')} ${escapeHtml(last.familyName || '')}`
      
      authorsStr = `${escapeHtml(authors[0].familyName || '')}, ${escapeHtml(authors[0].givenName || '')}, ${rest.join(", ")}, and ${lastStr}`
    }
    authorsStr = authorsStr.trim()
    if (!authorsStr.endsWith(".")) authorsStr += "."

    const noStr = article.issueNumber ? `, no. ${escapeHtml(article.issueNumber)}` : ""
    const pgStr = article.pages ? `: ${escapeHtml(article.pages)}` : ""

    return `${authorsStr} "${title}." <i>${journal}</i> ${volume}${noStr} (${escapedYear})${pgStr}.${doiStr}`
  }

  if (format === "bibtex") {
    // BibTeX should NOT be HTML escaped but must be BibTeX-escaped
    const authorsStr = article.authors.length > 0 
      ? article.authors.map(a => `${bibtexEscape(a.familyName || '')}, ${bibtexEscape(a.givenName || '')}`).join(" and ")
      : "Anonymous"
    
    const firstAuthor = article.authors[0]?.familyName || 'Author'
    const bibtexId = bibtexEscape(`${firstAuthor}${year}`.replace(/[^a-zA-Z0-9]/g, ""))
    
    const bibtex = `@article{${bibtexId},
  author = {${authorsStr}},
  title = {${bibtexEscape(article.title) || 'Untitled'}},
  journal = {${bibtexEscape(article.journalAbbreviation || article.journalTitle) || 'Unknown Journal'}},
  volume = {${bibtexEscape(article.volume)}},
  number = {${bibtexEscape(article.issueNumber)}},
  year = {${bibtexEscape(year)}},
  pages = {${bibtexEscape(article.pages)}},
  doi = {${bibtexEscape(article.doi)}}
}`

    return options?.htmlPreview ? escapeHtml(bibtex) : bibtex
  }

  return `${title} (${escapedYear})`
}

