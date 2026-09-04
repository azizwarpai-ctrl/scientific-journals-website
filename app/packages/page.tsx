import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PackagesPageClient } from "@/src/features/billing/components/packages-page-client"

export default function PackagesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <PackagesPageClient />
      </main>

      <Footer />
    </div>
  )
}
