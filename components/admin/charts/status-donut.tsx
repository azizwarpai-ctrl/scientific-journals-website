"use client"

import { Pie, PieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { StatusDistribution } from "@/src/features/admin-analytics/types/charts-types"

const config: ChartConfig = {
  inReview: { label: "In review", color: "var(--chart-1)" },
  inProduction: { label: "In production", color: "var(--chart-2)" },
  published: { label: "Published", color: "var(--chart-3)" },
  declined: { label: "Declined", color: "var(--chart-4)" },
}

const STATUS_KEYS = ["inReview", "inProduction", "published", "declined"] as const

export function StatusDonut({ data }: { data: StatusDistribution }) {
  const allRows = STATUS_KEYS.map((key) => ({ key, value: data[key] }))
  const rows = allRows.filter((r) => r.value > 0)
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No submissions yet</p>
  }
  return (
    <div>
      <ChartContainer config={config} className="mx-auto aspect-square h-56" aria-label={`Submission status distribution, ${total} total`}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
          <Pie data={rows} dataKey="value" nameKey="key" innerRadius={54} strokeWidth={2} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.key} fill={`var(--color-${r.key})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      {/* Persistent text legend: every status + count, readable without color. */}
      <ul className="mt-3 space-y-1 text-xs">
        {allRows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config[r.key].color }} aria-hidden />
              {config[r.key].label}
            </span>
            <span className="tabular-nums text-muted-foreground">{r.value.toLocaleString("en-US")}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
