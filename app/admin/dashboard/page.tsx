import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Prisma } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, Eye, TrendingUp, Users, CheckCircle2, Clock, XCircle } from "lucide-react"
import { STATUS_STYLES } from "@/src/lib/utils"

export default async function AdminDashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect("/admin/login")
  }

  const [
    journalsCount,
    submissionsCount,
    underReviewCount,
    acceptedCount,
    rejectedCount,
    pendingReviewsCount,
    publishedCount,
    authorsCountResult
  ] = await Promise.all([
    prisma.journal.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { status: 'under_review' } }),
    prisma.submission.count({ where: { status: 'accepted' } }),
    prisma.submission.count({ where: { status: 'rejected' } }),
    prisma.review.count({ where: { review_status: 'pending' } }),
    prisma.publishedArticle.count(),
    prisma.submission.groupBy({
      by: ['author_email'],
      where: {
        author_email: { not: "" },
      },
    })
  ])

  const stats = {
    journals_count: journalsCount,
    submissions_count: submissionsCount,
    under_review_count: underReviewCount,
    accepted_count: acceptedCount,
    rejected_count: rejectedCount,
    pending_reviews_count: pendingReviewsCount,
    published_articles_count: publishedCount,
    authors_count: authorsCountResult.length
  }

  const recentSubmissions = await prisma.submission.findMany({
    take: 5,
    orderBy: { submission_date: 'desc' },
    include: {
      journal: {
        select: {
          title: true
        }
      }
    }
  })

  const statsCards = [
    {
      title: "Total Journals",
      value: Number(stats.journals_count) || 0,
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Total Submissions",
      value: Number(stats.submissions_count) || 0,
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "Under Review",
      value: Number(stats.under_review_count) || 0,
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
    {
      title: "Pending Reviews",
      value: Number(stats.pending_reviews_count) || 0,
      icon: Eye,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Accepted",
      value: Number(stats.accepted_count) || 0,
      icon: CheckCircle2,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "Rejected",
      value: Number(stats.rejected_count) || 0,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/20",
    },
    {
      title: "Published Articles",
      value: Number(stats.published_articles_count) || 0,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Total Authors",
      value: Number(stats.authors_count) || 0,
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
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSubmissions && recentSubmissions.length > 0 ? (
            <div className="space-y-4">
              {recentSubmissions.map((submission: Prisma.SubmissionGetPayload<{ include: { journal: { select: { title: true } } } }>) => {
                const safeStatus = submission.status ?? "unknown"
                return (
                <div
                  key={submission.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{submission.manuscript_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.journal?.title} • {submission.author_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        STATUS_STYLES[safeStatus] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {safeStatus.replace("_", " ")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(submission.submission_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No submissions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
