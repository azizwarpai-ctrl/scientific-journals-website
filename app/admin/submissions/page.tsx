import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Prisma } from "@prisma/client"
import { Card, CardContent } from "@/components/ui/card"
import { SubmissionsFilter } from "@/components/submissions-filter"
import { Suspense } from "react"
import { SubmissionsTable, type SubmissionRow } from "./submissions-table"

async function SubmissionsList({ searchParams }: { searchParams: { status?: string; search?: string } }) {
  const { status, search } = searchParams

  const where: Prisma.SubmissionWhereInput = {}

  if (status && status !== "all") {
    where.status = status
  }

  if (search) {
    where.OR = [
      { manuscript_title: { contains: search } },
      { author_name: { contains: search } },
      { author_email: { contains: search } }
    ]
  }

  type SubmissionWithJournal = Prisma.SubmissionGetPayload<{
    include: {
      journal: {
        select: {
          title: true,
          field: true
        }
      }
    }
  }>

  let submissions: SubmissionWithJournal[] = []
  let error: Error | null = null

  try {
    submissions = await prisma.submission.findMany({
      where,
      orderBy: { submission_date: "desc" },
      include: {
        journal: {
          select: {
            title: true,
            field: true
          }
        }
      }
    })
  } catch (e) {
    error = e as Error
  }

  // Serialize BigInt-safe plain rows for the client table
  const rows: SubmissionRow[] = submissions.map((submission: SubmissionWithJournal) => ({
    id: String(submission.id),
    title: submission.manuscript_title,
    journalTitle: submission.journal?.title ?? "",
    journalField: submission.journal?.field ?? "",
    author: submission.author_name,
    authorEmail: submission.author_email,
    status: submission.status ?? "unknown",
    date: new Date(submission.submission_date).toISOString(),
  }))

  return (
    <Card>
      <CardContent className="p-4">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <p className="text-sm text-destructive">Error loading submissions: {error.message}</p>
          </div>
        )}

        <SubmissionsTable
          rows={rows}
          hasFilters={Boolean(searchParams.status || searchParams.search)}
        />
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
  let allSubmissions: { status: string | null }[] = []
  try {
    allSubmissions = await prisma.submission.findMany({
      select: {
        status: true
      }
    })
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
            <div className="text-2xl font-bold text-primary">{statusCounts.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Under Review</div>
            <div className="text-2xl font-bold text-secondary dark:text-secondary-foreground">{statusCounts.under_review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Revision Required</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {statusCounts.revision_required}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Accepted</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statusCounts.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Rejected</div>
            <div className="text-2xl font-bold text-destructive">{statusCounts.rejected}</div>
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
