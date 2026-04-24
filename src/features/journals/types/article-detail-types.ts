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
