export interface JournalStatsCardProps {
  stats?: {
    articles: number
    issues: number
  } | null
}

export function JournalStatsCard({ stats }: JournalStatsCardProps) {
  if (!stats) return null

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-5 pb-3 border-b border-border/60">Journal Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary/5 border border-primary/10">
          <span className="text-2xl font-bold text-primary">{stats.articles}</span>
          <span className="text-xs text-muted-foreground mt-1 text-center">Published Articles</span>
        </div>
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary/5 border border-primary/10">
          <span className="text-2xl font-bold text-primary">{stats.issues}</span>
          <span className="text-xs text-muted-foreground mt-1 text-center">Total Issues</span>
        </div>
      </div>
    </div>
  )
}
