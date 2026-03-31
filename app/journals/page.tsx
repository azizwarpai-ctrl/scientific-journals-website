"use client"

import { JournalListSkeleton } from "@/components/skeletons/journal-skeleton"
import { JournalError } from "@/components/errors/error-states"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { JournalsClientView } from "./components/journals-client-view"
import { useGetJournals } from "@/src/features/journals"
import type { Journal } from "@/src/features/journals"

export default function JournalsPage() {
  const { data: journals = [], isLoading, error } = useGetJournals();



  // Format the journals for the client view
  const formattedJournals = journals.map((j: Journal) => ({
    id: j.id,
    ojs_id: j.ojs_id,
    ojs_path: j.ojs_path,
    title: j.title || "Currently unavailable",
    coverImage: j.cover_image_url || "/images/logodigitopub.png",
    description: j.description || null,
    issn: j.issn || j.e_issn || null,
    publisher: j.publisher || null,
    field: j.field || null,
  }))



  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {error ? (
          <JournalError 
            message={error.message} 
          />
        ) : isLoading ? (
          <div className="container mx-auto px-4 py-12">
            <div className="mb-12 text-center space-y-4">
              <div className="h-10 bg-muted rounded w-1/3 mx-auto animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 mx-auto animate-pulse" />
            </div>
            <JournalListSkeleton />
          </div>
        ) : (
          <JournalsClientView journals={formattedJournals} />
        )}
      </main>
      <Footer />
    </div>
  )
}
