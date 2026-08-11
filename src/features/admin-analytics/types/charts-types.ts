export interface MonthlyPoint {
  /** "YYYY-MM" (UTC). */
  month: string
  submissions: number
  publications: number
}

export interface StatusDistribution {
  inReview: number
  inProduction: number
  published: number
  declined: number
}

export interface JournalBreakdownRow {
  ojsId: string
  title: string
  submissions: number
  articles: number
  views: number
  downloads: number
}

export interface AnalyticsCharts {
  journals: { ojsId: string; title: string }[]
  monthly: MonthlyPoint[]
  statusDistribution: StatusDistribution
  byJournal: JournalBreakdownRow[]
  /** False when OJS reads failed; payload is zeroed/empty. */
  ojsAvailable: boolean
  computedAt: string
}
