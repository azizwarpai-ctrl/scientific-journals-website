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
import { AnimatedCounter } from "@/components/animated-counter"
import { useGetJournals } from "@/src/features/journals"
import type { Journal } from "@/src/features/journals"
import { useGetPlatformStatistics } from "@/src/features/statistics/api/use-get-statistics"
import { HomeStatsSkeleton } from "@/components/skeletons/home-stats-skeleton"
import { JournalCardSkeleton } from "@/components/skeletons/journal-card-skeleton"

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

  const statConfigs = [
    { label: "Active Journals", value: stats?.totalJournals, color: "text-blue-500 dark:text-blue-400" },
    { label: "Published Articles", value: stats?.totalArticles, color: "text-sky-500 dark:text-sky-400" },
    { label: "Researchers", value: stats?.totalUsers, color: "text-indigo-500 dark:text-indigo-400" },
    { label: "Countries (Estimated)", value: stats?.countriesCount, color: "text-cyan-500 dark:text-cyan-400" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 overflow-x-hidden relative">
        {/* Layer 1: Global hero background (scrolls away) */}
        <div className="absolute top-0 left-0 w-full h-[100vh] bg-slate-950 z-[0]" />

        {/* Layer 2: Fixed 3D Scene (permanently visible) */}
        <div
          className="fixed bottom-0 right-0 z-[1] h-screen w-full md:w-[70%] pointer-events-none origin-center"
          aria-hidden="true"
        >
          <SplineScene />
        </div>

        {/* Layer 3: Hero Content */}
        <GSAPWrapper animation="fadeIn" className="relative z-[2]">
          {/* `dark` class isolates this section into forced dark mode */}
          <div className="dark">
            <section className="relative flex min-h-[90vh] items-center py-20 md:py-32">
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

        {/* Layer 4: Content Sections with High-Contrast Glass Backdrop */}
        <div className="relative z-[3] bg-background/90 backdrop-blur-md border-t border-border/50 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.1)]">
        
        {/* Stats Section */}
        <GSAPWrapper animation="slideUp" delay={0.2}>
          <section className="border-y border-border/50 py-12">
            <div className="container mx-auto px-4 md:px-6">
              {isLoadingStats ? (
                <HomeStatsSkeleton />
              ) : isErrorStats ? (
                <div className="text-center py-4 text-destructive font-medium">
                  Failed to load statistics. Please try again later.
                </div>
              ) : (
                <div className="grid gap-8 md:grid-cols-4">
                  {statConfigs.map((item) => (
                    <div key={item.label} className="text-center">
                      <div className={`mb-2 ${item.color}`}>
                        <AnimatedCounter end={item.value ?? 0} suffix="+" duration={2500} />
                      </div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </GSAPWrapper>

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
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="min-w-[260px] max-w-[280px] shrink-0 snap-start">
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
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory scroll-smooth"
                  >
                    {journals.slice(0, 10).map((journal: Journal, idx: number) => {
                      const slug = String([journal.ojs_path, journal.ojs_id, journal.id].find(s => s && String(s).trim()) || journal.id)
                      return (
                        <GSAPWrapper key={journal.id} animation="slideUp" delay={0.4 + idx * 0.05} className="min-w-[260px] max-w-[280px] shrink-0 snap-start">
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
        <GSAPWrapper animation="scale" delay={0.5}>
          <section className="py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-secondary p-8 text-center text-primary-foreground md:p-12">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Publish?</h2>
                <p className="mb-8 text-lg opacity-90 leading-relaxed">Join our growing community of researchers sharing their work with the global scientific community.</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent hover:bg-primary-foreground/10" asChild>
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>
        </div>
      </main>

      <Footer />
    </div>
  )
}
