import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { OffersGrid } from "@/src/features/offers/components/offers-grid"
import { ShieldCheck, Zap, BookCheck, HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Packages & Pricing | DigitoPub Scientific Publishing",
  description:
    "Explore transparent, flexible publication packages and editorial management plans designed for authors, researchers, and academic journals.",
  openGraph: {
    title: "Packages & Pricing | DigitoPub",
    description: "Explore transparent, flexible publication packages and editorial management plans.",
  },
}

export default function PackagesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-indigo-500/20">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-20 border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-background to-background dark:from-indigo-950/20 dark:via-background dark:to-background pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 blur-3xl pointer-events-none" />

          <div className="container relative mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-6">
              <Zap className="w-3.5 h-3.5" />
              Transparent & Scalable Plans
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Publishing Packages Designed for{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-400 dark:via-purple-400 dark:to-blue-400">
                Scholarly Impact
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Transparent, flexible tiers tailored for individual researchers, collaborative author teams, and university journal editors.
            </p>
          </div>
        </section>

        {/* Offers Grid Section */}
        <section className="py-16 md:py-24 container mx-auto px-4">
          <OffersGrid />
        </section>

        {/* Feature Highlights / Trust Pillars */}
        <section className="py-16 bg-muted/30 border-y border-border/60">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Every Package Includes Enterprise Scholarly Standards
              </h2>
              <p className="text-muted-foreground mt-2 text-sm md:text-base">
                No compromises on academic rigor, indexing compliance, or publication speed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">Rigorous Peer Review</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Blind peer review overseen by verified academic editors and field-specific referees.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                  <BookCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">Permanent DOI & Archiving</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Instant Crossref DOI registration, CLOCKSS archival preservation, and open metadata.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border/60 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">Rapid Production</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automated galley generation (PDF & HTML), citation tracking, and ORCID sync.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Institutional Tier Banner */}
        <section className="py-20 container mx-auto px-4 text-center max-w-4xl">
          <div className="rounded-3xl p-8 md:p-12 border border-border bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Need a Custom Journal or Institutional Agreement?
            </h2>
            <p className="mt-3 text-muted-foreground text-base max-w-xl mx-auto">
              We provide tailored solutions for university departments, library consortiums, and society publications requiring dedicated OJS hosting and bulk APC processing.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                <Link href="/contact">Contact Our Editorial Team</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/solutions">Explore Solutions</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
