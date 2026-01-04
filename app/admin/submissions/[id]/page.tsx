import { redirect } from "next/navigation"
import { getSession } from "@/lib/db/auth"
import { query } from "@/lib/db/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Download, User, Mail, Calendar, Tag } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  const { id } = await params

  if (!session) {
    redirect("/admin/login")
  }

  let submission: any = null
  let reviews: any[] = []

  try {
    // Fetch submission with journal details
    const submissionResult = await query(
      `SELECT s.*, 
        row_to_json(j) as journals
       FROM submissions s
       LEFT JOIN journals j ON s.journal_id = j.id
       WHERE s.id = $1`,
      [id]
    )
    submission = submissionResult.rows[0]

    // Fetch reviews
    if (submission) {
      const reviewsResult = await query(
        `SELECT * FROM reviews WHERE submission_id = $1 ORDER BY created_at`,
        [id]
      )
      reviews = reviewsResult.rows
    }
  } catch (error) {
    console.error("Error fetching submission details:", error)
  }

  if (!submission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/submissions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Submission Not Found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/submissions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold line-clamp-1">{submission.manuscript_title}</h1>
          <p className="text-muted-foreground mt-1">Submission ID: {submission.id.slice(0, 8)}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-sm px-3 py-1 ${submission.status === "submitted"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200"
              : submission.status === "under_review"
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200"
                : submission.status === "accepted"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200"
            }`}
        >
          {submission.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="manuscript">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manuscript">Manuscript</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="manuscript" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Abstract</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{submission.abstract}</p>
                </CardContent>
              </Card>

              {submission.keywords && submission.keywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {submission.keywords.map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          <Tag className="mr-1 h-3 w-3" />
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {submission.manuscript_file_url && (
                <Card>
                  <CardHeader>
                    <CardTitle>Manuscript File</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <a href={submission.manuscript_file_url} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download Manuscript
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {submission.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{review.reviewer_name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`${review.review_status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              : review.review_status === "in_progress"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                            }`}
                        >
                          {review.review_status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.reviewer_email}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {review.recommendation && (
                        <div>
                          <span className="text-sm font-medium">Recommendation: </span>
                          <Badge variant="outline">{review.recommendation.replace("_", " ")}</Badge>
                        </div>
                      )}
                      {review.comments_to_author && (
                        <div>
                          <p className="text-sm font-medium mb-1">Comments to Author:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {review.comments_to_author}
                          </p>
                        </div>
                      )}
                      {review.review_date && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed: {new Date(review.review_date).toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No reviews yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Reviews will appear here once assigned</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Submission Timeline</p>
                  <p className="text-sm text-muted-foreground mt-1">History tracking coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submission Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Type:</span>
                  <span className="text-muted-foreground">
                    {submission.submission_type?.replace("_", " ") || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Submitted:</span>
                  <span className="text-muted-foreground">
                    {new Date(submission.submission_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Journal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-semibold">{submission.journals.title}</p>
                <p className="text-sm text-muted-foreground">{submission.journals.field}</p>
                {submission.journals.issn && (
                  <p className="text-sm">
                    <span className="font-medium">ISSN:</span> {submission.journals.issn}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Author Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{submission.author_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{submission.author_email}</span>
                </div>
              </div>

              {submission.corresponding_author_name && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-1">Corresponding Author:</p>
                  <div className="space-y-1">
                    <p className="text-sm">{submission.corresponding_author_name}</p>
                    <p className="text-sm text-muted-foreground">{submission.corresponding_author_email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href={`/admin/submissions/${id}/edit`}>Update Status</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href={`/admin/reviews/new?submission=${id}`}>Assign Reviewer</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
