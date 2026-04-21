export interface ArticleDetailAuthor {
  givenName: string | null
  familyName: string | null
  affiliation: string | null
  orcid: string | null
}

export interface ArticleGalley {
  galleyId: number
  label: string | null
  locale: string | null
  downloadUrl: string | null
  directUrl: string | null
}

export interface ArticleDetail {
  publicationId: number
  submissionId: number
  title: string | null
  abstract: string | null
  doi: string | null
  keywords: string[]
  pages: string | null
  datePublished: string | null
  authors: ArticleDetailAuthor[]
  sectionTitle: string | null
  articleCoverUrl: string | null
  galleys: ArticleGalley[]
  pdfUrl: string | null
  pdfDirectUrl: string | null
  /**
   * True when the OJS journal is disabled (`journals.enabled = 0`). In that
   * case OJS gates public galley URLs behind a login wall, so the client must
   * stream through `/api/pdf-proxy` (which routes to the PHP bridge) instead
   * of loading `pdfDirectUrl` in the iframe.
   */
  pdfProxyOnly: boolean
  
  /**
   * True when the article is behind an active subscription wall.
   * If true, we know OJS will intercept any direct iframe load with a login redirect.
   */
  isGatedAccess: boolean

  // Issue context
  issueId: number
  issueTitle: string | null
  volume: number | null
  issueNumber: string | null
  year: number | null

  // Journal context
  journalTitle: string | null
  journalAbbreviation: string | null
  issn: string | null
  eIssn: string | null
  journalUrlPath: string

  // Metrics
  views: number
  downloads: number
  citations: number
}
