"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"
import { journalsAPI } from "@/lib/php-api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Eye, BookOpen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function JournalsPage() {
  const { data: session, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  const [journals, setJournals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/admin/login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    async function fetchJournals() {
      if (!session) return
      try {
        const response = await journalsAPI.list(1, 100)
        setJournals(response.data || [])
      } catch (err: any) {
        setError(err.message || "Failed to load journals")
      } finally {
        setLoading(false)
      }
    }
    fetchJournals()
  }, [session])

  if (authLoading || (loading && session)) {
    return <div className="p-8">Loading journals...</div>
  }

  if (!session) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Journal Management</h1>
          <p className="text-muted-foreground mt-1">Manage all scientific journals in the system</p>
        </div>
        <Button asChild>
          <Link href="/admin/journals/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Journal
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error loading journals: {error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {journals.map((journal) => (
          <Card key={journal.id} className="overflow-hidden">
            <CardHeader className="p-0">
              {journal.cover_image_url ? (
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  <Image
                    src={journal.cover_image_url}
                    alt={journal.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center bg-muted">
                  <span className="text-4xl font-bold text-muted-foreground">{journal.abbreviation || "N/A"}</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div>
                  <CardTitle className="text-lg line-clamp-2">{journal.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{journal.field}</p>
                </div>

                <div className="space-y-1 text-sm">
                  {journal.issn && (
                    <p>
                      <span className="font-medium">ISSN:</span> {journal.issn}
                    </p>
                  )}
                  {journal.publisher && (
                    <p className="text-muted-foreground line-clamp-1">Publisher: {journal.publisher}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${journal.status === "active"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
                      }`}
                  >
                    {journal.status || "active"}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/admin/journals/${journal.id}`}>
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/admin/journals/${journal.id}/edit`}>
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && journals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No journals found</p>
            <p className="text-sm text-muted-foreground mt-1">Get started by adding your first journal</p>
            <Button asChild className="mt-4">
              <Link href="/admin/journals/new">
                <Plus className="mr-2 h-4 w-4" />
                Add New Journal
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
