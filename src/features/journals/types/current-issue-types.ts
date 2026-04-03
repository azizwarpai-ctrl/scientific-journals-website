/**
 * TypeScript interfaces for the Current Issue feature.
 *
 * These types represent the transformed data from OJS database tables:
 * - issues + issue_settings         → CurrentIssue
 * - publications + publication_settings → CurrentIssueArticle
 * - authors + author_settings       → CurrentIssueAuthor
 *
 * All field names are camelCase (mapped from OJS snake_case in the service layer).
 */

export interface CurrentIssueAuthor {
  givenName: string | null
  familyName: string | null
}

export interface CurrentIssueArticle {
  publicationId: number
  submissionId: number
  title: string | null
  abstract: string | null
  authors: CurrentIssueAuthor[]
  datePublished: string | null
  sectionTitle: string | null
  sectionId: number | null
}

export interface CurrentIssue {
  issueId: number
  title: string | null
  volume: number | null
  number: string | null
  year: number | null
  datePublished: string | null
  description: string | null
  showVolume: boolean
  showNumber: boolean
  showYear: boolean
  showTitle: boolean
  urlPath: string | null
  articles: CurrentIssueArticle[]
}
