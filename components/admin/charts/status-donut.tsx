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

export function StatusDonut({ data }: { data: StatusDistribution }) {
  const rows = [
    { key: "inReview", value: data.inReview },
    { key: "inProduction", value: data.inProduction },
    { key: "published", value: data.published },
    { key: "declined", value: data.declined },
  ].filter((r) => r.value > 0)
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No submissions yet</p>
  }
  return (
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
  )
}
