import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseOjsCoverFilename, buildCoverUrl } from "./ojs-cover-utils"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"
import {
  fetchNewAuthorAffiliations,
  resolveAuthorAffiliation,
  pickLocalized,
} from "./author-affiliation"
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
  doi: string | null
}

export interface AuthorRow {
  author_id: number
  publication_id: number
  seq: number
  given_name: string | null
  family_name: string | null
}

export interface GalleyRow {
  galley_id: number
  publication_id: number
  label: string | null
  locale: string | null
  remote_url: string | null
  submission_file_id: number | null
}

export async function fetchArticlesWithAuthors(
  issueId: number,
  journalId: number,
  primaryLocale: string,
  journalUrlPath: string
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
      ps_cover.setting_value AS cover_image_raw,
      COALESCE(d.doi, ps_doi.setting_value, ps_pubid.setting_value) AS doi
    FROM publications p
    INNER JOIN submissions s
      ON s.submission_id = p.submission_id
    LEFT JOIN dois d
      ON p.doi_id = d.doi_id
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
    LEFT JOIN publication_settings ps_doi
      ON ps_doi.publication_id = p.publication_id
      AND ps_doi.setting_name = 'doi'
    LEFT JOIN publication_settings ps_pubid
      ON ps_pubid.publication_id = p.publication_id
      AND ps_pubid.setting_name = 'pub-id::doi'
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

  const authorRows = await ojsQuery<{ author_id: number, publication_id: number, seq: number }>(
    `SELECT a.author_id, a.publication_id, a.seq
     FROM authors a
     WHERE a.publication_id IN (?)
       AND a.include_in_browse = 1
     ORDER BY a.publication_id, a.seq ASC`,
    [publicationIds]
  )

  const authorsByPub = new Map<number, CurrentIssueAuthor[]>()

  if (authorRows.length > 0) {
    const authorIds = authorRows.map((r) => r.author_id)

    // Fetch author_settings and new affiliations in parallel.
    const [authorSettingsRows, newAffiliationRows] = await Promise.all([
      ojsQuery<{
        author_id: number
        locale: string
        setting_name: string
        setting_value: string
      }>(
        `SELECT author_id, locale, setting_name, setting_value
         FROM author_settings
         WHERE author_id IN (${authorIds.join(",")})`
      ),
      fetchNewAuthorAffiliations(authorIds),
    ])

    for (const row of authorRows) {
      const settings = authorSettingsRows.filter((s) => s.author_id === row.author_id)

      const givenName = pickLocalized(
        settings.filter((s) => s.setting_name === "givenName"),
        primaryLocale
      )
      const familyName = pickLocalized(
        settings.filter((s) => s.setting_name === "familyName"),
        primaryLocale
      )

      const existing = authorsByPub.get(row.publication_id) || []
      existing.push({
        givenName,
        familyName,
        affiliation: resolveAuthorAffiliation({
          authorId: row.author_id,
          primaryLocale,
          newAffiliationRows,
          legacySettings: settings,
        }),
      })
      authorsByPub.set(row.publication_id, existing)
    }
  }

  // ── Batch-fetch galleys for all publications ──────────
  const galleyRows = await ojsQuery<GalleyRow>(
    `SELECT
      pg.galley_id,
      pg.publication_id,
      pg.label,
      pg.locale,
      pg.remote_url,
      sf.submission_file_id
    FROM publication_galleys pg
    LEFT JOIN submission_files sf ON pg.submission_file_id = sf.submission_file_id
    WHERE pg.publication_id IN (?)
    ORDER BY pg.publication_id, pg.seq ASC`,
    [publicationIds]
  )

  // ── Group galleys by publication_id ───────────────────
  const galleysByPub = new Map<number, GalleyRow[]>()
  for (const row of galleyRows) {
    const existing = galleysByPub.get(row.publication_id) || []
    existing.push(row)
    galleysByPub.set(row.publication_id, existing)
  }

  // ── Batch-fetch keywords for all publications ──────────
  const keywordRows = await ojsQuery<{ publication_id: number, keyword: string, locale: string }>(
    `SELECT 
        p.publication_id,
        cves.setting_value AS keyword,
        cves.locale
     FROM publications p
     JOIN controlled_vocabs cv ON (cv.assoc_id = p.publication_id OR (cv.assoc_id = p.submission_id AND cv.assoc_type = 1048577))
         AND cv.symbolic IN ('submissionKeyword', 'publicationKeyword')
     JOIN controlled_vocab_entries cve ON cve.controlled_vocab_id = cv.controlled_vocab_id
     JOIN controlled_vocab_entry_settings cves ON cves.controlled_vocab_entry_id = cve.controlled_vocab_entry_id
     WHERE p.publication_id IN (?)
     ORDER BY p.publication_id, cve.seq ASC`,
    [publicationIds]
  )
  
  // ── Group keywords by publication_id ───────────────────
  const keywordsByPub = new Map<number, string[]>()
  for (const row of keywordRows) {
    if (row.locale !== primaryLocale && row.locale !== '') continue;
    const splitKws = row.keyword.split(',').map(k => k.trim()).filter(Boolean)
    const existing = keywordsByPub.get(row.publication_id) || []
    for (const kw of splitKws) {
       if (!existing.includes(kw)) existing.push(kw)
    }
    keywordsByPub.set(row.publication_id, existing)
  }

  // ── Map articles with their authors and pdfUrl ───────────────────
  return articleRows.map((row) => {
    const galleys = galleysByPub.get(row.publication_id) || []
    const pdfGalley = galleys.find(g => g.label?.toLowerCase().includes('pdf') && g.locale === primaryLocale) 
      || galleys.find(g => g.label?.toLowerCase().includes('pdf'))
    
    const ojsBaseUrl = getOjsBaseUrl()
    
    let pdfUrl = null;
    if (pdfGalley) {
      if (pdfGalley.remote_url) {
        pdfUrl = pdfGalley.remote_url;
      } else if (pdfGalley.submission_file_id) {
        pdfUrl = `/api/pdf-proxy?journal=${journalUrlPath}&submissionId=${row.submission_id}&galleyId=${pdfGalley.galley_id}&fileId=${pdfGalley.submission_file_id}`;
      } else if (ojsBaseUrl) {
        pdfUrl = `${ojsBaseUrl}/index.php/${journalUrlPath}/article/download/${row.submission_id}/${pdfGalley.galley_id}?inline=1`;
      }
    }

    return {
      publicationId: row.publication_id,
      submissionId: row.submission_id,
      title: row.title,
      abstract: row.abstract,
      authors: authorsByPub.get(row.publication_id) || [],
      datePublished: row.date_published,
      sectionTitle: row.section_title,
      sectionId: row.section_id,
      articleCoverUrl: buildCoverUrl(journalId, parseOjsCoverFilename(row.cover_image_raw)),
      pdfUrl,
      doi: row.doi,
      keywords: keywordsByPub.get(row.publication_id) || [],
    }
  })
}
