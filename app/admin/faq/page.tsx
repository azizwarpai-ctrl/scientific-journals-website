import { getSession } from "@/lib/db/auth"
import { query } from "@/lib/db/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle, Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function FAQPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Fetch FAQ/Solutions
  let faqs: any[] = []
  try {
    const result = await query(
      `SELECT * FROM faq_solutions ORDER BY created_at DESC`
    )
    faqs = result.rows
  } catch (error) {
    console.error("Error fetching FAQs:", error)
  }

  const publishedCount = faqs?.filter((f) => f.is_published).length || 0
  const draftCount = faqs?.filter((f) => !f.is_published).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQ & Solutions</h1>
          <p className="text-muted-foreground">Manage frequently asked questions and help articles</p>
        </div>
        <Button asChild>
          <Link href="/admin/faq/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New FAQ
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faqs?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <HelpCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <HelpCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All FAQ Articles</CardTitle>
              <CardDescription>Browse and manage help articles and FAQs</CardDescription>
            </div>
            <Input className="w-64" placeholder="Search FAQ..." />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({faqs?.length || 0})</TabsTrigger>
              <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
              <TabsTrigger value="draft">Drafts ({draftCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {faqs && faqs.length > 0 ? (
                faqs.map((faq) => (
                  <div key={faq.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{faq.question}</p>
                        <Badge variant={faq.is_published ? "default" : "secondary"}>
                          {faq.is_published ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline">{faq.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Views: {faq.view_count || 0}</span>
                        <span>Helpful: {faq.helpful_count || 0}</span>
                        <span>Created: {new Date(faq.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/faq/${faq.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No FAQ articles found</div>
              )}
            </TabsContent>

            <TabsContent value="published">
              {faqs?.filter((f) => f.is_published).length > 0 ? (
                faqs
                  .filter((f) => f.is_published)
                  .map((faq) => (
                    <div key={faq.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{faq.question}</p>
                          <Badge variant="outline">{faq.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/faq/${faq.id}`}>Edit</Link>
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No published FAQ articles</div>
              )}
            </TabsContent>

            <TabsContent value="draft">
              {faqs?.filter((f) => !f.is_published).length > 0 ? (
                faqs
                  .filter((f) => !f.is_published)
                  .map((faq) => (
                    <div key={faq.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{faq.question}</p>
                          <Badge variant="secondary">Draft</Badge>
                          <Badge variant="outline">{faq.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{faq.answer}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/faq/${faq.id}`}>Edit</Link>
                      </Button>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No draft FAQ articles</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
