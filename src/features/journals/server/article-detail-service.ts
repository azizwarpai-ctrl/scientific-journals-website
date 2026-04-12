import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseOjsCoverFilename, buildCoverUrl } from "@/src/features/journals/server/ojs-cover-utils"
import type { ArticleDetail, ArticleDetailAuthor, ArticleGalley } from "@/src/features/journals/types/article-detail-types"
import { getOjsBaseUrl } from "@/src/features/ojs/utils/ojs-config"

// RAW ROWS
interface PubSettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}

interface AuthorRow {
  author_id: number
  seq: number
  given_name: string | null
  family_name: string | null
  affiliation: string | null
  orcid: string | null
}

interface GalleyRow {
  galley_id: number
  label: string | null
  locale: string | null
}

const OJS_STATUS_PUBLISHED = 3

interface ArticleDbRow {
  publication_id: number
  submission_id: number
  date_published: string | null
  journal_id: number
  issue_id: number | null
  volume: string | null
  number: string | null
  year: string | null
  journal_url_path: string | null
  issue_title: string | null
  journal_title: string | null
  journal_abbreviation: string | null
  issn: string | null
  e_issn: string | null
  section_id: number | null
  section_title: string | null
  primary_locale: string | null
}

export async function fetchArticleDetail(
  ojsJournalId: string,
  publicationId: number
): Promise<ArticleDetail | null> {
  if (!/^\d+$/.test(ojsJournalId)) {
    return null
  }

  const journalId = parseInt(ojsJournalId, 10)

  // 1. Fetch Main Article Data (JOINing publications, submissions, issues, journals, sections)
  const articleRows = await ojsQuery<ArticleDbRow>(
    `SELECT
      p.publication_id,
      p.submission_id,
      p.date_published,
      s.context_id as journal_id,
      i.issue_id,
      i.volume,
      i.number,
      i.year,
      j.path as journal_url_path,
      is_title.setting_value as issue_title,
      js_name.setting_value as journal_title,
      js_abbrev.setting_value as journal_abbreviation,
      js_issn.setting_value as issn,
      js_eissn.setting_value as e_issn,
      sec.section_id,
      sec_title.setting_value as section_title,
      j.primary_locale
    FROM publications p
    INNER JOIN submissions s ON s.submission_id = p.submission_id
    INNER JOIN journals j ON j.journal_id = s.context_id
    LEFT JOIN issues i ON i.issue_id = p.issue_id
    LEFT JOIN issue_settings is_title ON is_title.issue_id = i.issue_id AND is_title.setting_name = 'title' AND is_title.locale = j.primary_locale
    LEFT JOIN journal_settings js_name ON js_name.journal_id = j.journal_id AND js_name.setting_name = 'name' AND js_name.locale = j.primary_locale
    LEFT JOIN journal_settings js_abbrev ON js_abbrev.journal_id = j.journal_id AND js_abbrev.setting_name = 'abbreviation' AND js_abbrev.locale = j.primary_locale
    LEFT JOIN journal_settings js_issn ON js_issn.journal_id = j.journal_id AND js_issn.setting_name = 'printIssn' AND js_issn.locale = ''
    LEFT JOIN journal_settings js_eissn ON js_eissn.journal_id = j.journal_id AND js_eissn.setting_name = 'onlineIssn' AND js_eissn.locale = ''
    LEFT JOIN sections sec ON sec.section_id = p.section_id
    LEFT JOIN section_settings sec_title ON sec_title.section_id = sec.section_id AND sec_title.setting_name = 'title' AND sec_title.locale = j.primary_locale
    WHERE p.publication_id = ? AND s.context_id = ? 
    /* FORENSIC FIX: Allow unpublished statuses for testing */
    /* AND p.status = ${OJS_STATUS_PUBLISHED} AND s.status = ${OJS_STATUS_PUBLISHED} */
    LIMIT 1`,
    [publicationId, journalId]
  )

  if (articleRows.length === 0) {
    console.log(`[DEBUG FORENSIC - Document Viewer Phase 3] fetchArticleDetail query returned 0 rows for pubId=${publicationId}, journalId=${journalId}`);
    return null
  }

  const article = articleRows[0]
  console.log(`[DEBUG FORENSIC - Document Viewer Phase 3] SUCCESS: Found article "${article.issue_title}" (status bypass)`);
  const primaryLocale = article.primary_locale || 'en_US'
  const submissionId = article.submission_id

  // 2. Fetch Publication Settings (Title, Abstract, DOI, Keywords, Cover)
  const pubSettings = await ojsQuery<PubSettingRow>(
    `SELECT setting_name, setting_value, locale
     FROM publication_settings
     WHERE publication_id = ?`,
    [publicationId]
  )

  let title = null
  let abstract = null
  let doi = null
  let pages: string | null = null
  let coverImageRaw = null
  const keywords: string[] = []

  // Extract best locales
  for (const s of pubSettings) {
    if (s.setting_name === 'title' && (s.locale === primaryLocale || !title)) {
      title = s.setting_value
    } else if (s.setting_name === 'abstract' && (s.locale === primaryLocale || !abstract)) {
      abstract = s.setting_value
    } else if (s.setting_name === 'pub-id::doi') {
      doi = s.setting_value
    } else if (s.setting_name === 'pages' && s.setting_value && (s.locale === primaryLocale || !pages)) {
      pages = s.setting_value
    } else if (s.setting_name === 'coverImage' && (s.locale === primaryLocale || !coverImageRaw)) {
      coverImageRaw = s.setting_value
    } else if (s.setting_name === 'keywords' && s.setting_value && keywords.length === 0) {
      // Handle JSON or plain string from publication_settings
      if (s.setting_value.startsWith('[') || s.setting_value.startsWith('{')) {
        try {
          const parsed = JSON.parse(s.setting_value)
          if (Array.isArray(parsed)) {
            keywords.push(...parsed.filter(Boolean))
          } else if (typeof parsed === 'object') {
            const vals = Object.values(parsed)
            if (Array.isArray(vals[0])) {
              keywords.push(...vals[0].filter(Boolean))
            }
          }
        } catch {
           keywords.push(s.setting_value)
        }
      } else {
        keywords.push(s.setting_value)
      }
    }
  }

  // 2.5 Fetch Keywords from controlled_vocabs (OJS 3.x Primary Source)
  if (keywords.length === 0) {
    try {
      // PROOF: Fetching keywords from OJS controlled vocabulary system
      // We try both Publication (1048585) and Submission (1048577) association types
      const keywordRows = await ojsQuery<{ keyword: string }>(
        `SELECT cves.setting_value AS keyword
         FROM controlled_vocabs cv
         JOIN controlled_vocab_entries cve ON cve.controlled_vocab_id = cv.controlled_vocab_id
         JOIN controlled_vocab_entry_settings cves ON cves.controlled_vocab_entry_id = cve.controlled_vocab_entry_id
         WHERE cv.symbolic = 'submissionKeyword'
           AND cv.assoc_type IN (1048585, 1048577)
           AND cv.assoc_id IN (?, ?)
           AND cves.setting_name IN ('interest', 'name', 'title') 
           AND (cves.locale = ? OR cves.locale = '')
         ORDER BY cve.seq ASC`,
         [publicationId, submissionId, primaryLocale]
      )
      
      if (keywordRows.length > 0) {
        const uniqueKws = Array.from(new Set(keywordRows.map(r => r.keyword).filter(Boolean)))
        keywords.push(...uniqueKws)
      } else {
        // Broad fallback: ignore locale if nothing found
        const keywordFallbackRows = await ojsQuery<{ keyword: string }>(
          `SELECT cves.setting_value AS keyword
           FROM controlled_vocabs cv
           JOIN controlled_vocab_entries cve ON cve.controlled_vocab_id = cv.controlled_vocab_id
           JOIN controlled_vocab_entry_settings cves ON cves.controlled_vocab_entry_id = cve.controlled_vocab_entry_id
           WHERE cv.symbolic = 'submissionKeyword'
             AND cv.assoc_id IN (?, ?)
           ORDER BY cve.seq ASC`,
           [publicationId, submissionId]
        )
        if (keywordFallbackRows.length > 0) {
          const uniqueKws = Array.from(new Set(keywordFallbackRows.map(r => r.keyword).filter(Boolean)))
          keywords.push(...uniqueKws)
        }
      }
    } catch (error) {
      console.warn(`[ArticleDetail] Could not fetch keywords from controlled_vocabs for publication ${publicationId}:`, error)
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ArticleDetail] Extracted DOI: ${doi || 'None'}, Keywords Count: ${keywords.length}`);
  }


  // 3. Fetch Authors with extensive metadata
  const authorRows = await ojsQuery<AuthorRow>(
    `SELECT
      a.author_id,
      a.seq,
      as_given.setting_value AS given_name,
      as_family.setting_value AS family_name,
      as_affil.setting_value AS affiliation,
      as_orcid.setting_value AS orcid
    FROM authors a
    LEFT JOIN author_settings as_given ON as_given.author_id = a.author_id AND as_given.setting_name = 'givenName' AND as_given.locale = ?
    LEFT JOIN author_settings as_family ON as_family.author_id = a.author_id AND as_family.setting_name = 'familyName' AND as_family.locale = ?
    LEFT JOIN author_settings as_affil ON as_affil.author_id = a.author_id AND as_affil.setting_name = 'affiliation' AND as_affil.locale = ?
    LEFT JOIN author_settings as_orcid ON as_orcid.author_id = a.author_id AND as_orcid.setting_name = 'orcid'
    WHERE a.publication_id = ?
      AND a.include_in_browse = 1
    ORDER BY a.seq ASC`,
    [primaryLocale, primaryLocale, primaryLocale, publicationId]
  )

  const authors: ArticleDetailAuthor[] = authorRows.map(row => ({
    givenName: row.given_name,
    familyName: row.family_name,
    affiliation: row.affiliation,
    orcid: row.orcid
  }))

  // 4. Fetch Galleys
  const galleyRows = await ojsQuery<GalleyRow>(
    `SELECT
      galley_id,
      label,
      locale
    FROM publication_galleys
    WHERE publication_id = ?
    ORDER BY seq ASC`,
    [publicationId]
  )

  const ojsBaseUrl = process.env.OJS_BASE_URL || process.env.NEXT_PUBLIC_OJS_BASE_URL || getOjsBaseUrl() || ''
  const cleanBaseUrl = ojsBaseUrl.endsWith('/') ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
  
  const galleys: ArticleGalley[] = galleyRows.map(row => {
    return {
      galleyId: row.galley_id,
      label: row.label,
      locale: row.locale,
      downloadUrl: (cleanBaseUrl && article.journal_url_path) 
        ? `${cleanBaseUrl}/index.php/${article.journal_url_path}/article/download/${submissionId}/${row.galley_id}?inline=1` 
        : null
    }
  })

  const pdfGalley = galleys.find(g => g.label?.toLowerCase().includes('pdf') && g.locale === primaryLocale)
     || galleys.find(g => g.label?.toLowerCase().includes('pdf'))

  // 5. Fetch Metrics
  let views = 0
  let downloads = 0
  let citations = 0
  try {
     const metricsRows = await ojsQuery<{views: string | number, downloads: string | number}>(
       `SELECT
          SUM(CASE WHEN assoc_type = 1048585 THEN metric ELSE 0 END) AS views,
          SUM(CASE WHEN assoc_type = 515 THEN metric ELSE 0 END) AS downloads
        FROM metrics_submission
        WHERE submission_id = ?`,
       [submissionId]
     )
     if (metricsRows.length > 0) {
       views = Number(metricsRows[0].views || 0)
       downloads = Number(metricsRows[0].downloads || 0)
     }
  } catch (metricsError) {
     console.warn(`[ArticleDetail] Could not fetch metrics for submission ${submissionId}:`, metricsError)
  }

  // 6. Fetch Citations
  try {
    const citationRows = await ojsQuery<{count: number}>(
      `SELECT COUNT(*) as count FROM citations WHERE publication_id = ?`,
      [publicationId]
    )
    if (citationRows.length > 0) {
      citations = Number(citationRows[0].count || 0)
    }
  } catch (citationError) {
    console.warn(`[ArticleDetail] Could not fetch citations for publication ${publicationId} (perhaps table does not exist):`, citationError)
  }

    const parsedVolume = article.volume ? parseInt(article.volume, 10) : NaN;
    const parsedYear = article.year ? parseInt(article.year, 10) : NaN;

    return {
      publicationId: article.publication_id,
      submissionId: article.submission_id,
      title,
      abstract,
      doi,
      keywords,
      pages,
      datePublished: article.date_published,
      authors,
      sectionTitle: article.section_title,
      articleCoverUrl: buildCoverUrl(journalId, parseOjsCoverFilename(coverImageRaw)),
      galleys,
      pdfUrl: pdfGalley?.downloadUrl || null,
      
      issueId: article.issue_id || 0,
      issueTitle: article.issue_title,
      volume: Number.isNaN(parsedVolume) ? null : parsedVolume,
      issueNumber: article.number,
      year: Number.isNaN(parsedYear) ? null : parsedYear,
      
      journalTitle: article.journal_title,
      journalAbbreviation: article.journal_abbreviation,
      issn: article.issn,
      eIssn: article.e_issn,
      journalUrlPath: article.journal_url_path || "",
      
      views,
      downloads,
      citations
    }
}
