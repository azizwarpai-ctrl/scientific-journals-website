import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function SubmitManagerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl text-balance">Submit Manager</h1>
              <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                Coming soon - Advanced manuscript submission and management platform
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
