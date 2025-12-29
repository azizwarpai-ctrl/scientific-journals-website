import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Plus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export default async function ReviewsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/admin/login")
  }

  // Fetch all reviews with submission and journal details
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select(
      `
      *,
      submissions(
        manuscript_title,
        journals(title)
      )
    `,
    )
    .order("created_at", { ascending: false })

  const stats = {
    total: reviews?.length || 0,
    pending: reviews?.filter((r) => r.review_status === "pending").length || 0,
    in_progress: reviews?.filter((r) => r.review_status === "in_progress").length || 0,
    completed: reviews?.filter((r) => r.review_status === "completed").length || 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground mt-1">Manage peer reviews and reviewer assignments</p>
        </div>
        <Button asChild>
          <Link href="/admin/reviews/new">
            <Plus className="mr-2 h-4 w-4" />
            Assign Reviewer
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Reviews</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">In Progress</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">Error loading reviews: {error.message}</p>
              </div>
            </div>
          )}

          {reviews && reviews.length > 0 ? (
            <div className="divide-y">
              {reviews.map((review: any) => (
                <div key={review.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-semibold line-clamp-1">{review.submissions?.manuscript_title}</h3>
                        <p className="text-sm text-muted-foreground">{review.submissions?.journals?.title}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <span>
                          <span className="font-medium">Reviewer:</span> {review.reviewer_name}
                        </span>
                        <span className="text-muted-foreground">{review.reviewer_email}</span>
                        {review.review_date && (
                          <span className="text-muted-foreground">
                            Reviewed: {new Date(review.review_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {review.recommendation && (
                        <Badge variant="outline" className="mt-2">
                          {review.recommendation.replace("_", " ")}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <Badge
                        variant="outline"
                        className={`${
                          review.review_status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200"
                            : review.review_status === "in_progress"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200"
                              : review.review_status === "pending"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200"
                        }`}
                      >
                        {review.review_status.replace("_", " ")}
                      </Badge>

                      <Button asChild size="sm" variant="outline" className="bg-transparent">
                        <Link href={`/admin/submissions/${review.submission_id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Submission
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Eye className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No reviews found</p>
              <p className="text-sm text-muted-foreground mt-1">Start by assigning reviewers to submissions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
