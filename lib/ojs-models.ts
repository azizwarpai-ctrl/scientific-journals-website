/**
 * OJS Database Type Definitions
 * 
 * TypeScript interfaces for Open Journal Systems (OJS) database entities.
 * These types correspond to the tables in the ojs_db.sql schema.
 * 
 * @module lib/ojs-models
 */

import type { RowDataPacket } from 'mysql2/promise';

// =====================================================
// CORE OJS TABLES
// =====================================================

export interface OJSJournal extends RowDataPacket {
  journal_id: bigint;
  path: string;
  seq: number;
  primary_locale: string;
  enabled: number;
  current_issue_id: bigint | null;
}

export interface OJSJournalSettings extends RowDataPacket {
  journal_setting_id: bigint;
  journal_id: bigint;
  locale: string;
  setting_name: string;
  setting_value: string | null;
}

export interface OJSSubmission extends RowDataPacket {
  submission_id: bigint;
  context_id: bigint;
  current_publication_id: bigint | null;
  date_last_activity: Date | null;
  date_submitted: Date | null;
  last_modified: Date | null;
  stage_id: bigint | null;
  locale: string;
  status: number;
  submission_progress: string | null;
  work_type: number | null;
}

export interface OJSPublication extends RowDataPacket {
  publication_id: bigint;
  access_status: bigint | null;
  date_published: Date | null;
  last_modified: Date | null;
  primary_contact_id: bigint | null;
  section_id: bigint | null;
  seq: number;
  submission_id: bigint;
  status: number;
  url_path: string | null;
  version: bigint | null;
  doi_id: bigint | null;
  issue_id: bigint | null;
}

export interface OJSPublicationSettings extends RowDataPacket {
  publication_setting_id: bigint;
  publication_id: bigint;
  locale: string;
  setting_name: string;
  setting_value: string | null;
}

export interface OJSAuthor extends RowDataPacket {
  author_id: bigint;
  email: string;
  include_in_browse: number;
  publication_id: bigint;
  seq: number;
  user_group_id: bigint | null;
}

export interface OJSAuthorSettings extends RowDataPacket {
  author_setting_id: bigint;
  author_id: bigint;
  locale: string;
  setting_name: string;
  setting_value: string | null;
}

export interface OJSUser extends RowDataPacket {
  user_id: bigint;
  username: string;
  email: string;
  disabled: number;
  date_registered: Date;
  date_validated: Date | null;
  date_last_login: Date | null;
}

export interface OJSUserSettings extends RowDataPacket {
  user_setting_id: bigint;
  user_id: bigint;
  locale: string;
  setting_name: string;
  setting_value: string | null;
}

export interface OJSIssue extends RowDataPacket {
  issue_id: bigint;
  journal_id: bigint;
  volume: number | null;
  number: string | null;
  year: number | null;
  published: number;
  date_published: Date | null;
  date_notified: Date | null;
  last_modified: Date | null;
  access_status: number;
  open_access_date: Date | null;
  doi_id: bigint | null;
}

export interface OJSIssueSettings extends RowDataPacket {
  issue_setting_id: bigint;
  issue_id: bigint;
  locale: string;
  setting_name: string;
  setting_value: string | null;
}

export interface OJSReviewAssignment extends RowDataPacket {
  review_id: bigint;
  submission_id: bigint;
  reviewer_id: bigint;
  competing_interests: string | null;
  recommendation: number | null;
  date_assigned: Date | null;
  date_notified: Date | null;
  date_confirmed: Date | null;
  date_completed: Date | null;
  date_acknowledged: Date | null;
  date_due: Date | null;
  declined: number;
  cancelled: number;
  quality: number | null;
  review_round_id: bigint;
  stage_id: number;
}

export interface OJSReviewRound extends RowDataPacket {
  review_round_id: bigint;
  submission_id: bigint;
  stage_id: bigint | null;
  round: number;
  review_revision: bigint | null;
  status: bigint | null;
}

export interface OJSEditDecision extends RowDataPacket {
  edit_decision_id: bigint;
  submission_id: bigint;
  review_round_id: bigint | null;
  stage_id: bigint | null;
  round: number | null;
  editor_id: bigint;
  decision: number;
  date_decided: Date;
}

export interface OJSSection extends RowDataPacket {
  section_id: bigint;
  journal_id: bigint;
  review_form_id: bigint | null;
  seq: number;
  editor_restricted: number;
  meta_indexed: number;
  meta_reviewed: number;
  abstracts_not_required: number;
  hide_title: number;
  hide_author: number;
  is_inactive: number;
  abstract_word_count: bigint | null;
}

export interface OJSSectionSettings extends RowDataPacket {
  section_setting_id: bigint;
  section_id: bigint;
  locale: string;
  setting_name: string;
  setting_value: string | null;
}

export interface OJSDOI extends RowDataPacket {
  doi_id: bigint;
  context_id: bigint;
  doi: string;
  status: number;
}

export interface OJSMetricsSubmission extends RowDataPacket {
  metrics_submission_id: bigint;
  load_id: string;
  context_id: bigint;
  submission_id: bigint;
  representation_id: bigint | null;
  submission_file_id: bigint | null;
  file_type: bigint | null;
  assoc_type: bigint;
  date: Date;
  metric: number;
}

// =====================================================
// ENRICHED/AGGREGATED TYPES
// =====================================================

export interface OJSArticleMetadata {
  publication_id: bigint;
  submission_id: bigint;
  title: string;
  abstract: string;
  authors: Array<{
    name: string;
    email: string;
    affiliation: string;
    country: string;
    orcid: string | null;
  }>;
  journal_id: bigint;
  journal_name: string;
  journal_path: string;
  section_name: string | null;
  issue: {
    volume: number | null;
    number: string | null;
    year: number | null;
  } | null;
  date_published: Date | null;
  status: number;
  doi: string | null;
  keywords: string[];
  locale: string;
}

export interface OJSJournalWithSettings {
  journal_id: bigint;
  path: string;
  enabled: number;
  settings: {
    [key: string]: { [locale: string]: string };
  };
}

export interface OJSSubmissionWithStatus {
  submission_id: bigint;
  title: string;
  author_name: string;
  author_email: string;
  status: number;
  status_label: string;
  stage_id: bigint | null;
  date_submitted: Date | null;
  assigned_editors: Array<{
    user_id: bigint;
    username: string;
    email: string;
  }>;
  review_assignments: Array<{
    review_id: bigint;
    reviewer_name: string;
    status: string;
    recommendation: string | null;
    date_completed: Date | null;
  }>;
}

export interface OJSReviewStatus {
  review_id: bigint;
  reviewer_id: bigint;
  reviewer_name: string;
  reviewer_email: string;
  date_assigned: Date | null;
  date_completed: Date | null;
  declined: boolean;
  recommendation: string | null;
  round: number;
}

// =====================================================
// OJS CONSTANTS
// =====================================================

export const OJS_SUBMISSION_STATUS = {
  QUEUED: 1,
  PUBLISHED: 3,
  DECLINED: 4,
  SCHEDULED: 5,
} as const;

export const OJS_STAGE = {
  SUBMISSION: 1,
  EXTERNAL_REVIEW: 3,
  EDITORIAL: 4,
  PRODUCTION: 5,
} as const;

export const OJS_REVIEW_RECOMMENDATION = {
  ACCEPT: 1,
  PENDING_REVISIONS: 2,
  RESUBMIT_HERE: 3,
  RESUBMIT_ELSEWHERE: 4,
  DECLINE: 5,
  SEE_COMMENTS: 6,
} as const;

export const OJS_REVIEW_METHOD = {
  DOUBLE_BLIND: 1,
  BLIND: 2,
  OPEN: 3,
} as const;

export const OJS_ACCESS_STATUS = {
  ISSUE_ACCESS: 0,
  OPEN_ACCESS: 1,
} as const;

// =====================================================
// HELPER TYPES
// =====================================================

export type OJSLocale = 'en' | 'ar' | 'fr' | 'es' | string;

export interface OJSSyncLog {
  sync_id?: number;
  sync_type: 'journals' | 'submissions' | 'publications' | 'full';
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  records_synced: number;
  error_message?: string;
}
