import { Globe, BookOpen, Users, FileText } from "lucide-react"

export function CredibilityStrip({ stats }: { stats: { totalJournals: number; totalArticles: number; totalUsers: number; countriesCount: number } }) {
  const items = [
    { label: "Journals", value: stats.totalJournals, icon: BookOpen },
    { label: "Articles", value: stats.totalArticles, icon: FileText },
    { label: "Researchers", value: stats.totalUsers, icon: Users },
    { label: "Countries", value: stats.countriesCount, icon: Globe },
  ]
  return (
    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl border border-border/40 bg-border/40 overflow-hidden backdrop-blur">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="bg-background/80 p-5 flex items-center gap-3 justify-center">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold tabular-nums tracking-tight leading-none">
              {value.toLocaleString()}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
