import { redirect } from "next/navigation"
import { getSession } from "@/lib/db/auth"
import { query } from "@/lib/db/config"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, FileText } from "lucide-react"
import Link from "next/link"
import { SubmissionsFilter } from "@/components/submissions-filter"
import { Suspense } from "react"

async function SubmissionsList({ searchParams }: { searchParams: { status?: string; search?: string } }) {
  // Build SQL query
  let sqlQuery = `
    SELECT s.*, j.title as journal_title, j.field as journal_field
    FROM submissions s
    LEFT JOIN journals j ON s.journal_id = j.id
  `
  const queryParams: any[] = []
  const conditions: string[] = []

  // Apply filters
  if (searchParams.status && searchParams.status !== "all") {
    conditions.push(`s.status = $${queryParams.length + 1}`)
    queryParams.push(searchParams.status)
  }

  if (searchParams.search) {
    conditions.push(`(s.manuscript_title ILIKE $${queryParams.length + 1} OR s.author_name ILIKE $${queryParams.length + 1} OR s.author_email ILIKE $${queryParams.length + 1})`)
    queryParams.push(`%${searchParams.search}%`)
  }

  if (conditions.length > 0) {
    sqlQuery += ` WHERE ${conditions.join(" AND ")}`
  }

  sqlQuery += ` ORDER BY s.submission_date DESC`

  let submissions: any[] = []
  let error: Error | null = null

  try {
    const result = await query(sqlQuery, queryParams)
    submissions = result.rows
  } catch (e) {
    error = e as Error
  }

  return (
    <Card>
      <CardContent className="p-0">
        {error && (
          <div className="p-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">Error loading submissions: {error.message}</p>
            </div>
          </div>
        )}

        {submissions && submissions.length > 0 ? (
          <div className="divide-y">
            {submissions.map((submission: any) => (
              <div key={submission.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg line-clamp-1">{submission.manuscript_title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {submission.journal_title} • {submission.journal_field}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span>
                        <span className="font-medium">Author:</span> {submission.author_name}
                      </span>
                      <span className="text-muted-foreground">{submission.author_email}</span>
                      <span className="text-muted-foreground">
                        {new Date(submission.submission_date).toLocaleDateString()}
                      </span>
                    </div>

                    {submission.keywords && submission.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {submission.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${submission.status === "submitted"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          : submission.status === "under_review"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                            : submission.status === "revision_required"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                              : submission.status === "accepted"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : submission.status === "rejected"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                        }`}
                    >
                      {submission.status.replace("_", " ")}
                    </span>

                    <Button asChild size="sm" variant="outline" className="bg-transparent">
                      <Link href={`/admin/submissions/${submission.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No submissions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchParams.status || searchParams.search
                ? "Try adjusting your filters"
                : "Submissions will appear here"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const session = await getSession()
  const params = await searchParams

  if (!session) {
    redirect("/admin/login")
  }

  // Build query for stats
  let allSubmissions: any[] = []
  try {
    const result = await query(
      `SELECT status FROM submissions ORDER BY submission_date DESC`
    )
    allSubmissions = result.rows
  } catch (error) {
    console.error("Error fetching submissions stats:", error)
  }

  const statusCounts = {
    all: allSubmissions?.length || 0,
    submitted: allSubmissions?.filter((s) => s.status === "submitted").length || 0,
    under_review: allSubmissions?.filter((s) => s.status === "under_review").length || 0,
    revision_required: allSubmissions?.filter((s) => s.status === "revision_required").length || 0,
    accepted: allSubmissions?.filter((s) => s.status === "accepted").length || 0,
    rejected: allSubmissions?.filter((s) => s.status === "rejected").length || 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submission Management</h1>
        <p className="text-muted-foreground mt-1">Manage all manuscript submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">All Submissions</div>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Submitted</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Under Review</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusCounts.under_review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Revision Required</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {statusCounts.revision_required}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Accepted</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Rejected</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <Suspense fallback={<div className="h-10 bg-muted animate-pulse rounded" />}>
            <SubmissionsFilter />
          </Suspense>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Suspense
        fallback={
          <Card>
            <CardContent className="py-12 text-center">Loading submissions...</CardContent>
          </Card>
        }
      >
        <SubmissionsList searchParams={params} />
      </Suspense>
    </div>
  )
}
