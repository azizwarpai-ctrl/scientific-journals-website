"use client"

import type { LucideIcon } from "lucide-react"
import { Area, AreaChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import type { TimeseriesSeries } from "@/src/features/admin-analytics/types/admin-analytics-types"

interface KpiCardProps {
    title: string
    value: number | string | null
    icon: LucideIcon
    /** 1-based chart token slot (--chart-1 … --chart-5). */
    chartSlot?: 1 | 2 | 3 | 4 | 5
    /** Sparkline series from /admin-analytics/timeseries; omit to hide. */
    series?: TimeseriesSeries
    isLoading?: boolean
}

/**
 * KPI stat card with an optional 14-day sparkline. Honors the
 * fabrication-guard contract: a series with `hasData: false` (or a null
 * value) renders "No data yet" — never a fabricated flat line at zero.
 */
export function KpiCard({ title, value, icon: Icon, chartSlot = 1, series, isLoading }: KpiCardProps) {
    const chartConfig: ChartConfig = {
        value: { label: title, color: `var(--chart-${chartSlot})` },
    }

    const showSparkline = series !== undefined && series.hasData
    const chartData = showSparkline
        ? series.points.map((p) => ({ date: p.date, value: p.value ?? 0 }))
        : []

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                    <div className="text-2xl font-bold">
                        {value === null ? <span className="text-muted-foreground">—</span> : value}
                    </div>
                )}
                {series !== undefined &&
                    (showSparkline ? (
                        <ChartContainer config={chartConfig} className="mt-2 h-10 w-full">
                            <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                                <Area
                                    dataKey="value"
                                    type="monotone"
                                    stroke="var(--color-value)"
                                    fill="var(--color-value)"
                                    fillOpacity={0.15}
                                    strokeWidth={1.5}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ChartContainer>
                    ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No data yet</p>
                    ))}
            </CardContent>
        </Card>
    )
}
