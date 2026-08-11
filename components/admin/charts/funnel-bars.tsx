"use client"

/** Submitted → Accepted → Published, as proportional horizontal bars. */
export function FunnelBars({ submitted, accepted, published }: { submitted: number; accepted: number; published: number }) {
  const stages = [
    { label: "Submitted", value: submitted, color: "var(--chart-1)" },
    { label: "Accepted", value: accepted, color: "var(--chart-2)" },
    { label: "Published", value: published, color: "var(--chart-3)" },
  ]
  const max = submitted || 1
  if (submitted === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No submissions yet</p>
  }
  return (
    <div className="space-y-3" aria-label="Submission funnel: submitted, accepted, published">
      {stages.map((s) => {
        const pct = Math.round((s.value / max) * 100)
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.value.toLocaleString("en-US")} · {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
