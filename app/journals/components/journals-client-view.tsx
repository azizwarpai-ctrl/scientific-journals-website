"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, SlidersHorizontal } from "lucide-react"
import { JournalCard } from "@/src/features/journals/components/journal-card"
import { GSAPWrapper } from "@/components/gsap-wrapper"

interface Journal {
  id: string
  ojs_id?: string | null
  title: string
  description?: string | null
  issn?: string | null
  field?: string | null
  publisher?: string | null
  coverImage: string | null
}

interface JournalsClientViewProps {
  journals: Journal[]
}

export function JournalsClientView({ journals }: JournalsClientViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedField, setSelectedField] = useState("all")
  const [sortBy, setSortBy] = useState("title")

  const filteredJournals = useMemo(() => {
    return journals
      .filter((journal) => {
        const query = searchQuery.toLowerCase().trim()

        const matchesSearch =
          journal.title.toLowerCase().includes(query) ||
          (journal.issn?.toLowerCase().includes(query) ?? false) ||
          (journal.field?.toLowerCase().includes(query) ?? false) ||
          (journal.publisher?.toLowerCase().includes(query) ?? false)

        const matchesField = selectedField === "all" || journal.field === selectedField
        return matchesSearch && matchesField
      })
      .sort((a, b) => {
        if (sortBy === "id") {
          const numA = Number(a.id)
          const numB = Number(b.id)
          if (isFinite(numA) && isFinite(numB)) return numB - numA
          return b.id.localeCompare(a.id)
        }
        return a.title.localeCompare(b.title)
      })
  }, [searchQuery, selectedField, sortBy, journals])

  const fields = ["all", ...Array.from(new Set(journals.map((j) => j.field).filter(Boolean))) as string[]]

  return (
    <>
      <GSAPWrapper animation="fadeIn">
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Browse Journals</h1>
              <p className="text-lg text-muted-foreground">
                Explore our collection of {journals.length} peer-reviewed scientific journals
              </p>
            </div>
          </div>
        </section>
      </GSAPWrapper>

      <GSAPWrapper animation="slideUp" delay={0.1}>
        <section className="sticky top-16 z-20 border-b bg-background/80 backdrop-blur-md py-6 shadow-sm">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by title, field, ISSN, or publisher..."
                    className="pl-9 bg-background/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger className="w-44 bg-background/50">
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
                  <SelectTrigger className="w-44 bg-background/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="id">ID (Newest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>
      </GSAPWrapper>

      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6 text-sm text-muted-foreground">
            Showing {filteredJournals.length} journal{filteredJournals.length !== 1 ? "s" : ""}
          </div>

          <GSAPWrapper animation="slideUp" staggerChildren={0.05} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJournals.map((journal) => (
              <JournalCard
                key={journal.id}
                id={journal.id}
                ojsId={journal.ojs_id}
                title={journal.title}
                description={journal.description}
                issn={journal.issn}
                field={journal.field}
                publisher={journal.publisher}
                coverImage={journal.coverImage}
              />
            ))}
          </GSAPWrapper>

          {filteredJournals.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No journals found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
