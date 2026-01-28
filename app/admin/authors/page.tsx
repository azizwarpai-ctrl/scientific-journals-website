"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, FileText } from "lucide-react"

export default function AuthorsPage() {
  const { data: user, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  // Placeholder for authors data until API endpoint exists
  const [authors, setAuthors] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login")
    }
  }, [user, authLoading, router])

  if (authLoading || (!user)) {
    return <div className="p-8">Loading...</div>
  }

  // NOTE: This feature requires a backend endpoint for author stats which is planned.
  // Currently showing empty state to pass build.

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
              <p className="text-lg font-medium">No authors found</p>
              <p className="text-sm text-muted-foreground mt-1">
                (Author stats API integration pending)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
