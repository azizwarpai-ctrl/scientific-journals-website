"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"
import { ojsAPI } from "@/lib/php-api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, FileText, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { SubmissionsFilter } from "@/components/submissions-filter"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

function SubmissionDetailModal({ submissionId, open, onOpenChange }: { submissionId: number | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && submissionId) {
      setLoading(true)
      ojsAPI.getSubmission(submissionId)
        .then(res => setSubmission(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    } else {
      setSubmission(null)
    }
  }, [open, submissionId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="p-12 text-center">Loading submission details...</div>
        ) : submission ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold line-clamp-1">{submission.title || "Untitled"}</h2>
                <p className="text-muted-foreground mt-1">Submission ID: {submission.id}</p>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {submission.status}
              </Badge>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Tabs defaultValue="manuscript">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manuscript">Manuscript</TabsTrigger>
                    <TabsTrigger value="reviews">Reviews (0)</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manuscript" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Abstract</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{submission.abstract || "No abstract available"}</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reviews" className="space-y-4">
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No reviews yet</p>
                      </CardContent>
                    </Card>
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
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Submitted:</span>
                        <span className="text-muted-foreground">
                          {new Date(submission.date_submitted || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">Submission not found</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SubmissionsList({ status, search }: { status?: string, search?: string }) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true)
      try {
        const response = await ojsAPI.listSubmissions({ status, search, page: 1, per_page: 50 })
        setSubmissions(response.data || [])
      } catch (err: any) {
        setError(err.message || "Failed to load submissions")
      } finally {
        setLoading(false)
      }
    }
    fetchSubmissions()
  }, [status, search])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">Loading submissions...</CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {error && (
            <div className="p-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">Error loading submissions: {error}</p>
              </div>
            </div>
          )}

          {submissions.length > 0 ? (
            <div className="divide-y">
              {submissions.map((submission: any) => (
                <div key={submission.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg line-clamp-1">{submission.title || "Untitled"}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            ID: {submission.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(submission.date_submitted || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-700">
                        {submission.status || "Unknown"}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => setSelectedSubmissionId(submission.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
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
                {status || search ? "Try adjusting your filters" : "Submissions will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionDetailModal
        submissionId={selectedSubmissionId}
        open={!!selectedSubmissionId}
        onOpenChange={(open) => !open && setSelectedSubmissionId(null)}
      />
    </>
  )
}

export default function SubmissionsPage() {
  const { data: user, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  const status = searchParams.get("status") || "all"
  const search = searchParams.get("search") || ""

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login")
    }
  }, [user, authLoading, router])

  if (authLoading || (!user)) {
    return <div className="p-8">Loading...</div>
  }

  const statusCounts = {
    all: 0,
    submitted: 0,
    under_review: 0,
    revision_required: 0,
    accepted: 0,
    rejected: 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submission Management</h1>
        <p className="text-muted-foreground mt-1">Manage all manuscript submissions</p>
      </div>

      {/* Placeholder Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">All Submissions</div>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
          </CardContent>
        </Card>
        {/* Other stats cards mocked/placeholder */}
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
      <Suspense fallback={<div className="p-8 text-center">Loading list...</div>}>
        <SubmissionsList status={status} search={search} />
      </Suspense>
    </div>
  )
}
