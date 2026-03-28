"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { Search, BookOpen, Zap, HelpCircle, ArrowRight, SearchX } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearch } from "@/src/features/search"
import type { SearchResult } from "@/src/features/search"
import { highlightText } from "@/src/lib/highlight-text"

const TYPE_ICONS: Record<string, React.ElementType> = {
  journal: BookOpen,
  solution: Zap,
  faq: HelpCircle,
}

const TYPE_LABELS: Record<string, string> = {
  journal: "Journal",
  solution: "Solution",
  faq: "FAQ",
}

const TYPE_COLORS: Record<string, string> = {
  journal: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  solution: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  faq: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""
  const [localQuery, setLocalQuery] = useState(initialQuery)

  const { data, isLoading, error } = useSearch(initialQuery)
  const results = data?.data?.results || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (localQuery.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(localQuery.trim())}`)
    }
  }

  // Group results by type
  const grouped = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Search Header */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Search Results</h1>
                <form onSubmit={handleSubmit} className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search-page-input"
                    type="search"
                    placeholder="Search journals, solutions, and FAQs..."
                    className="h-12 pl-12 pr-24 text-base rounded-full border-2 focus-visible:ring-2"
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  >
                    Search
                  </Button>
                </form>
                {initialQuery && !isLoading && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{initialQuery}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Results */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl">
              {!initialQuery ? (
                <div className="text-center py-16">
                  <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                  <h2 className="text-xl font-semibold mb-2">Start Searching</h2>
                  <p className="text-muted-foreground">
                    Enter a search term to find journals, solutions, and frequently asked questions.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="border-border/50">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-lg bg-destructive/10 p-6 text-center text-destructive">
                  <p className="font-medium">Search failed. Please try again.</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-16">
                  <SearchX className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                  <h2 className="text-xl font-semibold mb-2">No Results Found</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We couldn&apos;t find anything matching &ldquo;{initialQuery}&rdquo;. Try different keywords or browse our pages.
                  </p>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button variant="outline" asChild>
                      <Link href="/journals">Browse Journals</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/help">Visit Help Center</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(grouped).map(([type, items]) => (
                    <GSAPWrapper key={type} animation="slideUp" delay={0.1}>
                      <div>
                        <div className="mb-4 flex items-center gap-2">
                          {(() => {
                            const Icon = TYPE_ICONS[type] || BookOpen
                            return <Icon className="h-5 w-5 text-primary" />
                          })()}
                          <h2 className="text-lg font-bold capitalize">{TYPE_LABELS[type] || type}s</h2>
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {items.length}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {items.map((result) => {
                            const Icon = TYPE_ICONS[result.type] || BookOpen
                            const colorClass = TYPE_COLORS[result.type] || TYPE_COLORS.journal
                            return (
                              <Link key={`${result.type}-${result.id}`} href={result.url}>
                                <Card className="group cursor-pointer border-border/50 transition-all hover:shadow-md hover:-translate-y-0.5">
                                  <CardContent className="pt-5 pb-5">
                                    <div className="flex items-start gap-4">
                                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                                          {highlightText(result.title, initialQuery)}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                          {highlightText(result.description, initialQuery)}
                                        </p>
                                        {result.field && (
                                          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                            {result.field}
                                          </span>
                                        )}
                                      </div>
                                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    </GSAPWrapper>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
