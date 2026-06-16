/**
 * Admin-only analytics summary types.
 *
 * Every field here is either a real, source-cited number or a `null` empty-
 * state placeholder. There are no derived multipliers or hard-coded statuses
 * in this DTO. See tests/unit/admin-metrics-fabrication-guard.test.ts for the
 * regression guard that keeps it that way.
 */

export interface AdminAnalyticsTotals {
  journals: number
  submissions: number
  accepted: number
  published: number
  reviews: number
  /** Percentage. 0 when there are no submissions. */
  acceptanceRate: number
}

export interface AdminAnalyticsFieldGroup {
  field: string
  submissions: number
}

/**
 * Rolling 7-day counters.
 *
 * Each `null` means "the event source is empty for the window" — render as
 * an explicit "—" / "No data yet" empty state, never as zero with the same
 * weight as a real zero would carry.
 */
export interface AdminAnalyticsLast7Days {
  newSubmissions: number
  completedReviews: number
  publishedArticles: number
  /** From UserEvent.event_type='view'. `null` when no view events have ever been recorded. */
  views: number | null
  /** From UserEvent.event_type='download'. `null` when no download events have ever been recorded. */
  downloads: number | null
}

export interface AdminAnalyticsHealth {
  database: { ok: boolean; error: string | null }
  /**
   * OJS integration probe. `configured: false` when OJS_DATABASE_* env vars
   * are not set — render that as a neutral "not configured" state, not a
   * failure.
   */
  ojs: { ok: boolean; configured: boolean; error: string | null }
}

export interface AdminAnalyticsSummary {
  totals: AdminAnalyticsTotals
  fieldGroups: AdminAnalyticsFieldGroup[]
  last7: AdminAnalyticsLast7Days
  health: AdminAnalyticsHealth
  /** ISO timestamp of when the response was computed (server clock). */
  computedAt: string
}
