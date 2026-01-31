"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, SlidersHorizontal, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { journalsAPI } from "@/lib/php-api-client"

export default function JournalsPage() {
  const [journals, setJournals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedField, setSelectedField] = useState("all")
  const [sortBy, setSortBy] = useState("title")

  useEffect(() => {
    async function fetchJournals() {
      try {
        const response = await journalsAPI.list(1, 100)
        const data = response.data
        const list = data?.data ?? data ?? []
        setJournals(Array.isArray(list) ? list : [])
      } catch (err: any) {
        setError(err.message || "Failed to load journals")
      } finally {
        setLoading(false)
      }
    }
    fetchJournals()
  }, [])

  const filteredJournals = useMemo(() => {
    return journals
      .filter((journal) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) {
          const matchesField = selectedField === "all" || journal.field === selectedField
          return matchesField
        }
        const issn = journal.issn ? String(journal.issn) : ""
        const matchesSearch =
          (journal.title || "").toLowerCase().includes(query) ||
          issn.toLowerCase().includes(query) ||
          (journal.field || "").toLowerCase().includes(query) ||
          (journal.publisher || "").toLowerCase().includes(query)
        const matchesField = selectedField === "all" || journal.field === selectedField
        return matchesSearch && matchesField
      })
      .sort((a, b) => {
        if (sortBy === "year") {
          const yearA = a.created_at ? new Date(a.created_at).getFullYear() : 0
          const yearB = b.created_at ? new Date(b.created_at).getFullYear() : 0
          return yearB - yearA
        }
        return (a.title || "").localeCompare(b.title || "")
      })
  }, [journals, searchQuery, selectedField, sortBy])

  const fields = ["all", ...Array.from(new Set(journals.map((j) => j.field).filter(Boolean)))]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Browse Journals</h1>
              <p className="text-lg text-muted-foreground">
                Explore our collection of {loading ? "..." : journals.length} peer-reviewed scientific journals
              </p>
            </div>
          </div>
        </section>

        <section className="border-b bg-background py-6">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by title, field, ISSN, or publisher..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger className="w-[180px]">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fields</SelectItem>
                    {fields.slice(1).map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="year">Year (Newest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Journals Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="mb-6 text-sm text-muted-foreground">
              Showing {filteredJournals.length} journal{filteredJournals.length !== 1 ? "s" : ""}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredJournals.map((journal) => {
                  const issnDisplay = journal.issn
                    ? (String(journal.issn).startsWith("ISSN") ? journal.issn : `ISSN ${journal.issn}`)
                    : ""
                  const yearDisplay = journal.created_at
                    ? new Date(journal.created_at).getFullYear()
                    : ""
                  return (
                    <Card key={journal.id} className="group overflow-hidden transition-all hover:shadow-xl">
                      <div className="relative h-80 w-full overflow-hidden">
                        <img
                          src={journal.cover_image_url || "/images/logodigitopub.png"}
                          alt={journal.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="mb-3">
                            <span className="inline-block rounded-full bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                              {journal.field || "Journal"}
                            </span>
                          </div>
                          <h3 className="mb-2 text-lg font-bold text-white text-balance leading-tight">{journal.title}</h3>
                          <p className="text-sm text-white/80">{issnDisplay}</p>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                          <span>{journal.publisher || "DigitoPub"}</span>
                          {yearDisplay && <span>Est. {yearDisplay}</span>}
                        </div>
                        <Button size="sm" className="w-full" asChild>
                          <Link href={`/journals/detail?id=${journal.id}`}>View Journal</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {!loading && filteredJournals.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">
                  {error ? "Unable to load journals." : "No journals found matching your criteria."}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
