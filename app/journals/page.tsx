"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { JournalsClientView } from "./components/journals-client-view"
import { useGetJournals } from "@/src/features/journals"
import { Loader2 } from "lucide-react"

export default function JournalsPage() {
  const { data: journals = [], isLoading, error } = useGetJournals()

  // Format the journals for the client view
  const formattedJournals = journals.map((j) => ({
    id: j.id,
    title: j.title,
    issn: j.issn || "N/A",
    field: j.field,
    publisher: j.publisher || "Unknown",
    coverImage: j.cover_image_url || "/images/logodigitopub.png",
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {error ? (
          <section className="py-12">
            <div className="container mx-auto px-4 md:px-6">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error loading journals: {error.message}
                </p>
              </div>
            </div>
          </section>
        ) : isLoading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <JournalsClientView journals={formattedJournals} />
        )}
      </main>
      <Footer />
    </div>
  )
}
