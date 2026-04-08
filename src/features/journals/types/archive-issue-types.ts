/**
 * TypeScript interfaces for the Archive Issues feature.
 *
 * ArchiveIssue: Lightweight representation for the archive grid (no articles loaded).
 * IssueDetail: Full issue with articles — reuses CurrentIssue type since shape is identical.
 *
 * OJS Schema Sources:
 * - issues + issue_settings → ArchiveIssue
 * - publications + submissions + authors (via CurrentIssue) → IssueDetail
 */

import type { CurrentIssue } from "./current-issue-types"

/**
 * Lightweight issue representation for the archive grid.
 * Does NOT include articles — those are loaded on demand via IssueDetail.
 */
export interface ArchiveIssue {
  issueId: number
  title: string | null
  volume: number | null
  number: string | null
  year: number | null
  datePublished: string | null
  issueCoverUrl: string | null
  articleCount: number
  showVolume: boolean
  showNumber: boolean
  showYear: boolean
  showTitle: boolean
}

/**
 * Full issue detail with articles.
 * Identical shape to CurrentIssue — aliased for semantic clarity.
 */
export type IssueDetail = CurrentIssue
