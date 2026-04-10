/**
 * Current Issue Service
 *
 * Fetches the current (or latest published) issue for a journal directly
 * from the OJS MySQL database using the established ojsQuery() pattern.
 *
 * Architecture: 3-step decomposed query strategy (no correlated subqueries in JOINs).
 * This replaces the previous monolithic COALESCE-in-INNER-JOIN pattern that
 * caused silent NULL returns due to MySQL optimizer issues with correlated
 * subqueries inside JOIN ON clauses.
 *
 * OJS Schema References (from dbkgvcunttgs97.sql):
 * - journals.current_issue_id → FK to issues.issue_id
 * - issues: issue_id, journal_id, volume, number, year, published, date_published
 * - issue_settings: EAV (title, description per locale)
 * - publications: publication_id, submission_id, issue_id, section_id, status, seq
 * - publication_settings: EAV (title, abstract per locale)
 * - submissions: submission_id, context_id, status (3 = published)
 * - authors: author_id, publication_id, seq
 * - author_settings: EAV (givenName, familyName per locale)
 * - sections: section_id, journal_id, seq
 * - section_settings: EAV (title per locale)
 */

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseOjsCoverFilename, buildCoverUrl } from "./ojs-cover-utils"
import { fetchArticlesWithAuthors } from "./ojs-article-utils"
import type { CurrentIssue, CurrentIssueArticle } from "@/src/features/journals/types/current-issue-types"

// ─── Raw Row Types (from OJS MySQL) ─────────────────────────────────

interface IssueRow {
  issue_id: number
  volume: number | null
  number: string | null
  year: number | null
  published: number
  date_published: string | null
  show_volume: number
  show_number: number
  show_year: number
  show_title: number
  url_path: string | null
  title: string | null
  description: string | null
  cover_image_raw: string | null
}

// ─── Main Service Function ──────────────────────────────────────────

/**
 * Fetches the current issue and its articles for the given OJS journal.
 *
 * Resolution order:
 * 1. journals.current_issue_id (editor-designated current issue, must be published)
 * 2. Fallback: latest published issue by date_published DESC
 *
 * Architecture: Uses 3 sequential simple queries instead of correlated subqueries.
 *
 * @param ojsJournalId - The OJS journal_id (stored as journal.ojs_id in Digitopub)
 * @returns CurrentIssue with articles and authors, or null if no published issue exists
 */
export async function fetchCurrentIssue(ojsJournalId: string): Promise<CurrentIssue | null> {
  // Strict numeric validation to prevent partial parses like "12abc"
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error("[CurrentIssue] Invalid OJS journal ID (not numeric):", ojsJournalId)
    return null
  }

  const journalId = parseInt(ojsJournalId, 10)
  console.log(`[CurrentIssue] Fetching for OJS journal_id=${journalId}`)

  // ── Step 0: Fetch journal's primary locale ──────────────────────
  const journalRows = await ojsQuery<{ primary_locale: string; url_path: string }>(
    "SELECT primary_locale, path AS url_path FROM journals WHERE journal_id = ? LIMIT 1",
    [journalId]
  )

  if (journalRows.length === 0) {
    console.error(`[CurrentIssue] Journal not found for journal_id=${journalId}`)
    return null
  }

  const primaryLocale = journalRows[0].primary_locale
  const journalUrlPath = journalRows[0].url_path

  // ── Step 1: Resolve the issue_id ──────────────────────────────
  // Two separate simple queries — no correlated subqueries, no COALESCE in JOINs

  let resolvedIssueId: number | null = null
  let resolutionSource = "none"

  // 1a. Try editor-designated current_issue_id
  const designatedRows = await ojsQuery<{ issue_id: number }>(
    `SELECT i.issue_id
     FROM journals j
     INNER JOIN issues i 
       ON i.issue_id = j.current_issue_id 
       AND i.journal_id = j.journal_id
     WHERE j.journal_id = ?
       AND i.published = 1
     LIMIT 1`,
    [journalId]
  )

  if (designatedRows.length > 0) {
    resolvedIssueId = designatedRows[0].issue_id
    resolutionSource = "current_issue_id"
  } else {
    // 1b. Fallback: latest published issue
    const fallbackRows = await ojsQuery<{ issue_id: number }>(
      `SELECT issue_id
       FROM issues
       WHERE journal_id = ?
         AND published = 1
       ORDER BY date_published DESC, issue_id DESC
       LIMIT 1`,
      [journalId]
    )

    if (fallbackRows.length > 0) {
      resolvedIssueId = fallbackRows[0].issue_id
      resolutionSource = "latest_published"
    }
  }

  console.log(`[CurrentIssue] Resolved issue_id=${resolvedIssueId ?? "null"} (source: ${resolutionSource})`)

  if (resolvedIssueId === null) {
    console.log(`[CurrentIssue] No published issue found for journal_id=${journalId}`)
    return null
  }

  // ── Step 2: Fetch issue metadata ──────────────────────────────
  // Simple query on a known issue_id — no correlated subqueries

  const issueRows = await ojsQuery<IssueRow>(
    `SELECT
      i.issue_id,
      i.volume,
      i.number,
      i.year,
      i.published,
      i.date_published,
      i.show_volume,
      i.show_number,
      i.show_year,
      i.show_title,
      i.url_path,
      is_title.setting_value AS title,
      is_desc.setting_value AS description,
      is_cover.setting_value AS cover_image_raw
    FROM issues i
    LEFT JOIN issue_settings is_title
      ON is_title.issue_id = i.issue_id
      AND is_title.setting_name = 'title'
      AND is_title.locale = ?
    LEFT JOIN issue_settings is_desc
      ON is_desc.issue_id = i.issue_id
      AND is_desc.setting_name = 'description'
      AND is_desc.locale = ?
    LEFT JOIN issue_settings is_cover
      ON is_cover.issue_id = i.issue_id
      AND is_cover.setting_name = 'coverImage'
      AND is_cover.locale = ?
    WHERE i.issue_id = ?
    LIMIT 1`,
    [primaryLocale, primaryLocale, primaryLocale, resolvedIssueId]
  )

  console.log(`[CurrentIssue] Issue metadata: ${issueRows.length} rows`)

  if (issueRows.length === 0) {
    const errorMsg = `[CurrentIssue] UNEXPECTED: issue_id=${resolvedIssueId} resolved but metadata query returned 0 rows for journal_id=${journalId}`
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  const issue = issueRows[0]

  const articles = await fetchArticlesWithAuthors(resolvedIssueId, journalId, primaryLocale, journalUrlPath)

  return mapIssueRow(journalId, issue, articles)
}

// ─── Mappers ────────────────────────────────────────────────────────

function mapIssueRow(journalId: number, row: IssueRow, articles: CurrentIssueArticle[]): CurrentIssue {
  return {
    issueId: row.issue_id,
    title: row.title,
    volume: row.volume,
    number: row.number,
    year: row.year,
    datePublished: row.date_published,
    description: row.description,
    showVolume: row.show_volume === 1,
    showNumber: row.show_number === 1,
    showYear: row.show_year === 1,
    showTitle: row.show_title === 1,
    urlPath: row.url_path,
    articles,
    issueCoverUrl: buildCoverUrl(journalId, parseOjsCoverFilename(row.cover_image_raw)),
  }
}
