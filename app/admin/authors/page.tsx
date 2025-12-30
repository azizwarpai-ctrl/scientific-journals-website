import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, FileText } from "lucide-react"

import { mockSubmissions } from "@/lib/mock-data"

export default async function AuthorsPage() {
  // Mock authentication check
  const user = { id: "mock-admin" }

  if (!user) {
    redirect("/admin/login")
  }

  // Fetch unique authors from mock submissions
  const submissions = [...mockSubmissions].sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime())

  // Group by email to get unique authors
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Author Management</h1>
        <p className="text-muted-foreground mt-1">View and manage authors who have submitted to the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Authors ({authors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {authors.length > 0 ? (
            <div className="space-y-4">
              {authors.map((author) => (
                <div
                  key={author.email}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{author.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {author.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {author.submissions} submission{author.submissions !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Joined: {new Date(author.firstSubmission).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No authors yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Authors will appear here after submitting manuscripts
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
