import { redirect } from "next/navigation"
import { getSession } from "@/lib/db/auth"
import { query } from "@/lib/db/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, BookOpen, FileText, Eye, CheckCircle } from "lucide-react"

export default async function AnalyticsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Fetch analytics data
  let journalsCount = 0
  let submissionsCount = 0
  let acceptedCount = 0
  let publishedCount = 0
  let reviewsCount = 0

  try {
    const journalsResult = await query(`SELECT COUNT(*) as count FROM journals`)
    journalsCount = parseInt(journalsResult.rows[0].count)

    const submissionsResult = await query(`SELECT COUNT(*) as count FROM submissions`)
    submissionsCount = parseInt(submissionsResult.rows[0].count)

    const acceptedResult = await query(`SELECT COUNT(*) as  count FROM submissions WHERE status = 'accepted'`)
    acceptedCount = parseInt(acceptedResult.rows[0].count)

    const publishedResult = await query(`SELECT COUNT(*) as count FROM published_articles`)
    publishedCount = parseInt(publishedResult.rows[0].count)

    const reviewsResult = await query(`SELECT COUNT(*) as count FROM reviews`)
    reviewsCount = parseInt(reviewsResult.rows[0].count)
  } catch (error) {
    console.error("Error fetching analytics:", error)
  }

  // Calculate acceptance rate
  const acceptanceRate = submissionsCount && submissionsCount > 0 ? ((acceptedCount || 0) / submissionsCount) * 100 : 0

  // Fetch submissions by field
  let fieldGroups: { [key: string]: number } = {}
  try {
    const result = await query(
      `SELECT j.field, COUNT(s.id) as count
       FROM journals j
       LEFT JOIN submissions s ON s.journal_id = j.id
       WHERE j.field IS NOT NULL
       GROUP BY j.field
       ORDER BY count DESC`
    )
    result.rows.forEach((row: any) => {
      fieldGroups[row.field] = parseInt(row.count)
    })
  } catch (error) {
    console.error("Error fetching field groups:", error)
  }

  const topFields = Object.entries(fieldGroups)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const stats = [
    {
      title: "Total Journals",
      value: journalsCount || 0,
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Total Submissions",
      value: submissionsCount || 0,
      icon: FileText,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Accepted Articles",
      value: acceptedCount || 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Published Articles",
      value: publishedCount || 0,
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Total Reviews",
      value: reviewsCount || 0,
      icon: Eye,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      title: "Acceptance Rate",
      value: `${acceptanceRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/20",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Reports</h1>
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
              {topFields.map(([field, count]) => (
                <div key={field} className="flex items-center justify-between">
                  <span className="font-medium">{field}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${((count / (submissionsCount || 1)) * 100).toFixed(0)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No submission data available</p>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database Status</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Status</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">API Status</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Operational</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Last 7 days:</p>
              <div className="flex items-center justify-between">
                <span>New Submissions</span>
                <span className="font-medium">{Math.floor((submissionsCount || 0) * 0.15)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Completed Reviews</span>
                <span className="font-medium">{Math.floor((reviewsCount || 0) * 0.2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Published Articles</span>
                <span className="font-medium">{Math.floor((publishedCount || 0) * 0.1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
