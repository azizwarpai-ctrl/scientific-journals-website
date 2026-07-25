"use client"

import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ExternalLink, FileText } from "lucide-react"
import Link from "next/link"
import {
  useGetOjsSubmission,
  SubmissionReviewDetail,
  DecisionsTimeline,
  OjsStatusBanner,
} from "@/src/features/reviews"

function isOjsUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message === "OJS_UNAVAILABLE"
}

export default function SubmissionDetailPage() {
  const params = useParams<{ id: string }>()
  const submissionId = Number(params?.id)
  const validId = Number.isInteger(submissionId) && submissionId > 0

  const { data, isLoading, error } = useGetOjsSubmission(validId ? submissionId : 0)

  const header = (
    <div className="flex items-center gap-4">
      <Button
        asChild
        variant="outline"
        size="icon"
        className="transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <Link href="/admin/submissions">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <h1 className="text-3xl font-bold">Submission Review</h1>
    </div>
  )

  if (!validId) {
    return <div className="space-y-6">{header}<p className="text-muted-foreground">Invalid submission id.</p></div>
  }

  if (data && data.configured === false) {
    return <div className="space-y-6">{header}<OjsStatusBanner state="unconfigured" /></div>
  }

  if (isOjsUnavailable(error)) {
    return <div className="space-y-6">{header}<OjsStatusBanner state="unavailable" /></div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="py-12 text-center text-muted-foreground animate-pulse">
          Loading submission...
        </div>
      </div>
    )
  }

  if (error) {
    const notFound = error instanceof Error && error.message === "Not found"
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {notFound ? "Submission not found" : "Error loading submission"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {notFound
                ? `No OJS submission with id #${submissionId}`
                : (error as Error).message}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const detail = data?.data
  if (!detail) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <Link href="/admin/submissions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold line-clamp-1">{detail.title}</h1>
          <p className="text-muted-foreground mt-1">
            {detail.journalTitle} • Submission #{detail.submissionId}
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {detail.stageLabel}
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {detail.statusLabel}
        </Badge>
        <Button
          asChild
          className="transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <a href={detail.ojsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in OJS
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SubmissionReviewDetail detail={detail} />
          <DecisionsTimeline decisions={detail.decisions} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submission Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>
                  {detail.dateSubmitted
                    ? new Date(detail.dateSubmitted).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last activity</span>
                <span>
                  {detail.dateLastActivity
                    ? new Date(detail.dateLastActivity).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current round</span>
                <span>{detail.currentRound ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviews</span>
                <span>
                  {detail.reviewsCompleted} completed / {detail.reviewsPending} pending
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assigned Editors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.editors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No editors assigned</p>
              ) : (
                detail.editors.map((editor) => (
                  <div key={`${editor.userId}-${editor.userGroupId}`} className="text-sm">
                    <p className="font-medium">{editor.name}</p>
                    <p className="text-muted-foreground">
                      {editor.roleId === 16 ? "Journal Manager" : editor.roleId === 17 ? "Section Editor" : `Role ${editor.roleId}`}
                      {editor.recommendOnly ? " • recommend only" : ""}
                      {editor.dateAssigned
                        ? ` • since ${new Date(editor.dateAssigned).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
