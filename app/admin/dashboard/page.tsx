"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"
import { journalsAPI, messagesAPI, ojsAPI } from "@/lib/php-api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, Eye, TrendingUp, Users, CheckCircle2, Clock, XCircle } from "lucide-react"

export default function AdminDashboardPage() {
  const { data: user, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  const [stats, setStats] = useState({
    journals_count: 0,
    submissions_count: 0,
    under_review_count: 0,
    accepted_count: 0,
    rejected_count: 0,
    pending_reviews_count: 0,
    published_articles_count: 0
  })
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      try {
        // Fetch separate counts (using list endpoints with limit=1 to get totals)
        const [journalsRes, messagesRes, ojsRes] = await Promise.all([
          journalsAPI.list(1, 1),
          messagesAPI.list(1, 1),
          ojsAPI.listSubmissions({ page: 1, per_page: 5 }) // Get recent submissions too
        ])

        // Note: Real counts depend on API returning 'total'. 
        // If PHP API structure is standard { data: [], total: 100 }, this works.
        // Assuming OJS API returns submissions status for counts, or we mock it if API is simple.

        // Since the current PHP/OJS implementation might be basic, we'll use available data.

        setStats({
          journals_count: journalsRes.total || 0,
          submissions_count: ojsRes.total || 0, // Assuming OJS submissions
          under_review_count: 0, // Requires filtered API call
          accepted_count: 0,
          rejected_count: 0,
          pending_reviews_count: 0,
          published_articles_count: 0
        })

        setRecentSubmissions(ojsRes.data || [])
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user])

  if (authLoading || (loading && user)) {
    return <div className="p-8">Loading dashboard...</div>
  }

  if (!user) return null

  const statsCards = [
    {
      title: "Total Journals",
      value: stats.journals_count,
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Total Submissions",
      value: stats.submissions_count,
      icon: FileText,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    // Placeholders for other stats until API supports filtering
    {
      title: "Under Review",
      value: "-",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Pending Reviews",
      value: "-",
      icon: Eye,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      title: "Accepted",
      value: "-",
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Rejected",
      value: "-",
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "Published Articles",
      value: "-",
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/20",
    },
    {
      title: "Total Authors",
      value: "-",
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
                    <p className="font-medium">{submission.title || "Untitled"}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {submission.id} • Status: {submission.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(submission.date_submitted || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No submissions yet (or OJS sync pending)</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
