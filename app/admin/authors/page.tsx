import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { AuthorsTable, type AuthorRow } from "./authors-table"
import { isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { getOjsAuthorSummary } from "@/src/features/ojs/server/ojs-stats-service"
import { OjsStatusBanner } from "@/src/features/reviews/components/ojs-status-banner"

export default async function AuthorsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Authors are canonical in OJS — read them live (distinct by email, scoped
  // to the journals DigitoPub surfaces). Degrade to an explicit banner rather
  // than an empty table when OJS is unset/unreachable.
  const ojsConfigured = isOjsConfigured()
  let rows: AuthorRow[] = []
  let ojsError = false

  if (ojsConfigured) {
    try {
      const authors = await getOjsAuthorSummary()
      rows = authors.map((a) => ({
        name: a.name,
        email: a.email,
        submissions: a.submissions,
        latestSubmission: a.latestSubmission ?? "",
      }))
    } catch (e) {
      console.error("[authors] OJS author summary failed:", e instanceof Error ? e.message : e)
      ojsError = true
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Author Management</h1>
        <p className="text-muted-foreground mt-1">View and manage authors who have published to the platform</p>
      </div>

      {!ojsConfigured ? (
        <OjsStatusBanner state="unconfigured" />
      ) : ojsError ? (
        <OjsStatusBanner state="unavailable" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Authors ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuthorsTable rows={rows} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
