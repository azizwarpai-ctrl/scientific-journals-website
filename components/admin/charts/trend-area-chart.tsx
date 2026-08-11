"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { MonthlyPoint } from "@/src/features/admin-analytics/types/charts-types"

const config: ChartConfig = {
  submissions: { label: "Submissions", color: "var(--chart-1)" },
  publications: { label: "Publications", color: "var(--chart-2)" },
}

export function TrendAreaChart({ data }: { data: MonthlyPoint[] }) {
  const total = data.reduce((s, p) => s + p.submissions + p.publications, 0)
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No monthly activity yet</p>
  }
  return (
    <ChartContainer config={config} className="h-64 w-full" aria-label="Submissions and publications per month">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="submissions" type="monotone" stroke="var(--color-submissions)" fill="var(--color-submissions)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
        <Area dataKey="publications" type="monotone" stroke="var(--color-publications)" fill="var(--color-publications)" fillOpacity={0.15} strokeWidth={1.5} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  )
}
