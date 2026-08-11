"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingUp, BookOpen, FileText, Eye, CheckCircle, Loader2 } from "lucide-react"
import { useAdminAnalyticsSummary } from "@/src/features/admin-analytics/api/use-admin-analytics-summary"
import { useAdminCharts } from "@/src/features/admin-analytics/api/use-admin-charts"
import { TrendAreaChart } from "@/components/admin/charts/trend-area-chart"
import { StatusDonut } from "@/components/admin/charts/status-donut"
import { FunnelBars } from "@/components/admin/charts/funnel-bars"
import { CategoryBarChart } from "@/components/admin/charts/category-bar-chart"
import type { AdminAnalyticsSummary } from "@/src/features/admin-analytics/types/admin-analytics-types"
import type { AnalyticsCharts } from "@/src/features/admin-analytics/types/charts-types"

/** Mirrors the server-side funnel derivation (types match `StatusDistribution`). */
function funnelFrom(s: { inReview: number; inProduction: number; published: number; declined: number }) {
  const submitted = s.inReview + s.inProduction + s.published + s.declined
  return { submitted, accepted: s.inProduction + s.published, published: s.published }
}

const EMPTY = "—"

function formatCount(value: number | null): string {
  return value === null ? EMPTY : value.toLocaleString()
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useAdminAnalyticsSummary()
  const [journalId, setJournalId] = useState<string | undefined>(undefined)
  const charts = useAdminCharts(journalId)

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

  return (
    <AnalyticsView
      summary={data}
      journalId={journalId}
      onJournalChange={setJournalId}
      charts={charts.data}
      chartsError={charts.isError}
      onRetryCharts={() => {
        void charts.refetch()
      }}
    />
  )
}

function AnalyticsView({
  summary,
  journalId,
  onJournalChange,
  charts,
  chartsError,
  onRetryCharts,
}: {
  summary: AdminAnalyticsSummary
  journalId: string | undefined
  onJournalChange: (journalId: string | undefined) => void
  charts: AnalyticsCharts | undefined
  chartsError: boolean
  onRetryCharts: () => void
}) {
  const { totals, fieldGroups, last7, health, ojsAvailable } = summary

  // OJS-sourced figures render as "—" when OJS is unreachable/unset, so a
  // real 0 is never confused with "we couldn't read it". Journals and
  // Published Articles are backed by local data (snapshot) and stay valid.
  const ojsValue = (n: number): string => (ojsAvailable ? n.toLocaleString() : EMPTY)

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
      value: ojsValue(totals.submissions),
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "Accepted Articles",
      value: ojsValue(totals.accepted),
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
      value: ojsValue(totals.reviews),
      icon: Eye,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/20",
    },
    {
      title: "Acceptance Rate",
      value: ojsAvailable ? `${totals.acceptanceRate.toFixed(1)}%` : EMPTY,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-500/20",
    },
  ]

  const topFields = fieldGroups.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics &amp; Reports</h1>
          <p className="text-muted-foreground mt-1">Overview of platform performance and statistics</p>
        </div>
        <Select
          value={journalId ?? "all"}
          onValueChange={(value) => onJournalChange(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-[220px]" aria-label="Filter by journal">
            <SelectValue placeholder="All journals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All journals</SelectItem>
            {charts?.journals.map((journal) => (
              <SelectItem key={journal.ojsId} value={journal.ojsId}>
                {journal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!ojsAvailable && (
        <Card>
          <CardContent className="py-3 text-sm text-muted-foreground">
            Submission, review, and acceptance figures are sourced live from OJS,
            which is currently unavailable — those values show as {EMPTY}. Journal
            and published-article counts remain accurate.
          </CardContent>
        </Card>
      )}

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
          <CategoryBarChart
            label="Submissions"
            data={topFields.map(({ field, submissions }) => ({ label: field, value: submissions }))}
          />
        </CardContent>
      </Card>

      {/* Deep-dive charts */}
      {chartsError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
            <span>Couldn&apos;t load the chart data.</span>
            <Button variant="outline" size="sm" onClick={onRetryCharts}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : charts && !charts.ojsAvailable ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            The trend, status, and funnel charts are sourced live from OJS, which
            is currently unavailable. They will populate once the connection is
            restored.
          </CardContent>
        </Card>
      ) : charts ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Submissions &amp; Publications (12 mo)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendAreaChart data={charts.monthly} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDonut data={charts.statusDistribution} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Acceptance funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelBars {...funnelFrom(charts.statusDistribution)} />
              </CardContent>
            </Card>
          </div>

          {/* All-journals only: cross-journal breakdowns */}
          {!journalId && charts.byJournal.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Submissions by journal</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryBarChart
                    label="Submissions"
                    data={[...charts.byJournal]
                      .sort((a, b) => b.submissions - a.submissions)
                      .slice(0, 10)
                      .map((r) => ({ label: r.title, value: r.submissions }))}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Views by journal</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryBarChart
                    label="Views"
                    data={[...charts.byJournal]
                      .sort((a, b) => b.views - a.views)
                      .slice(0, 10)
                      .map((r) => ({ label: r.title, value: r.views }))}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : null}

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
              <ActivityRow
                label="New Submissions"
                value={ojsAvailable ? last7.newSubmissions : null}
                emptyReason={ojsAvailable ? undefined : "OJS unavailable"}
              />
              <ActivityRow
                label="Completed Reviews"
                value={ojsAvailable ? last7.completedReviews : null}
                emptyReason={ojsAvailable ? undefined : "OJS unavailable"}
              />
              <ActivityRow
                label="Published Articles"
                value={ojsAvailable ? last7.publishedArticles : null}
                emptyReason={ojsAvailable ? undefined : "OJS unavailable"}
              />
              <ActivityRow label="Article Views" value={last7.views} />
              <ActivityRow label="Article Downloads" value={last7.downloads} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ActivityRow({
  label,
  value,
  emptyReason = "No events recorded yet",
}: {
  label: string
  value: number | null
  /** Tooltip when value is null — distinguishes "no events" from "OJS unavailable". */
  emptyReason?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span
        className={
          value === null
            ? "font-medium text-muted-foreground"
            : "font-medium tabular-nums"
        }
        title={value === null ? emptyReason : undefined}
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
