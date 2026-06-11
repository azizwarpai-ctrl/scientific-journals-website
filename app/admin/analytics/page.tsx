"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, BookOpen, FileText, Eye, CheckCircle, Loader2 } from "lucide-react"
import { useAdminAnalyticsSummary } from "@/src/features/admin-analytics/api/use-admin-analytics-summary"
import type { AdminAnalyticsSummary } from "@/src/features/admin-analytics/types/admin-analytics-types"

const EMPTY = "—"

function formatCount(value: number | null): string {
  return value === null ? EMPTY : value.toLocaleString()
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useAdminAnalyticsSummary()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics &amp; Reports</h1>
          <p className="text-muted-foreground mt-1">Overview of platform performance and statistics</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Failed to load analytics{error instanceof Error ? `: ${error.message}` : ""}.
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AnalyticsView summary={data} />
}

function AnalyticsView({ summary }: { summary: AdminAnalyticsSummary }) {
  const { totals, fieldGroups, last7, health } = summary

  const stats = [
    {
      title: "Total Journals",
      value: totals.journals.toLocaleString(),
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Total Submissions",
      value: totals.submissions.toLocaleString(),
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "Accepted Articles",
      value: totals.accepted.toLocaleString(),
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/20",
    },
    {
      title: "Published Articles",
      value: totals.published.toLocaleString(),
      icon: TrendingUp,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-500/20",
    },
    {
      title: "Total Reviews",
      value: totals.reviews.toLocaleString(),
      icon: Eye,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/20",
    },
    {
      title: "Acceptance Rate",
      value: `${totals.acceptanceRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-500/20",
    },
  ]

  const topFields = fieldGroups.slice(0, 5)
  const submissionsForRatio = totals.submissions || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics &amp; Reports</h1>
        <p className="text-muted-foreground mt-1">Overview of platform performance and statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Top Fields by Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions by Field</CardTitle>
        </CardHeader>
        <CardContent>
          {topFields.length > 0 ? (
            <div className="space-y-4">
              {topFields.map(({ field, submissions }) => (
                <div key={field} className="flex items-center justify-between">
                  <span className="font-medium">{field}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${((submissions / submissionsForRatio) * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {submissions.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No submission data available</p>
          )}
        </CardContent>
      </Card>

      {/* System Health + Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <HealthRow label="Database" probe={health.database} />
            <HealthRow
              label="OJS integration"
              probe={
                health.ojs.configured
                  ? { ok: health.ojs.ok, error: health.ojs.error }
                  : { ok: false, error: "Not configured" }
              }
              neutralWhenNotConfigured={!health.ojs.configured}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Last 7 days:</p>
              <ActivityRow label="New Submissions" value={last7.newSubmissions} />
              <ActivityRow label="Completed Reviews" value={last7.completedReviews} />
              <ActivityRow label="Published Articles" value={last7.publishedArticles} />
              <ActivityRow label="Article Views" value={last7.views} />
              <ActivityRow label="Article Downloads" value={last7.downloads} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ActivityRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span
        className={
          value === null
            ? "font-medium text-muted-foreground"
            : "font-medium tabular-nums"
        }
        title={value === null ? "No events recorded yet" : undefined}
      >
        {formatCount(value)}
      </span>
    </div>
  )
}

function HealthRow({
  label,
  probe,
  neutralWhenNotConfigured,
}: {
  label: string
  probe: { ok: boolean; error: string | null }
  neutralWhenNotConfigured?: boolean
}) {
  let statusText: string
  let statusClass: string

  if (neutralWhenNotConfigured) {
    statusText = "Not configured"
    statusClass = "text-muted-foreground"
  } else if (probe.ok) {
    statusText = "Healthy"
    statusClass = "text-emerald-600 dark:text-emerald-400"
  } else {
    statusText = "Unhealthy"
    statusClass = "text-destructive"
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span
        className={`text-sm font-medium ${statusClass}`}
        title={probe.error ?? undefined}
      >
        {statusText}
      </span>
    </div>
  )
}
