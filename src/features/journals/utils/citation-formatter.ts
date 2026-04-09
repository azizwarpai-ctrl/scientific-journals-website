import type { ArticleDetail } from "../types/article-detail-types"

export type CitationFormat = "apa" | "mla" | "chicago" | "bibtex"

function formatAuthorsAPA(authors: ArticleDetail['authors']): string {
  if (!authors || authors.length === 0) return "Anonymous"
  
  return authors.map((a, i) => {
    const family = a.familyName || ''
    const given = a.givenName ? `${a.givenName.charAt(0)}.` : ''
    const formatted = `${family}, ${given}`.trim()
    
    if (i === authors.length - 1 && authors.length > 1) {
      return `& ${formatted}`
    }
    return formatted
  }).join(", ")
}

export function generateCitation(article: ArticleDetail, format: CitationFormat): string {
  const year = article.year || (article.datePublished ? new Date(article.datePublished).getFullYear() : "n.d.")
  const title = article.title || "Untitled"
  const journal = article.journalAbbreviation || article.journalTitle || "Unknown Journal"
  const volume = article.volume ? `${article.volume}` : ""
  const issue = article.issueNumber ? `(${article.issueNumber})` : ""
  const pages = article.pages ? `, ${article.pages}` : ""
  const doiStr = article.doi ? ` https://doi.org/${article.doi}` : ""
  
  if (format === "apa") {
    // Author, A. A., & Author, B. B. (Year). Title. Journal, Vol(Issue), Pages. DOI
    // APA dictates Journal and Volume are italicized
    const authorsStr = formatAuthorsAPA(article.authors)
    return `${authorsStr} (${year}). ${title}. <i>${journal}</i>, <i>${volume}</i>${issue}${pages}.${doiStr}`
  }

  if (format === "mla") {
    // Author. "Title." Journal, vol. 1, no. 1, Year, pp. xxx. DOI
    // MLA dictates Journal is italicized
    const authors = article.authors
    let authorsStr = "Anonymous"
    if (authors.length === 1) {
      authorsStr = `${authors[0].familyName || ''}, ${authors[0].givenName || ''}`
    } else if (authors.length === 2) {
      authorsStr = `${authors[0].familyName || ''}, ${authors[0].givenName || ''}, and ${authors[1].givenName || ''} ${authors[1].familyName || ''}`
    } else if (authors.length > 2) {
      authorsStr = `${authors[0].familyName || ''}, ${authors[0].givenName || ''}, et al`
    }
    authorsStr = authorsStr.trim()
    if (!authorsStr.endsWith(".")) authorsStr += "."

    const volStr = article.volume ? `vol. ${article.volume}` : ""
    const noStr = article.issueNumber ? `no. ${article.issueNumber}` : ""
    const volNo = [volStr, noStr].filter(Boolean).join(", ")
    const pStr = article.pages ? `pp. ${article.pages}` : ""
    
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
    // Author. "Title." Journal Vol, no. Issue (Year): Pages. DOI.
    // Chicago dictates Journal is italicized
    const authors = article.authors
    let authorsStr = "Anonymous"
    if (authors.length === 1) {
      authorsStr = `${authors[0].familyName || ''}, ${authors[0].givenName || ''}`
    } else if (authors.length >= 2) {
      const rest = authors.slice(1).map(a => `${a.givenName || ''} ${a.familyName || ''}`).join(", ")
      authorsStr = `${authors[0].familyName || ''}, ${authors[0].givenName || ''}, and ${rest}`
    }
    authorsStr = authorsStr.trim()
    if (!authorsStr.endsWith(".")) authorsStr += "."

    const noStr = article.issueNumber ? `, no. ${article.issueNumber}` : ""
    const pgStr = article.pages ? `: ${article.pages}` : ""

    return `${authorsStr} "${title}." <i>${journal}</i> ${volume}${noStr} (${year})${pgStr}.${doiStr}`
  }

  if (format === "bibtex") {
    const authorsStr = article.authors.map(a => `${a.familyName || ''}, ${a.givenName || ''}`).join(" and ")
    const id = `${article.authors[0]?.familyName || 'Author'}${year}`.replace(/\s+/g, "")
    
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

