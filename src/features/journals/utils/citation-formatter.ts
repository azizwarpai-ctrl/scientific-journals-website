import type { ArticleDetail } from "@/src/features/journals"

export type CitationFormat =
  | "apa"
  | "mla"
  | "chicago"
  | "harvard"
  | "vancouver"
  | "bibtex"
  | "ris"
  | "plain"

export interface CitationFormatMeta {
  id: CitationFormat
  label: string
  description: string
  /** "prose" = rendered as rich text; "code" = monospace block */
  display: "prose" | "code"
  /** Filename extension for export; if null, export is disabled for this format */
  fileExtension: string | null
}

export const CITATION_FORMATS: CitationFormatMeta[] = [
  { id: "apa", label: "APA", description: "APA 7th Edition", display: "prose", fileExtension: null },
  { id: "mla", label: "MLA", description: "MLA 9th Edition", display: "prose", fileExtension: null },
  { id: "chicago", label: "Chicago", description: "Chicago 17th Edition", display: "prose", fileExtension: null },
  { id: "harvard", label: "Harvard", description: "Harvard Referencing", display: "prose", fileExtension: null },
  { id: "vancouver", label: "Vancouver", description: "Vancouver (ICMJE)", display: "prose", fileExtension: null },
  { id: "bibtex", label: "BibTeX", description: "LaTeX-compatible reference", display: "code", fileExtension: "bib" },
  { id: "ris", label: "RIS", description: "EndNote / Zotero / Mendeley", display: "code", fileExtension: "ris" },
  { id: "plain", label: "Plain", description: "Unformatted plain text", display: "prose", fileExtension: null },
]

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
    .replace(/\\/g, "\\\\")
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

function resolveYear(article: ArticleDetail): string | number {
  if (article.year != null) return article.year
  if (article.datePublished) {
    const d = new Date(article.datePublished)
    if (!isNaN(d.getTime())) return d.getFullYear()
  }
  return "n.d."
}

function initials(given: string | null | undefined): string {
  if (!given) return ""
  return given
    .trim()
    .split(/\s+/)
    .map((n) => n.charAt(0).toUpperCase())
    .filter(Boolean)
    .map((c) => `${c}.`)
    .join("")
}

function initialsSpaced(given: string | null | undefined): string {
  if (!given) return ""
  return given
    .trim()
    .split(/\s+/)
    .map((n) => n.charAt(0).toUpperCase())
    .filter(Boolean)
    .join("")
}

function formatAuthorsAPA(authors: ArticleDetail["authors"]): string {
  if (!authors || authors.length === 0) return "Anonymous"
  const parts = authors.map((a) => {
    const family = escapeHtml(a.familyName || "")
    const given = a.givenName ? escapeHtml(initials(a.givenName)) : ""
    return `${family}, ${given}`.trim().replace(/,\s*$/, "")
  })
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]}, &amp; ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")}, &amp; ${parts[parts.length - 1]}`
}

function formatAuthorsMLA(authors: ArticleDetail["authors"]): string {
  if (!authors || authors.length === 0) return "Anonymous"
  const [first, ...rest] = authors
  const firstName = `${escapeHtml(first.familyName || "")}, ${escapeHtml(first.givenName || "")}`.replace(/,\s*$/, "")
  if (rest.length === 0) return firstName
  if (rest.length === 1) {
    const r = rest[0]
    return `${firstName}, and ${escapeHtml(r.givenName || "")} ${escapeHtml(r.familyName || "")}`.trim()
  }
  return `${firstName}, et al`
}

function formatAuthorsChicago(authors: ArticleDetail["authors"]): string {
  if (!authors || authors.length === 0) return "Anonymous"
  const [first, ...rest] = authors
  const firstName = `${escapeHtml(first.familyName || "")}, ${escapeHtml(first.givenName || "")}`.replace(/,\s*$/, "")
  if (rest.length === 0) return firstName
  const names = rest.map((a) => `${escapeHtml(a.givenName || "")} ${escapeHtml(a.familyName || "")}`.trim())
  if (names.length === 1) return `${firstName}, and ${names[0]}`
  return `${firstName}, ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

function formatAuthorsHarvard(authors: ArticleDetail["authors"]): string {
  if (!authors || authors.length === 0) return "Anonymous"
  const parts = authors.map((a) => {
    const family = escapeHtml(a.familyName || "")
    const given = a.givenName ? escapeHtml(initials(a.givenName)) : ""
    return `${family}, ${given}`.trim().replace(/,\s*$/, "")
  })
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

function formatAuthorsVancouver(authors: ArticleDetail["authors"]): string {
  if (!authors || authors.length === 0) return "Anonymous"
  const names = authors.map((a) => {
    const family = escapeHtml(a.familyName || "")
    const given = a.givenName ? escapeHtml(initialsSpaced(a.givenName)) : ""
    return `${family} ${given}`.trim()
  })
  if (names.length <= 6) return names.join(", ")
  return `${names.slice(0, 6).join(", ")}, et al`
}

function formatAuthorsPlain(authors: ArticleDetail["authors"]): string {
  if (!authors || authors.length === 0) return "Anonymous"
  const names = authors
    .map((a) => `${a.givenName || ""} ${a.familyName || ""}`.trim())
    .filter(Boolean)
  if (names.length === 0) return "Anonymous"
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

export function generateCitation(
  article: ArticleDetail,
  format: CitationFormat,
  options?: { htmlPreview?: boolean }
): string {
  const year = resolveYear(article)
  const escapedYear = escapeHtml(year)
  const title = escapeHtml(article.title || "Untitled")
  const journal = escapeHtml(article.journalAbbreviation || article.journalTitle || "Unknown Journal")
  const volume = article.volume != null ? escapeHtml(article.volume) : ""
  const issue = article.issueNumber != null ? `(${escapeHtml(article.issueNumber)})` : ""
  const pages = article.pages ? `, ${escapeHtml(article.pages)}` : ""
  const doiStr = article.doi ? ` https://doi.org/${escapeHtml(article.doi)}` : ""

  if (format === "apa") {
    const authorsStr = formatAuthorsAPA(article.authors)
    const volSection = volume ? `, <i>${volume}</i>${issue}` : issue ? ` ${issue}` : ""
    return `${authorsStr} (${escapedYear}). ${title}. <i>${journal}</i>${volSection}${pages}.${doiStr}`
  }

  if (format === "mla") {
    const authorsStr = formatAuthorsMLA(article.authors).replace(/\.?$/, ".")
    const volStr = article.volume != null ? `vol. ${escapeHtml(article.volume)}` : ""
    const noStr = article.issueNumber ? `no. ${escapeHtml(article.issueNumber)}` : ""
    const volNo = [volStr, noStr].filter(Boolean).join(", ")
    const pStr = article.pages ? `pp. ${escapeHtml(article.pages)}` : ""
    const parts = [
      `<i>${journal}</i>`,
      volNo,
      String(escapedYear),
      pStr,
      doiStr.trim(),
    ].filter(Boolean).join(", ")
    return `${authorsStr} &ldquo;${title}.&rdquo; ${parts}.`
  }

  if (format === "chicago") {
    const authorsStr = formatAuthorsChicago(article.authors).replace(/\.?$/, ".")
    const noStr = article.issueNumber ? `, no. ${escapeHtml(article.issueNumber)}` : ""
    const pgStr = article.pages ? `: ${escapeHtml(article.pages)}` : ""
    const volPart = volume ? ` ${volume}` : ""
    return `${authorsStr} &ldquo;${title}.&rdquo; <i>${journal}</i>${volPart}${noStr} (${escapedYear})${pgStr}.${doiStr}`
  }

  if (format === "harvard") {
    const authorsStr = formatAuthorsHarvard(article.authors)
    const volPart = volume ? `, ${volume}` : ""
    const issuePart = article.issueNumber ? `(${escapeHtml(article.issueNumber)})` : ""
    const pagePart = article.pages ? `, pp. ${escapeHtml(article.pages)}` : ""
    return `${authorsStr} (${escapedYear}) &lsquo;${title}&rsquo;, <i>${journal}</i>${volPart}${issuePart}${pagePart}.${doiStr}`
  }

  if (format === "vancouver") {
    const authorsStr = formatAuthorsVancouver(article.authors)
    const volPart = volume ? `;${volume}` : ""
    const issuePart = article.issueNumber ? `(${escapeHtml(article.issueNumber)})` : ""
    const pagePart = article.pages ? `:${escapeHtml(article.pages)}` : ""
    return `${authorsStr}. ${title}. ${journal}. ${escapedYear}${volPart}${issuePart}${pagePart}.${doiStr}`
  }

  if (format === "bibtex") {
    const authorsStr = article.authors.length > 0
      ? article.authors.map((a) => `${bibtexEscape(a.familyName || "")}, ${bibtexEscape(a.givenName || "")}`.replace(/,\s*$/, "")).join(" and ")
      : "Anonymous"
    const firstAuthor = article.authors[0]?.familyName || "Author"
    const bibtexId = bibtexEscape(`${firstAuthor}${year}`.replace(/[^a-zA-Z0-9]/g, ""))
    const lines = [
      `@article{${bibtexId},`,
      `  author = {${authorsStr}},`,
      `  title = {${bibtexEscape(article.title) || "Untitled"}},`,
      `  journal = {${bibtexEscape(article.journalAbbreviation || article.journalTitle) || "Unknown Journal"}},`,
    ]
    if (article.volume != null) lines.push(`  volume = {${bibtexEscape(article.volume)}},`)
    if (article.issueNumber != null) lines.push(`  number = {${bibtexEscape(article.issueNumber)}},`)
    lines.push(`  year = {${bibtexEscape(year)}},`)
    if (article.pages) lines.push(`  pages = {${bibtexEscape(article.pages)}},`)
    if (article.doi) lines.push(`  doi = {${bibtexEscape(article.doi)}},`)
    if (article.issn) lines.push(`  issn = {${bibtexEscape(article.issn)}},`)
    // Trim trailing comma on final field line
    const last = lines.length - 1
    lines[last] = lines[last].replace(/,$/, "")
    lines.push("}")
    const bibtex = lines.join("\n")
    return options?.htmlPreview ? escapeHtml(bibtex) : bibtex
  }

  if (format === "ris") {
    const lines: string[] = ["TY  - JOUR"]
    for (const a of article.authors) {
      const family = (a.familyName || "").trim()
      const given = (a.givenName || "").trim()
      if (family || given) lines.push(`AU  - ${family}${family && given ? ", " : ""}${given}`)
    }
    if (article.title) lines.push(`TI  - ${article.title}`)
    if (article.journalAbbreviation || article.journalTitle) {
      lines.push(`JO  - ${article.journalAbbreviation || article.journalTitle}`)
    }
    if (article.journalTitle) lines.push(`T2  - ${article.journalTitle}`)
    if (article.volume != null) lines.push(`VL  - ${article.volume}`)
    if (article.issueNumber) lines.push(`IS  - ${article.issueNumber}`)
    if (article.pages) {
      const [sp, ep] = article.pages.split(/[-–]/).map((s) => s.trim())
      if (sp) lines.push(`SP  - ${sp}`)
      if (ep) lines.push(`EP  - ${ep}`)
    }
    if (typeof year === "number") lines.push(`PY  - ${year}`)
    if (article.datePublished) lines.push(`DA  - ${article.datePublished}`)
    if (article.doi) lines.push(`DO  - ${article.doi}`)
    if (article.issn) lines.push(`SN  - ${article.issn}`)
    for (const kw of article.keywords || []) lines.push(`KW  - ${kw}`)
    if (article.abstract) {
      const clean = article.abstract.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim()
      if (clean) lines.push(`AB  - ${clean}`)
    }
    lines.push("ER  - ")
    const ris = lines.join("\n")
    return options?.htmlPreview ? escapeHtml(ris) : ris
  }

  if (format === "plain") {
    const authors = formatAuthorsPlain(article.authors)
    const authorsEsc = escapeHtml(authors)
    const volPart = volume ? `, vol. ${volume}` : ""
    const issuePart = article.issueNumber ? `, no. ${escapeHtml(article.issueNumber)}` : ""
    const pagePart = article.pages ? `, pp. ${escapeHtml(article.pages)}` : ""
    const doiPart = article.doi ? ` https://doi.org/${escapeHtml(article.doi)}` : ""
    return `${authorsEsc} (${escapedYear}). ${title}. ${journal}${volPart}${issuePart}${pagePart}.${doiPart}`
  }

  return `${title} (${escapedYear})`
}

/**
 * Strip HTML tags and decode a few common entities to produce a copy-friendly plain string.
 */
export function citationToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
}
