"use client"

import { useRef } from "react"
import { SplineScene } from "@/components/spline-scene"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { BookOpen, Zap, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { JournalCard } from "@/src/features/journals/components/journal-card"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { PlatformStats } from "@/components/platform-stats"
import { useGetJournals } from "@/src/features/journals"
import type { Journal } from "@/src/features/journals"
import { useGetPlatformStatistics } from "@/src/features/statistics/api/use-get-statistics"
import { JournalCardSkeleton } from "@/components/skeletons/journal-card-skeleton"
import { CtaSection } from "@/components/cta-section"

export default function HomePage() {
  const { data: journals = [], isLoading: isLoadingOjs, isError: isErrorOjs } = useGetJournals()
  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useGetPlatformStatistics()

  /* ── Horizontal scroll controls ───────────────────────────── */
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: "left" | "right") => {
    if (!scrollRef.current) return
    const amount = 300
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }



  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 overflow-x-hidden relative">
        {/* Hero Section — contains both the 3D globe and hero content */}
        <GSAPWrapper animation="fadeIn" className="relative z-[2]">
          {/* `dark` class isolates this section into forced dark mode */}
          <div className="dark">
            {/* STACKING ISOLATION: 'isolate' and fixed height ('h-[90vh]') prevent GPU layer (WebGL) from leaking out of this section */}
            <section className="relative flex h-[90vh] items-center py-20 md:py-32 overflow-hidden bg-slate-950 isolate">
              {/* 3D Globe — absolute within the hero, clipped by overflow-hidden */}
              {/* GPU PAINT CONTAINMENT: 'contain: paint' enforces strict bounds on the WebGL canvas to prevent compositing bleed-through */}
              <div
                className="absolute bottom-0 right-0 z-[1] h-full w-full md:w-[70%] pointer-events-none origin-center"
                style={{ contain: 'paint' }}
                aria-hidden="true"
              >
                <SplineScene />
              </div>

              <div className="container relative z-10 mx-auto px-4 md:px-6 pointer-events-none">
                <div className="mx-auto max-w-3xl text-center pointer-events-auto">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-sky-300 backdrop-blur-md">
                    <Zap className="h-4 w-4 text-sky-400" />
                    Scientific Excellence
                  </div>
                  <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white md:text-7xl drop-shadow-2xl">
                    Modern Platform for <br className="hidden md:block" />
                    <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Scientific Publishing</span>
                  </h1>
                  <p className="mb-8 text-xl leading-relaxed text-slate-300 text-pretty drop-shadow-md">
                    Comprehensive solutions for digital journals, submission management, and global scientific distribution.
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Button size="lg" className="rounded-full px-8 shadow-lg shadow-sky-500/20" asChild>
                      <Link href="/journals">
                        <BookOpen className="mr-2 h-5 w-5" />
                        Explore Journals
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full border-white/20 bg-transparent px-8 text-white backdrop-blur-md hover:bg-white/10" asChild>
                      <Link href="/about">Learn More</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </GSAPWrapper>

        {/* Layer 4: Content Sections */}
        {/* CRITICAL: Opaque background ('bg-background') is required. Adding opacity (e.g. /90) or 'backdrop-blur' here will cause the 3D globe layer beneath to ghost/bleed through during scroll. */}
        <div className="relative z-[3] bg-background border-t border-border/50 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.1)]">
        
        {/* Stats Section */}
        <PlatformStats 
          stats={stats} 
          isLoading={isLoadingStats} 
          isError={isErrorStats} 
          variant="home" 
        />

        {/* Featured Journals */}
        <GSAPWrapper animation="fadeIn" delay={0.3}>
          <section className="py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 flex items-center justify-between">
                <div>
                  <h2 className="mb-2 text-3xl font-bold md:text-4xl">Featured Journals</h2>
                  <p className="text-muted-foreground">Recently added and high-impact journals</p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/journals">View All</Link>
                </Button>
              </div>

              {isLoadingOjs ? (
                <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="min-w-[200px] max-w-[220px] sm:min-w-[260px] sm:max-w-[280px] shrink-0 snap-start">
                      <JournalCardSkeleton />
                    </div>
                  ))}
                </div>
              ) : isErrorOjs ? (
                <div className="text-center py-12 text-destructive">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">Connection Error</p>
                  <p className="mt-1 text-sm">Could not fetch journals from the synchronized internal database.</p>
                </div>
              ) : journals && journals.length > 0 ? (
                <div className="relative group/carousel">
                  {/* Left scroll button */}
                  <button
                    onClick={() => scrollBy("left")}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-background/90 dark:bg-zinc-800/90 border border-border shadow-lg backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-background dark:hover:bg-zinc-700"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  {/* Horizontal scroll container */}
                  <div
                    ref={scrollRef}
                    className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth"
                  >
                    {journals.slice(0, 10).map((journal: Journal, idx: number) => {
                      const slug = String([journal.ojs_path, journal.ojs_id, journal.id].find(s => s && String(s).trim()) || journal.id)
                      return (
                        <GSAPWrapper key={journal.id} animation="slideUp" delay={0.4 + idx * 0.05} className="min-w-[200px] max-w-[220px] sm:min-w-[260px] sm:max-w-[280px] shrink-0 snap-start">
                          <JournalCard
                            title={journal.title}
                            coverImage={journal.cover_image_url}
                            slug={slug}
                          />
                        </GSAPWrapper>
                      )
                    })}
                  </div>

                  {/* Right scroll button */}
                  <button
                    onClick={() => scrollBy("right")}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-background/90 dark:bg-zinc-800/90 border border-border shadow-lg backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 hover:bg-background dark:hover:bg-zinc-700"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">No journals available yet</p>
                  <p className="mt-1 text-sm">Journals will appear here once the OJS database is connected.</p>
                </div>
              )}
            </div>
          </section>
        </GSAPWrapper>

        {/* CTA Section */}
        <CtaSection />
        </div>
      </main>

      <Footer />
    </div>
  )
}
