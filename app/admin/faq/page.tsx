"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/client/hooks/useAuth"
import { faqAPI } from "@/lib/php-api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle, Plus } from "lucide-react"
import Link from "next/link"

export default function FAQPage() {
  const { data: session, isLoading: authLoading } = useCurrentUser()
  const router = useRouter()
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/admin/login")
    }
  }, [session, authLoading, router])

  useEffect(() => {
    async function fetchFAQs() {
      if (!session) return
      try {
        // Fetch all (published=false means fetch all including drafts if API supports it, 
        // passing correct arg based on php-api-client implementation)
        const response = await faqAPI.list(false)
        setFaqs(response.data || [])
      } catch (error) {
        console.error("Error fetching FAQs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchFAQs()
  }, [session])

  if (authLoading || (loading && session)) {
    return <div className="p-8">Loading FAQs...</div>
  }

  if (!session) return null

  const publishedCount = faqs.filter((f) => f.is_published).length
  const draftCount = faqs.filter((f) => !f.is_published).length

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faqs.length}</div>
          </CardContent>
        </Card>
        {/* ... stats cards ... */}
      </div>

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
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {faqs.map((faq) => (
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
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/faq/${faq.id}`}>Edit</Link>
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
