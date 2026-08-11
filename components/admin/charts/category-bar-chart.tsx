"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

/** Generic horizontal category bar chart. `data` is pre-sorted by the caller. */
export function CategoryBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const config: ChartConfig = { value: { label, color: "var(--chart-1)" } }
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
  }
  return (
    <ChartContainer config={config} className="h-64 w-full" aria-label={label}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={140} tickLine={false} axisLine={false} tickMargin={6} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  )
}
