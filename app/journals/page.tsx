import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { prisma } from "@/lib/db/config"
import { JournalsClientView } from "./components/journals-client-view"

export default async function JournalsPage() {
  let journals = []
  let error: Error | null = null

  try {
    const result = await Promise.race([
      prisma.journal.findMany({
        where: { status: "active" },
        select: {
          id: true,
          title: true,
          issn: true,
          field: true,
          publisher: true,
          cover_image_url: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 5000)
      ),
    ])

    journals = (result as any[]).map((j) => ({
      id: j.id.toString(),
      title: j.title,
      issn: j.issn || "N/A",
      field: j.field,
      publisher: j.publisher || "Unknown",
      coverImage: j.cover_image_url || "/images/logodigitopub.png",
    }))
  } catch (e) {
    // Gracefully handle connection errors during SSG
    console.error("Error fetching journals:", e)
    // Return empty array to avoid build failure
    journals = []
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {error ? (
          <section className="py-12">
            <div className="container mx-auto px-4 md:px-6">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-600 dark:text-red-400">Error loading journals: {error.message}</p>
              </div>
            </div>
          </section>
        ) : (
          <JournalsClientView journals={journals} />
        )}
      </main>
      <Footer />
    </div>
  )
}
