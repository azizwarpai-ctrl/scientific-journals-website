/**
 * Archive Issue Service
 *
 * Fetches all published issues (excluding the current issue) for a journal,
 * and fetches full issue detail with articles for a specific issue.
 *
 * Architecture: Same 3-step decomposed query strategy as current-issue-service.ts.
 * Reuses shared cover utilities from ojs-cover-utils.ts.
 *
 * OJS Schema References (from dbkgvcunttgs97.sql):
 * - journals.current_issue_id → FK to issues.issue_id
 * - issues: issue_id, journal_id, volume, number, year, published, date_published
 * - issue_settings: EAV (title, description, coverImage per locale)
 * - publications: publication_id, submission_id, issue_id, section_id, status, seq
 * - publication_settings: EAV (title, abstract, coverImage per locale)
 * - submissions: submission_id, context_id, status (3 = published)
 * - authors: author_id, publication_id, seq
 * - author_settings: EAV (givenName, familyName per locale)
 * - sections: section_id, journal_id, seq
 * - section_settings: EAV (title per locale)
 */

import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseOjsCoverFilename, buildCoverUrl } from "./ojs-cover-utils"
import type { ArchiveIssue } from "@/src/features/journals/types/archive-issue-types"
import type { CurrentIssue, CurrentIssueArticle, CurrentIssueAuthor } from "@/src/features/journals/types/current-issue-types"

// ─── Raw Row Types ──────────────────────────────────────────────────

interface ArchiveIssueRow {
  issue_id: number
  volume: number | null
  number: string | null
  year: number | null
  date_published: string | null
  show_volume: number
  show_number: number
  show_year: number
  show_title: number
  title: string | null
  cover_image_raw: string | null
  article_count: number
}

interface IssueMetadataRow {
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

interface ArticleRow {
  publication_id: number
  submission_id: number
  title: string | null
  abstract: string | null
  date_published: string | null
  pub_seq: number
  section_id: number | null
  section_seq: number | null
  section_title: string | null
  cover_image_raw: string | null
}

interface AuthorRow {
  author_id: number
  publication_id: number
  seq: number
  given_name: string | null
  family_name: string | null
}

// ─── Archive Issues (List) ──────────────────────────────────────────

/**
 * Fetches all published issues excluding the current issue.
 *
 * Strategy:
 * 1. Get journal locale + current_issue_id
 * 2. Query all published issues != current_issue_id with title/cover from settings
 * 3. Count articles per issue via subquery
 *
 * @param ojsJournalId - The OJS journal_id (stored as journal.ojs_id in Digitopub)
 * @returns ArchiveIssue[] sorted newest → oldest, or empty array
 */
export async function fetchArchiveIssues(ojsJournalId: string): Promise<ArchiveIssue[]> {
  // Strict numeric validation
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error("[Archive] Invalid OJS journal ID (not numeric):", ojsJournalId)
    return []
  }

  const journalId = parseInt(ojsJournalId, 10)
  console.log(`[Archive] Fetching archive issues for OJS journal_id=${journalId}`)

  // ── Step 0: Fetch journal locale + current_issue_id ────────────
  const journalRows = await ojsQuery<{ primary_locale: string; current_issue_id: number | null }>(
    "SELECT primary_locale, current_issue_id FROM journals WHERE journal_id = ? LIMIT 1",
    [journalId]
  )

  if (journalRows.length === 0) {
    console.error(`[Archive] Journal not found for journal_id=${journalId}`)
    return []
  }

  const { primary_locale: primaryLocale, current_issue_id: currentIssueId } = journalRows[0]

  // ── Step 1: Fetch all published issues (excluding current) with metadata ─
  // Uses LEFT JOINs to issue_settings for title and cover, plus a correlated
  // subquery for article count (safe here since it's in SELECT, not JOIN ON).
  const archiveRows = await ojsQuery<ArchiveIssueRow>(
    `SELECT
      i.issue_id,
      i.volume,
      i.number,
      i.year,
      i.date_published,
      i.show_volume,
      i.show_number,
      i.show_year,
      i.show_title,
      is_title.setting_value AS title,
      is_cover.setting_value AS cover_image_raw,
      (
        SELECT COUNT(*)
        FROM publications p
        INNER JOIN submissions s ON s.submission_id = p.submission_id
        WHERE p.issue_id = i.issue_id
          AND p.status = 3
          AND s.status = 3
      ) AS article_count
    FROM issues i
    LEFT JOIN issue_settings is_title
      ON is_title.issue_id = i.issue_id
      AND is_title.setting_name = 'title'
      AND is_title.locale = ?
    LEFT JOIN issue_settings is_cover
      ON is_cover.issue_id = i.issue_id
      AND is_cover.setting_name = 'coverImage'
      AND is_cover.locale = ?
    WHERE i.journal_id = ?
      AND i.published = 1
      AND i.issue_id != COALESCE(?, 0)
    ORDER BY i.date_published DESC, i.issue_id DESC`,
    [primaryLocale, primaryLocale, journalId, currentIssueId]
  )

  console.log(`[Archive] Found ${archiveRows.length} archive issues for journal_id=${journalId}`)

  return archiveRows.map((row) => ({
    issueId: row.issue_id,
    title: row.title,
    volume: row.volume,
    number: row.number,
    year: row.year,
    datePublished: row.date_published,
    issueCoverUrl: buildCoverUrl(journalId, parseOjsCoverFilename(row.cover_image_raw)),
    articleCount: Number(row.article_count) || 0,
    showVolume: row.show_volume === 1,
    showNumber: row.show_number === 1,
    showYear: row.show_year === 1,
    showTitle: row.show_title === 1,
  }))
}

// ─── Issue Detail (with Articles) ───────────────────────────────────

/**
 * Fetches a specific issue with its full article list.
 * Validates: issue exists, belongs to this journal, and is published.
 *
 * Uses the same query decomposition as fetchCurrentIssue():
 * 1. Fetch issue metadata
 * 2. Fetch articles
 * 3. Batch-fetch authors
 *
 * @param ojsJournalId - The OJS journal_id
 * @param issueId - The specific issue_id to fetch
 * @returns CurrentIssue (same type) or null if not found/not published
 */
export async function fetchIssueWithArticles(
  ojsJournalId: string,
  issueId: number
): Promise<CurrentIssue | null> {
  // Strict numeric validation
  if (!/^\d+$/.test(ojsJournalId)) {
    console.error("[IssueDetail] Invalid OJS journal ID (not numeric):", ojsJournalId)
    return null
  }

  const journalId = parseInt(ojsJournalId, 10)
  console.log(`[IssueDetail] Fetching issue_id=${issueId} for journal_id=${journalId}`)

  // ── Step 0: Fetch journal locale ───────────────────────────────
  const journalRows = await ojsQuery<{ primary_locale: string }>(
    "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
    [journalId]
  )

  if (journalRows.length === 0) {
    console.error(`[IssueDetail] Journal not found for journal_id=${journalId}`)
    return null
  }

  const primaryLocale = journalRows[0].primary_locale

  // ── Step 1: Fetch issue metadata (validates ownership + published) ─
  const issueRows = await ojsQuery<IssueMetadataRow>(
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
      AND i.journal_id = ?
      AND i.published = 1
    LIMIT 1`,
    [primaryLocale, primaryLocale, primaryLocale, issueId, journalId]
  )

  if (issueRows.length === 0) {
    console.log(`[IssueDetail] Issue not found or not published: issue_id=${issueId}, journal_id=${journalId}`)
    return null
  }

  const issue = issueRows[0]

  // ── Step 2: Fetch articles for this issue ──────────────────────
  const articleRows = await ojsQuery<ArticleRow>(
    `SELECT
      p.publication_id,
      p.date_published,
      p.seq AS pub_seq,
      s.submission_id,
      ps_title.setting_value AS title,
      ps_abstract.setting_value AS abstract,
      sec.section_id,
      sec.seq AS section_seq,
      sec_title.setting_value AS section_title,
      ps_cover.setting_value AS cover_image_raw
    FROM publications p
    INNER JOIN submissions s
      ON s.submission_id = p.submission_id
    LEFT JOIN publication_settings ps_title
      ON ps_title.publication_id = p.publication_id
      AND ps_title.setting_name = 'title'
      AND ps_title.locale = ?
    LEFT JOIN publication_settings ps_abstract
      ON ps_abstract.publication_id = p.publication_id
      AND ps_abstract.setting_name = 'abstract'
      AND ps_abstract.locale = ?
    LEFT JOIN publication_settings ps_cover
      ON ps_cover.publication_id = p.publication_id
      AND ps_cover.setting_name = 'coverImage'
      AND ps_cover.locale = ?
    LEFT JOIN sections sec
      ON sec.section_id = p.section_id
    LEFT JOIN section_settings sec_title
      ON sec_title.section_id = sec.section_id
      AND sec_title.setting_name = 'title'
      AND sec_title.locale = ?
    WHERE p.issue_id = ?
      AND p.status = 3
      AND s.status = 3
    ORDER BY sec.seq ASC, p.seq ASC`,
    [primaryLocale, primaryLocale, primaryLocale, primaryLocale, issueId]
  )

  console.log(`[IssueDetail] Articles: ${articleRows.length} rows for issue_id=${issueId}`)

  if (articleRows.length === 0) {
    return mapIssueRow(journalId, issue, [])
  }

  // ── Step 3: Batch-fetch authors for all publications ──────────
  const publicationIds = articleRows.map((a) => a.publication_id)

  const authorRows = await ojsQuery<AuthorRow>(
    `SELECT
      a.author_id,
      a.publication_id,
      a.seq,
      as_given.setting_value AS given_name,
      as_family.setting_value AS family_name
    FROM authors a
    LEFT JOIN author_settings as_given
      ON as_given.author_id = a.author_id
      AND as_given.setting_name = 'givenName'
      AND as_given.locale = ?
    LEFT JOIN author_settings as_family
      ON as_family.author_id = a.author_id
      AND as_family.setting_name = 'familyName'
      AND as_family.locale = ?
    WHERE a.publication_id IN (?)
      AND a.include_in_browse = 1
    ORDER BY a.publication_id, a.seq ASC`,
    [primaryLocale, primaryLocale, publicationIds]
  )

  console.log(`[IssueDetail] Authors: ${authorRows.length} rows for ${publicationIds.length} publications`)

  // ── Step 4: Group authors by publication_id ───────────────────
  const authorsByPub = new Map<number, CurrentIssueAuthor[]>()
  for (const row of authorRows) {
    const existing = authorsByPub.get(row.publication_id) || []
    existing.push({
      givenName: row.given_name,
      familyName: row.family_name,
    })
    authorsByPub.set(row.publication_id, existing)
  }

  // ── Step 5: Map articles with their authors ───────────────────
  const articles: CurrentIssueArticle[] = articleRows.map((row) => ({
    publicationId: row.publication_id,
    submissionId: row.submission_id,
    title: row.title,
    abstract: row.abstract,
    authors: authorsByPub.get(row.publication_id) || [],
    datePublished: row.date_published,
    sectionTitle: row.section_title,
    sectionId: row.section_id,
    articleCoverUrl: buildCoverUrl(journalId, parseOjsCoverFilename(row.cover_image_raw)),
  }))

  return mapIssueRow(journalId, issue, articles)
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapIssueRow(
  journalId: number,
  row: IssueMetadataRow,
  articles: CurrentIssueArticle[]
): CurrentIssue {
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
