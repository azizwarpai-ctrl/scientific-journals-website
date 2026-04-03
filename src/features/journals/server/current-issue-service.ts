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

import path from "node:path"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"
import type { CurrentIssue, CurrentIssueArticle, CurrentIssueAuthor } from "@/src/features/journals/types/current-issue-types"

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

// ─── Cover Image Parser ─────────────────────────────────────────────

/**
 * Extracts the filename from a raw OJS coverImage setting value.
 * OJS can store covers as plain strings, JSON, or PHP serialized arrays.
 */
function parseOjsCoverFilename(raw: string | null): string | null {
  if (!raw) return null

  // 1. JSON Format (Newer OJS versions) -> {"en_US":{"uploadName":"cover.png"}} or similar
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw)
      // Attempt to extract 'uploadName' recursively or linearly
      const jsonString = JSON.stringify(parsed)
      const match = jsonString.match(/"uploadName"\s*:\s*"([^"]+)"/)
      if (match && match[1]) return match[1]
      
      // Secondary simplistic scan if uploadName exist but matched weirdly
      if (parsed?.uploadName) return parsed.uploadName
      
      for (const key in parsed) {
        if (parsed[key]?.uploadName) return parsed[key].uploadName
      }
    } catch {
      // Move to next check if parse fails
    }
  }

  // 2. PHP Serialized Array (Older OJS versions) -> a:2:{s:10:"uploadName";s:12:"filename.png"...}
  if (raw.includes('uploadName";s:')) {
    const match = raw.match(/uploadName";s:\d+:"([^"]+)"/)
    if (match && match[1]) return match[1]
  }

  // 3. Plain String (Direct filename starting with convention)
  if (raw.match(/^(cover_issue_|article_|cover_)/)) {
    return raw
  }

  // Fallback: assume the raw string is the filename if it ends in standard extensions
  if (raw.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    return raw.trim()
  }

  return null
}

function buildCoverUrl(journalId: number, filename: string | null): string | null {
  if (!filename) return null
  const baseUrl = getOjsBaseUrl()
  // Sanitize filename to prevent path traversal and ensure valid URL
  const sanitizedFilename = encodeURIComponent(path.basename(filename))
  return `${baseUrl}/public/journals/${journalId}/${sanitizedFilename}`
}

interface AuthorRow {
  author_id: number
  publication_id: number
  seq: number
  given_name: string | null
  family_name: string | null
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
  const journalRows = await ojsQuery<{ primary_locale: string }>(
    "SELECT primary_locale FROM journals WHERE journal_id = ? LIMIT 1",
    [journalId]
  )

  if (journalRows.length === 0) {
    console.error(`[CurrentIssue] Journal not found for journal_id=${journalId}`)
    return null
  }

  const primaryLocale = journalRows[0].primary_locale

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

  // ── Step 3: Fetch articles for this issue ──────────────────────

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
    [primaryLocale, primaryLocale, primaryLocale, primaryLocale, resolvedIssueId]
  )

  console.log(`[CurrentIssue] Articles: ${articleRows.length} rows for issue_id=${resolvedIssueId}`)

  if (articleRows.length === 0) {
    // Issue exists but has no articles — return issue metadata with empty array
    return mapIssueRow(journalId, issue, [])
  }

  // ── Step 4: Batch-fetch authors for all publications ──────────

  const publicationIds = articleRows.map((a) => a.publication_id)

  // Build parameterized IN clause — mysql2 expands arrays with ?
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

  console.log(`[CurrentIssue] Authors: ${authorRows.length} rows for ${publicationIds.length} publications`)

  // ── Step 5: Group authors by publication_id ───────────────────

  const authorsByPub = new Map<number, CurrentIssueAuthor[]>()
  for (const row of authorRows) {
    const existing = authorsByPub.get(row.publication_id) || []
    existing.push({
      givenName: row.given_name,
      familyName: row.family_name,
    })
    authorsByPub.set(row.publication_id, existing)
  }

  // ── Step 6: Map articles with their authors ───────────────────

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
