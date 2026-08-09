"use client"

import { Eye, Download, FileText } from "lucide-react"
import { KpiCard } from "@/components/admin/kpi-card"
import { SyncHealthWidget } from "@/components/admin/sync-health-widget"
import { useAdminSparklines } from "@/src/features/admin-analytics/api/use-admin-timeseries"
import type { TimeseriesSeries } from "@/src/features/admin-analytics/types/admin-analytics-types"

function windowTotal(series: TimeseriesSeries | undefined): number | null {
    if (!series || !series.hasData) return null
    return series.points.reduce((sum, p) => sum + (p.value ?? 0), 0)
}

/**
 * Client-side dashboard widgets: 14-day engagement sparklines (from the
 * timeseries endpoint) and the recurring-job health feed. Metrics with no
 * recorded events render "—" / "No data yet" per the fabrication-guard
 * contract.
 */
export function DashboardWidgets() {
    const { data, isLoading } = useAdminSparklines()
    const byMetric = new Map(data?.series.map((s) => [s.metric, s]) ?? [])

    const views = byMetric.get("views")
    const downloads = byMetric.get("downloads")
    const submissions = byMetric.get("submissions")

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <KpiCard
                    title="Views (14d)"
                    value={windowTotal(views)}
                    icon={Eye}
                    chartSlot={1}
                    series={views}
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Downloads (14d)"
                    value={windowTotal(downloads)}
                    icon={Download}
                    chartSlot={2}
                    series={downloads}
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Submissions (14d)"
                    value={windowTotal(submissions)}
                    icon={FileText}
                    chartSlot={3}
                    series={submissions}
                    isLoading={isLoading}
                />
            </div>
            <SyncHealthWidget />
        </div>
    )
}
