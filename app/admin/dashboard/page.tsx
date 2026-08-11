import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, Eye, TrendingUp, Users, CheckCircle2, Clock, XCircle } from "lucide-react"
import { DashboardWidgets } from "@/components/admin/dashboard-widgets"
import { isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import {
  getOjsPlatformStats,
  getSnapshotAggregates,
  getOjsRecentSubmissions,
  type OjsPlatformStats,
  type OjsRecentSubmission,
} from "@/src/features/ojs/server/ojs-stats-service"
import { getOjsReviewOverview } from "@/src/features/reviews/server/ojs-review-service"
import { OjsStatusBanner } from "@/src/features/reviews/components/ojs-status-banner"
import { SUBMISSION_STATUS_LABELS, labelFor } from "@/src/features/reviews/server/ojs-review-constants"

export default async function AdminDashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect("/admin/login")
  }

  const ojsConfigured = isOjsConfigured()

  // Start the local and OJS read groups concurrently, then await both.
  // Local reads (journal count + snapshot aggregates) are always available;
  // the OJS group is settled to a tagged result so a failure degrades to an
  // explicit "unavailable" state rather than throwing (never fake 0s).
  const localPromise = Promise.all([prisma.journal.count(), getSnapshotAggregates()])
  const ojsPromise = ojsConfigured
    ? Promise.all([getOjsPlatformStats(), getOjsReviewOverview(), getOjsRecentSubmissions(5)])
        .then((r) => ({ ok: true as const, value: r }))
        .catch((e) => ({ ok: false as const, error: e as unknown }))
    : Promise.resolve(null)

  const [[journalsCount, snapshot], ojsResult] = await Promise.all([localPromise, ojsPromise])

  let stats: OjsPlatformStats | null = null
  let pendingReviews: number | null = null
  let recentSubmissions: OjsRecentSubmission[] = []
  let ojsError = false

  if (ojsResult) {
    if (ojsResult.ok) {
      const [platform, overview, recent] = ojsResult.value
      stats = platform
      pendingReviews = overview.activeAssignments
      recentSubmissions = recent
    } else {
      console.error(
        "[dashboard] OJS stats failed:",
        ojsResult.error instanceof Error ? ojsResult.error.message : ojsResult.error
      )
      ojsError = true
    }
  }

  const statsCards = [
    {
      title: "Total Journals",
      value: journalsCount,
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Total Submissions",
      value: stats ? stats.totalSubmissions : null,
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "Under Review",
      value: stats ? stats.inReview : null,
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Pending Reviews",
      value: pendingReviews,
      icon: Eye,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Accepted",
      // Same definition as the analytics route: everything past review that
      // wasn't declined — in production plus published.
      value: stats ? stats.inProduction + stats.published : null,
      icon: CheckCircle2,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "Rejected",
      value: stats ? stats.declined : null,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/20",
    },
    {
      title: "Published Articles",
      value: snapshot.publishedArticles,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Total Authors",
      value: stats ? stats.totalAuthors : null,
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user.full_name || user.email}</p>
      </div>

      {/* OJS-derived cards degrade to a banner when OJS is down/unset; the
          local cards (journals, published, engagement widgets) still render. */}
      {!ojsConfigured ? (
        <OjsStatusBanner state="unconfigured" />
      ) : ojsError ? (
        <OjsStatusBanner state="unavailable" />
      ) : null}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
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
                <div className="text-2xl font-bold">{stat.value === null ? "—" : stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Engagement sparklines + sync-run health (client, live data) */}
      <DashboardWidgets />

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length > 0 ? (
            <div className="space-y-4">
              {recentSubmissions.map((submission) => (
                <div
                  key={submission.submissionId}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{submission.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.journalTitle}
                      {submission.authorName ? ` • ${submission.authorName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
                      {labelFor(SUBMISSION_STATUS_LABELS, submission.status)}
                    </span>
                    {submission.dateSubmitted && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(submission.dateSubmitted).toLocaleDateString("en-US", { timeZone: "UTC" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {ojsConfigured && !ojsError ? "No submissions yet" : "Submission data unavailable"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
