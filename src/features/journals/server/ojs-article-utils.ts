import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseOjsCoverFilename, buildCoverUrl } from "./ojs-cover-utils"
import type { CurrentIssueArticle, CurrentIssueAuthor } from "@/src/features/journals/types/current-issue-types"

export interface ArticleRow {
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

export interface AuthorRow {
  author_id: number
  publication_id: number
  seq: number
  given_name: string | null
  family_name: string | null
}

export async function fetchArticlesWithAuthors(
  issueId: number,
  journalId: number,
  primaryLocale: string
): Promise<CurrentIssueArticle[]> {
  // ── Fetch articles for this issue ──────────────────────
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

  if (articleRows.length === 0) {
    return []
  }

  // ── Batch-fetch authors for all publications ──────────
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

  // ── Group authors by publication_id ───────────────────
  const authorsByPub = new Map<number, CurrentIssueAuthor[]>()
  for (const row of authorRows) {
    const existing = authorsByPub.get(row.publication_id) || []
    existing.push({
      givenName: row.given_name,
      familyName: row.family_name,
    })
    authorsByPub.set(row.publication_id, existing)
  }

  // ── Map articles with their authors ───────────────────
  return articleRows.map((row) => ({
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
}
