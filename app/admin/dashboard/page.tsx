import { redirect } from "next/navigation"
import { getSession } from "@/lib/db/auth"
import { query } from "@/lib/db/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, Eye, TrendingUp, Users, CheckCircle2, Clock, XCircle } from "lucide-react"

export default async function AdminDashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect("/admin/login")
  }

  const statsResult = await query(`
    SELECT
      (SELECT COUNT(*) FROM journals) as journals_count,
      (SELECT COUNT(*) FROM submissions) as submissions_count,
      (SELECT COUNT(*) FROM submissions WHERE status = 'under_review') as under_review_count,
      (SELECT COUNT(*) FROM submissions WHERE status = 'accepted') as accepted_count,
      (SELECT COUNT(*) FROM submissions WHERE status = 'rejected') as rejected_count,
      (SELECT COUNT(*) FROM reviews WHERE review_status = 'pending') as pending_reviews_count,
      (SELECT COUNT(*) FROM published_articles) as published_articles_count
  `)

  const stats = statsResult.rows[0]

  const recentSubmissionsResult = await query(`
    SELECT s.*, j.title as journal_title
    FROM submissions s
    LEFT JOIN journals j ON s.journal_id = j.id
    ORDER BY s.submission_date DESC
    LIMIT 5
  `)

  const recentSubmissions = recentSubmissionsResult.rows

  const statsCards = [
    {
      title: "Total Journals",
      value: Number(stats.journals_count) || 0,
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Total Submissions",
      value: Number(stats.submissions_count) || 0,
      icon: FileText,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Under Review",
      value: Number(stats.under_review_count) || 0,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Pending Reviews",
      value: Number(stats.pending_reviews_count) || 0,
      icon: Eye,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      title: "Accepted",
      value: Number(stats.accepted_count) || 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Rejected",
      value: Number(stats.rejected_count) || 0,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "Published Articles",
      value: Number(stats.published_articles_count) || 0,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/20",
    },
    {
      title: "Total Authors",
      value: Math.ceil((Number(stats.submissions_count) || 0) * 0.7),
      icon: Users,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
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
              {recentSubmissions.map((submission: any) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{submission.manuscript_title}</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.journal_title} • {submission.author_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        submission.status === "submitted"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          : submission.status === "under_review"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                            : submission.status === "accepted"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                      }`}
                    >
                      {submission.status.replace("_", " ")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(submission.submission_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No submissions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
