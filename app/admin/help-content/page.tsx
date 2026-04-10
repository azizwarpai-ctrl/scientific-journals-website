import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { DeleteHelpArticleButton } from "./delete-button"
import { HelpConfigForm } from "./config-form"
import { defaultHelpContent, type HelpContent } from "@/src/features/help/schemas/help-schema"

export default async function HelpContentPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  let articles: any[] = []
  let helpConfig: HelpContent = defaultHelpContent
  try {
    articles = await prisma.helpArticle.findMany({
      orderBy: [{ display_order: "asc" }, { created_at: "desc" }],
    })
    const setting = await prisma.systemSetting.findUnique({
      where: { setting_key: "help_page_content" }
    })
    if (setting) {
      helpConfig = setting.setting_value as unknown as HelpContent
    }
  } catch (error) {
    console.error("Error fetching admin help data:", error)
  }

  const publishedCount = articles?.filter((a) => a.is_published).length || 0
  const draftCount = articles?.filter((a) => !a.is_published).length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Content</h1>
          <p className="text-muted-foreground">Manage help articles displayed on the public Help page</p>
        </div>
        <Button asChild>
          <Link href="/admin/help-content/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Article
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{articles?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <BookOpen className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Article List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Help Articles</CardTitle>
              <CardDescription>Browse and manage help articles for the public Help page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({articles?.length || 0})</TabsTrigger>
              <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
              <TabsTrigger value="draft">Drafts ({draftCount})</TabsTrigger>
              <TabsTrigger value="config">Page Config</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {articles && articles.length > 0 ? (
                articles.map((article) => (
                  <div key={String(article.id)} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{article.title}</p>
                        <Badge variant={article.is_published ? "default" : "secondary"}>
                          {article.is_published ? "Published" : "Draft"}
                        </Badge>
                        {article.category && (
                          <Badge variant="outline">{article.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Order: {article.display_order}</span>
                        <span>Created: {new Date(article.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/help-content/${article.id}`}>Edit</Link>
                      </Button>
                      <DeleteHelpArticleButton id={String(article.id)} title={article.title} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No help articles found</div>
              )}
            </TabsContent>

            <TabsContent value="published">
              {articles?.filter((a) => a.is_published).length > 0 ? (
                articles
                  .filter((a) => a.is_published)
                  .map((article) => (
                    <div key={String(article.id)} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{article.title}</p>
                          {article.category && (
                            <Badge variant="outline">{article.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/help-content/${article.id}`}>Edit</Link>
                        </Button>
                        <DeleteHelpArticleButton id={String(article.id)} title={article.title} />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No published help articles</div>
              )}
            </TabsContent>

            <TabsContent value="draft">
              {articles?.filter((a) => !a.is_published).length > 0 ? (
                articles
                  .filter((a) => !a.is_published)
                  .map((article) => (
                    <div key={String(article.id)} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{article.title}</p>
                          <Badge variant="secondary">Draft</Badge>
                          {article.category && (
                            <Badge variant="outline">{article.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{article.content}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/help-content/${article.id}`}>Edit</Link>
                        </Button>
                        <DeleteHelpArticleButton id={String(article.id)} title={article.title} />
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-muted-foreground">No draft help articles</div>
              )}
            </TabsContent>
            <TabsContent value="config">
              <HelpConfigForm initialData={helpConfig} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
