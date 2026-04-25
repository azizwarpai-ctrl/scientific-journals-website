import sanitizeHtml from "sanitize-html"
import { ojsQuery } from "@/src/features/ojs/server/ojs-client"
import { parseOjsCoverFilename, buildCoverUrl } from "@/src/features/journals/server/ojs-cover-utils"
import { buildGalleyDownloadUrl, isOpenAccessStatus } from "@/src/features/journals/server/ojs-galley-utils"
import { fetchNewAuthorAffiliations, resolveAuthorAffiliation } from "@/src/features/journals/server/author-affiliation"
import type { ArticleDetail, ArticleDetailAuthor, ArticleGalley } from "@/src/features/journals/types/article-detail-types"


// RAW ROWS
interface PubSettingRow {
  setting_name: string
  setting_value: string | null
  locale: string
}



interface GalleyRow {
  galley_id: number
  label: string | null
  locale: string | null
  remote_url: string | null
  submission_file_id: number | null
}

const OJS_STATUS_PUBLISHED = 3

interface ArticleDbRow {
  publication_id: number
  submission_id: number
  date_published: string | null
  doi: string | null
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
  access_status: number | null
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
      d.doi,
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
      j.primary_locale,
      i.access_status
    FROM publications p
    INNER JOIN submissions s ON s.submission_id = p.submission_id
    LEFT JOIN dois d ON p.doi_id = d.doi_id
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
      AND p.status = ?
      AND s.status = ?
    LIMIT 1`,
    [publicationId, journalId, OJS_STATUS_PUBLISHED, OJS_STATUS_PUBLISHED]
  )

  if (articleRows.length === 0) {
    return null
  }

  const article = articleRows[0]
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
  let doi = article.doi || null
  let fallbackDoi = null
  let pages: string | null = null
  let coverImageRaw = null
  const keywords: string[] = []

  // Extract best locales
  for (const s of pubSettings) {
    if (s.setting_name === 'title' && (s.locale === primaryLocale || !title)) {
      title = s.setting_value
    } else if (s.setting_name === 'abstract' && (s.locale === primaryLocale || !abstract)) {
      abstract = s.setting_value ? sanitizeHtml(s.setting_value, {
        allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'b', 'i', 'sup', 'sub'],
        allowedAttributes: {},
      }) : null
    } else if (s.setting_name === 'doi' && !doi && s.setting_value) {
      doi = s.setting_value
    } else if (s.setting_name === 'pub-id::doi' && s.setting_value) {
      fallbackDoi = s.setting_value
    } else if (s.setting_name === 'pages' && s.setting_value && (s.locale === primaryLocale || !pages)) {
      pages = s.setting_value
    } else if (s.setting_name === 'coverImage' && (s.locale === primaryLocale || !coverImageRaw)) {
      coverImageRaw = s.setting_value
    } else if (s.setting_name === 'keywords' && s.setting_value) {
      // Handle JSON or plain string from publication_settings with locale sensitivity
      if (s.setting_value.startsWith('[') || s.setting_value.startsWith('{')) {
        try {
          const parsed = JSON.parse(s.setting_value)
          if (Array.isArray(parsed)) {
            keywords.push(...parsed.filter(Boolean))
          } else if (typeof parsed === 'object' && parsed !== null) {
            // Prefer current locale, then common fallbacks
            const localeKey = primaryLocale || 'en_US'
            const localeKeywords = parsed[localeKey] || parsed[localeKey.split('_')[0]] || parsed['en_US'] || parsed['en'] || Object.values(parsed)[0]

            if (Array.isArray(localeKeywords)) {
              keywords.push(...localeKeywords.filter(Boolean))
            } else if (typeof localeKeywords === 'string' && localeKeywords) {
              keywords.push(localeKeywords)
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

  if (!doi && fallbackDoi) {
    doi = fallbackDoi
  }

  // 2.5 Fetch Keywords from controlled_vocabs (OJS 3.x Primary Source)
  if (keywords.length === 0) {
    try {
      // PROOF: Fetching keywords directly using validated schema mapping
      const keywordRows = await ojsQuery<{ keyword: string, locale: string }>(
        `SELECT 
            cves.setting_value AS keyword,
            cves.locale
         FROM submissions s
         JOIN publications p ON p.publication_id = ?
         JOIN controlled_vocabs cv ON cv.assoc_id = p.publication_id 
             AND cv.symbolic IN ('submissionKeyword', 'publicationKeyword')
         JOIN controlled_vocab_entries cve ON cve.controlled_vocab_id = cv.controlled_vocab_id
         JOIN controlled_vocab_entry_settings cves ON cves.controlled_vocab_entry_id = cve.controlled_vocab_entry_id
         WHERE s.submission_id = ? 
         ORDER BY cve.seq ASC`,
        [publicationId, submissionId]
      )

      if (keywordRows.length > 0) {
        // Filter by primary locale, fallback to first available if none match primary locale
        let filteredRows = keywordRows.filter(r => r.locale === primaryLocale || r.locale === '')
        if (filteredRows.length === 0) {
          filteredRows = keywordRows
        }

        // Clean and split keywords in case they are comma separated in a single string (as discovered by user)
        const processKeywords = (kws: string[]) => {
          return kws.flatMap(k => k.split(',')).map(k => k.trim()).filter(Boolean)
        }

        const uniqueKws = Array.from(new Set(processKeywords(filteredRows.map(r => r.keyword))))
        keywords.push(...uniqueKws)
      }
    } catch (error) {
      console.warn(`[ArticleDetail] Could not fetch keywords from controlled_vocabs for publication ${publicationId}:`, error)
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ArticleDetail] Extracted DOI: ${doi || 'None'}, Keywords Count: ${keywords.length}`);
  }


  // 3. Fetch Authors with robust metadata
  const authorRows = await ojsQuery<{ author_id: number, seq: number }>(
    `SELECT a.author_id, a.seq
     FROM authors a
     WHERE a.publication_id = ?
       AND a.include_in_browse = 1
     ORDER BY a.seq ASC`,
    [publicationId]
  )

  const authors: ArticleDetailAuthor[] = []

  if (authorRows.length > 0) {
    const authorIds = authorRows.map(r => r.author_id)
    const [authorSettings, newAffiliationRows] = await Promise.all([
      ojsQuery<{
        author_id: number
        locale: string
        setting_name: string
        setting_value: string
      }>(
        `SELECT author_id, locale, setting_name, setting_value
         FROM author_settings
         WHERE author_id IN (${authorIds.join(',')})`
      ),
      fetchNewAuthorAffiliations(authorIds),
    ])

    for (const row of authorRows) {
      const settings = authorSettings.filter(s => s.author_id === row.author_id)

      const getBestSetting = (name: string): string | null => {
        const matches = settings.filter(s => s.setting_name === name)
        if (matches.length === 0) return null

        const primaryMatch = matches.find(s => s.locale === primaryLocale)
        if (primaryMatch?.setting_value) return primaryMatch.setting_value

        const enMatch = matches.find(s => s.locale === 'en_US' || s.locale === 'en')
        if (enMatch?.setting_value) return enMatch.setting_value

        const emptyMatch = matches.find(s => s.locale === '')
        if (emptyMatch?.setting_value) return emptyMatch.setting_value

        return matches[0].setting_value || null
      }

      authors.push({
        givenName: getBestSetting('givenName'),
        familyName: getBestSetting('familyName'),
        affiliation: resolveAuthorAffiliation({
          authorId: row.author_id,
          primaryLocale,
          newAffiliationRows,
          legacySettings: settings,
        }),
        orcid: getBestSetting('orcid')
      })
    }
  }

  // 4. Fetch Galleys. `submission_file_id` is required for the proxy to fetch
  //    OJS's 3-arg `/article/download/{s}/{g}/{f}` URL and re-emit with
  //    `Content-Disposition: inline` for inline PDF rendering.
  const galleyRows = await ojsQuery<GalleyRow>(
    `SELECT
      pg.galley_id,
      pg.label,
      pg.locale,
      pg.remote_url,
      sf.submission_file_id
    FROM publication_galleys pg
    LEFT JOIN submission_files sf ON pg.submission_file_id = sf.submission_file_id
    WHERE pg.publication_id = ?
    ORDER BY pg.seq ASC`,
    [publicationId]
  )

  const galleys: ArticleGalley[] = galleyRows.map(row => ({
    galleyId: row.galley_id,
    label: row.label,
    locale: row.locale,
    downloadUrl: buildGalleyDownloadUrl(
      row.remote_url,
      article.journal_url_path,
      submissionId,
      row.galley_id,
      row.submission_file_id
    ),
  }))

  const pdfGalley = galleys.find(g => g.label?.toLowerCase().includes('pdf') && g.locale === primaryLocale)
    || galleys.find(g => g.label?.toLowerCase().includes('pdf'))

  // 5. Fetch Metrics
  let views = 0
  let downloads = 0
  let citations = 0
  try {
    const metricsRows = await ojsQuery<{ views: string | number, downloads: string | number }>(
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
    const citationRows = await ojsQuery<{ count: number }>(
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
  const isOpenAccess = isOpenAccessStatus(article.access_status)

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

    isOpenAccess,

    views,
    downloads,
    citations
  }
}
