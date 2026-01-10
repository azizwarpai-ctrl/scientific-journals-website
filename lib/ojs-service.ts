/**
 * OJS Service Layer
 * 
 * Business logic for retrieving and processing data from the
 * Open Journal Systems (OJS) database.
 * 
 * @module lib/ojs-service
 */

import { queryOJS } from './ojs-client';
import type {
  OJSArticleMetadata,
  OJSJournalWithSettings,
  OJSSubmissionWithStatus,
  OJSReviewStatus,
  OJSJournal,
  OJSJournalSettings,
  OJSSubmission,
  OJSPublication,
  OJSReviewAssignment,
  OJS_SUBMISSION_STATUS,
  OJS_REVIEW_RECOMMENDATION,
} from './ojs-models';

/**
 * Get all active journals with their settings
 */
export async function getActiveJournals(): Promise<OJSJournalWithSettings[]> {
  const query = `
    SELECT 
      j.journal_id,
      j.path,
      j.enabled,
      js.setting_name,
      js.setting_value,
      js.locale
    FROM journals j
    LEFT JOIN journal_settings js ON j.journal_id = js.journal_id
    WHERE j.enabled = 1
    ORDER BY j.journal_id, js.locale
  `;
  
  const rows = await queryOJS<OJSJournal & OJSJournalSettings>(query);
  
  // Group settings by journal
  const journalsMap = new Map<bigint, OJSJournalWithSettings>();
  
  for (const row of rows) {
    if (!journalsMap.has(row.journal_id)) {
      journalsMap.set(row.journal_id, {
        journal_id: row.journal_id,
        path: row.path,
        enabled: row.enabled,
        settings: {},
      });
    }
    
    const journal = journalsMap.get(row.journal_id)!;
    if (row.setting_name) {
      if (!journal.settings[row.setting_name]) {
        journal.settings[row.setting_name] = {};
      }
      journal.settings[row.setting_name][row.locale || 'default'] = row.setting_value || '';
    }
  }
  
  return Array.from(journalsMap.values());
}

/**
 * Get a single journal by ID with all its settings
 */
export async function getJournalById(journalId: bigint): Promise<OJSJournalWithSettings | null> {
  const query = `
    SELECT 
      j.journal_id,
      j.path,
      j.enabled,
      js.setting_name,
      js.setting_value,
      js.locale
    FROM journals j
    LEFT JOIN journal_settings js ON j.journal_id = js.journal_id
    WHERE j.journal_id = ?
    ORDER BY js.locale
  `;
  
  const rows = await queryOJS<OJSJournal & OJSJournalSettings>(query, [journalId]);
  
  if (rows.length === 0) return null;
  
  const journal: OJSJournalWithSettings = {
    journal_id: rows[0].journal_id,
    path: rows[0].path,
    enabled: rows[0].enabled,
    settings: {},
  };
  
  for (const row of rows) {
    if (row.setting_name) {
      if (!journal.settings[row.setting_name]) {
        journal.settings[row.setting_name] = {};
      }
      journal.settings[row.setting_name][row.locale || 'default'] = row.setting_value || '';
    }
  }
  
  return journal;
}

/**
 * Get detailed article metadata with authors and journal info
 */
export async function getArticleMetadata(publicationId: bigint): Promise<OJSArticleMetadata | null> {
  const query = `
    SELECT 
      p.publication_id,
      p.submission_id,
      p.date_published,
      p.status,
      p.issue_id,
      ps_title.setting_value as title,
      ps_abstract.setting_value as abstract,
      ps_keywords.setting_value as keywords,
      p.primary_contact_id,
      s.context_id as journal_id,
      s.locale,
      j.path as journal_path,
      js_name.setting_value as journal_name,
      sec.section_id,
      ss_name.setting_value as section_name,
      i.volume,
      i.number,
      i.year,
      d.doi
    FROM publications p
    INNER JOIN submissions s ON p.submission_id = s.submission_id
    LEFT JOIN journals j ON s.context_id = j.journal_id
    LEFT JOIN publication_settings ps_title 
      ON p.publication_id = ps_title.publication_id 
      AND ps_title.setting_name = 'title'
      AND ps_title.locale = s.locale
    LEFT JOIN publication_settings ps_abstract 
      ON p.publication_id = ps_abstract.publication_id 
      AND ps_abstract.setting_name = 'abstract'
      AND ps_abstract.locale = s.locale
    LEFT JOIN publication_settings ps_keywords
      ON p.publication_id = ps_keywords.publication_id 
      AND ps_keywords.setting_name = 'keywords'
      AND ps_keywords.locale = s.locale
    LEFT JOIN journal_settings js_name 
      ON j.journal_id = js_name.journal_id 
      AND js_name.setting_name = 'name'
      AND js_name.locale = s.locale
    LEFT JOIN sections sec ON p.section_id = sec.section_id
    LEFT JOIN section_settings ss_name
      ON sec.section_id = ss_name.section_id
      AND ss_name.setting_name = 'title'
      AND ss_name.locale = s.locale
    LEFT JOIN issues i ON p.issue_id = i.issue_id
    LEFT JOIN dois d ON p.doi_id = d.doi_id
    WHERE p.publication_id = ?
    LIMIT 1
  `;
  
  const [article] = await queryOJS<any>(query, [publicationId]);
  
  if (!article) return null;
  
  // Get authors
  const authorsQuery = `
    SELECT 
      a.author_id,
      a.email,
      a.seq,
      as_given.setting_value as given_name,
      as_family.setting_value as family_name,
      as_affiliation.setting_value as affiliation,
      as_country.setting_value as country,
      as_orcid.setting_value as orcid
    FROM authors a
    LEFT JOIN author_settings as_given 
      ON a.author_id = as_given.author_id 
      AND as_given.setting_name = 'givenName'
      AND as_given.locale = ?
    LEFT JOIN author_settings as_family 
      ON a.author_id = as_family.author_id 
      AND as_family.setting_name = 'familyName'
      AND as_family.locale = ?
    LEFT JOIN author_settings as_affiliation 
      ON a.author_id = as_affiliation.author_id 
      AND as_affiliation.setting_name = 'affiliation'
      AND as_affiliation.locale = ?
    LEFT JOIN author_settings as_country 
      ON a.author_id = as_country.author_id 
      AND as_country.setting_name = 'country'
    LEFT JOIN author_settings as_orcid 
      ON a.author_id = as_orcid.author_id 
      AND as_orcid.setting_name = 'orcid'
    WHERE a.publication_id = ?
    ORDER BY a.seq
  `;
  
  const authors = await queryOJS<any>(authorsQuery, [
    article.locale,
    article.locale,
    article.locale,
    publicationId
  ]);
  
  // Parse keywords
  let keywords: string[] = [];
  if (article.keywords) {
    try {
      const parsed = JSON.parse(article.keywords);
      keywords = Array.isArray(parsed) ? parsed : [article.keywords];
    } catch {
      keywords = article.keywords.split(/[,;]/).map((k: string) => k.trim());
    }
  }
  
  return {
    publication_id: article.publication_id,
    submission_id: article.submission_id,
    title: article.title || '',
    abstract: article.abstract || '',
    authors: authors.map(a => ({
      name: `${a.given_name || ''} ${a.family_name || ''}`.trim(),
      email: a.email || '',
      affiliation: a.affiliation || '',
      country: a.country || '',
      orcid: a.orcid || null,
    })),
    journal_id: article.journal_id,
    journal_name: article.journal_name || '',
    journal_path: article.journal_path || '',
    section_name: article.section_name || null,
    issue: article.issue_id ? {
      volume: article.volume,
      number: article.number,
      year: article.year,
    } : null,
    date_published: article.date_published,
    status: article.status,
    doi: article.doi || null,
    keywords,
    locale: article.locale,
  };
}

/**
 * Get submissions by status for a specific journal
 */
export async function getSubmissionsByStatus(
  contextId: bigint,
  status: number
): Promise<OJSSubmission[]> {
  const query = `
    SELECT 
      s.submission_id,
      s.context_id,
      s.current_publication_id,
      s.date_submitted,
      s.status,
      s.stage_id,
      s.locale,
      p.publication_id,
      ps.setting_value as title
    FROM submissions s
    LEFT JOIN publications p ON s.current_publication_id = p.publication_id
    LEFT JOIN publication_settings ps 
      ON p.publication_id = ps.publication_id 
      AND ps.setting_name = 'title'
      AND ps.locale = s.locale
    WHERE s.context_id = ? AND s.status = ?
    ORDER BY s.date_submitted DESC
  `;
  
  return await queryOJS<OJSSubmission>(query, [contextId, status]);
}

/**
 * Get all submissions for a journal with detailed status
 */
export async function getSubmissionsWithStatus(
  contextId: bigint
): Promise<OJSSubmissionWithStatus[]> {
  const query = `
    SELECT 
      s.submission_id,
      s.status,
      s.stage_id,
      s.date_submitted,
      ps_title.setting_value as title,
      ps_author.setting_value as author_name,
      a.email as author_email
    FROM submissions s
    LEFT JOIN publications p ON s.current_publication_id = p.publication_id
    LEFT JOIN publication_settings ps_title
      ON p.publication_id = ps_title.publication_id
      AND ps_title.setting_name = 'title'
      AND ps_title.locale = s.locale
    LEFT JOIN publication_settings ps_author
      ON p.publication_id = ps_author.publication_id
      AND ps_author.setting_name = 'authorString'
    LEFT JOIN authors a 
      ON p.publication_id = a.publication_id
      AND a.seq = 0
    WHERE s.context_id = ?
    ORDER BY s.date_submitted DESC
  `;
  
  const submissions = await queryOJS<any>(query, [contextId]);
  
  // Map status to labels
  const statusLabels: Record<number, string> = {
    1: 'Queued',
    3: 'Published',
    4: 'Declined',
    5: 'Scheduled',
  };
  
  return submissions.map(s => ({
    submission_id: s.submission_id,
    title: s.title || 'Untitled',
    author_name: s.author_name || 'Unknown',
    author_email: s.author_email || '',
    status: s.status,
    status_label: statusLabels[s.status] || 'Unknown',
    stage_id: s.stage_id,
    date_submitted: s.date_submitted,
    assigned_editors: [],
    review_assignments: [],
  }));
}

/**
 * Get review assignments for a submission
 */
export async function getSubmissionReviewStatus(
  submissionId: bigint
): Promise<OJSReviewStatus[]> {
  const query = `
    SELECT 
      ra.review_id,
      ra.reviewer_id,
      ra.date_assigned,
      ra.date_completed,
      ra.declined,
      ra.recommendation,
      ra.round,
      u.username,
      u.email,
      us_given.setting_value as given_name,
      us_family.setting_value as family_name
    FROM review_assignments ra
    LEFT JOIN users u ON ra.reviewer_id = u.user_id
    LEFT JOIN user_settings us_given
      ON u.user_id = us_given.user_id
      AND us_given.setting_name = 'givenName'
    LEFT JOIN user_settings us_family
      ON u.user_id = us_family.user_id
      AND us_family.setting_name = 'familyName'
    WHERE ra.submission_id = ?
    ORDER BY ra.date_assigned DESC
  `;
  
  const reviews = await queryOJS<any>(query, [submissionId]);
  
  const recommendationLabels: Record<number, string> = {
    1: 'Accept',
    2: 'Pending Revisions',
    3: 'Resubmit Here',
    4: 'Resubmit Elsewhere',
    5: 'Decline',
    6: 'See Comments',
  };
  
  return reviews.map(r => ({
    review_id: r.review_id,
    reviewer_id: r.reviewer_id,
    reviewer_name: `${r.given_name || ''} ${r.family_name || ''}`.trim() || r.username,
    reviewer_email: r.email,
    date_assigned: r.date_assigned,
    date_completed: r.date_completed,
    declined: Boolean(r.declined),
    recommendation: r.recommendation ? recommendationLabels[r.recommendation] || null : null,
    round: r.round,
  }));
}

/**
 * Get published articles for a journal
 */
export async function getPublishedArticles(
  journalId: bigint,
  limit: number = 50,
  offset: number = 0
): Promise<OJSArticleMetadata[]> {
  const query = `
    SELECT 
      p.publication_id,
      p.submission_id,
      p.date_published,
      p.status,
      ps_title.setting_value as title,
      ps_abstract.setting_value as abstract,
      i.volume,
      i.number,
      i.year,
      d.doi,
      s.locale
    FROM publications p
    INNER JOIN submissions s ON p.submission_id = s.submission_id
    LEFT JOIN publication_settings ps_title
      ON p.publication_id = ps_title.publication_id
      AND ps_title.setting_name = 'title'
      AND ps_title.locale = s.locale
    LEFT JOIN publication_settings ps_abstract
      ON p.publication_id = ps_abstract.publication_id
      AND ps_abstract.setting_name = 'abstract'
      AND ps_abstract.locale = s.locale
    LEFT JOIN issues i ON p.issue_id = i.issue_id
    LEFT JOIN dois d ON p.doi_id = d.doi_id
    WHERE s.context_id = ? 
      AND p.status = 3
      AND p.date_published IS NOT NULL
    ORDER BY p.date_published DESC
    LIMIT ? OFFSET ?
  `;
  
  const articles = await queryOJS<any>(query, [journalId, limit, offset]);
  
  // Fetch full metadata for each article
  const fullArticles = await Promise.all(
    articles.map(a => getArticleMetadata(a.publication_id))
  );
  
  return fullArticles.filter((a): a is OJSArticleMetadata => a !== null);
}

/**
 * Search articles by keyword
 */
export async function searchArticles(
  searchTerm: string,
  journalId?: bigint
): Promise<OJSArticleMetadata[]> {
  const query = `
    SELECT DISTINCT
      p.publication_id
    FROM publications p
    INNER JOIN submissions s ON p.submission_id = s.submission_id
    LEFT JOIN publication_settings ps
      ON p.publication_id = ps.publication_id
    WHERE p.status = 3
      AND p.date_published IS NOT NULL
      ${journalId ? 'AND s.context_id = ?' : ''}
      AND (
        ps.setting_value LIKE ?
        OR EXISTS (
          SELECT 1 FROM authors a
          JOIN author_settings as_name
            ON a.author_id = as_name.author_id
          WHERE a.publication_id = p.publication_id
            AND as_name.setting_value LIKE ?
        )
      )
    ORDER BY p.date_published DESC
    LIMIT 100
  `;
  
  const searchPattern = `%${searchTerm}%`;
  const params = journalId 
    ? [journalId, searchPattern, searchPattern]
    : [searchPattern, searchPattern];
  
  const results = await queryOJS<{ publication_id: bigint } & import('mysql2/promise').RowDataPacket>(query, params);

  
  const articles = await Promise.all(
    results.map(r => getArticleMetadata(r.publication_id))
  );
  
  return articles.filter((a): a is OJSArticleMetadata => a !== null);
}

/**
 * Get article statistics (views, downloads)
 */
export async function getArticleStats(submissionId: bigint) {
  const query = `
    SELECT 
      SUM(metric) as total_views,
      COUNT(DISTINCT date) as view_days
    FROM metrics_submission
    WHERE submission_id = ?
      AND assoc_type = 515
  `;
  
  const [stats] = await queryOJS<any>(query, [submissionId]);
  
  return {
    total_views: Number(stats?.total_views || 0),
    view_days: Number(stats?.view_days || 0),
  };
}
