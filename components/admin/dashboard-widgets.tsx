"use client"

import { Eye, Download } from "lucide-react"
import { KpiCard } from "@/components/admin/kpi-card"
import { SyncHealthWidget } from "@/components/admin/sync-health-widget"

/** Localized count, or null passthrough for the "—" empty state. */
function formatCount(n: number | null): number | string | null {
    return n === null ? null : n.toLocaleString("en-US")
}

interface DashboardWidgetsProps {
    /** Lifetime abstract/landing views from OJS; null when OJS unavailable. */
    views: number | null
    /** Lifetime galley downloads from OJS; null when OJS unavailable. */
    downloads: number | null
}

/**
 * Dashboard engagement totals (lifetime, sourced live from OJS
 * metrics_submission + submission count) plus the recurring-job health feed.
 * Values are real numbers; `null` (OJS unavailable) renders "—" per the
 * KpiCard contract. No sparkline series is passed, so these are value-only
 * cards — the 14-day trend series would need the metrics cron + reader
 * traffic, which is documented as an ops dependency.
 */
export function DashboardWidgets({ views, downloads }: DashboardWidgetsProps) {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <KpiCard title="Total Views" value={formatCount(views)} icon={Eye} />
                <KpiCard title="Total Downloads" value={formatCount(downloads)} icon={Download} />
            </div>
            <SyncHealthWidget />
        </div>
    )
}
