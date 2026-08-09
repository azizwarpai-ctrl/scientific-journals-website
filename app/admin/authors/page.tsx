import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { AuthorsTable, type AuthorRow } from "./authors-table"

export default async function AuthorsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Fetch unique authors from submissions
  let submissions: any[] = []
  let error: Error | null = null
  try {
    submissions = await prisma.submission.findMany({
      select: {
        author_name: true,
        author_email: true,
        submission_date: true
      },
      orderBy: { submission_date: "desc" }
    })
  } catch (e) {
    console.error("Error fetching submissions:", e)
    error = e as Error
  }

  // Group by email to get unique authors (submissions are ordered newest-first,
  // so the first occurrence carries each author's latest submission date)
  const authorsMap = new Map()
  if (submissions) {
    for (const submission of submissions) {
      if (!authorsMap.has(submission.author_email)) {
        authorsMap.set(submission.author_email, {
          name: submission.author_name,
          email: submission.author_email,
          submissions: 1,
          firstSubmission: submission.submission_date,
        })
      } else {
        const author = authorsMap.get(submission.author_email)
        author.submissions += 1
      }
    }
  }

  const authors = Array.from(authorsMap.values()).sort(
    (a, b) => new Date(b.firstSubmission).getTime() - new Date(a.firstSubmission).getTime(),
  )

  const rows: AuthorRow[] = authors.map((author) => ({
    name: author.name,
    email: author.email,
    submissions: author.submissions,
    latestSubmission: new Date(author.firstSubmission).toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Author Management</h1>
        <p className="text-muted-foreground mt-1">View and manage authors who have submitted to the platform</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">Error loading authors: {error.message}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Authors ({authors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AuthorsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  )
}
