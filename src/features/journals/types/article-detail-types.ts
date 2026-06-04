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
}

export interface ArticleDetail {
  publicationId: number
  submissionId: number
  /** OJS journal_id (numeric). Used by UIET-P1 metric writes. */
  journalId: number
  title: string | null
  abstract: string | null
  doi: string | null
  keywords: string[]
  pages: string | null
  datePublished: string | null
  locale: string
  authors: ArticleDetailAuthor[]
  sectionTitle: string | null
  articleCoverUrl: string | null
  galleys: ArticleGalley[]
  /**
   * Inline-viewer URL — always the same-origin `/api/pdf-proxy?…` for local
   * galleys (the proxy rewrites OJS's `Content-Disposition: attachment` to
   * `inline` so the PDF renders inside an iframe). For remote galleys, the
   * external URL. Use this ONLY as the iframe `src`.
   */
  pdfUrl: string | null
  /**
   * Clean shareable OJS download URL for "Download" / "Open in new tab"
   * actions. For local galleys this is
   * `https://journals.digitopub.com/{journalUrlPath}/article/download/{submissionId}/{galleyId}`;
   * for remote galleys it falls back to the external URL. Never use as an
   * iframe `src` (OJS forces download via Content-Disposition).
   */
  pdfDownloadUrl: string | null

  issueId: number
  issueTitle: string | null
  volume: number | null
  issueNumber: string | null
  year: number | null

  journalTitle: string | null
  journalAbbreviation: string | null
  issn: string | null
  eIssn: string | null
  journalUrlPath: string

  isOpenAccess: boolean

  views: number
  downloads: number
  citations: number
}
