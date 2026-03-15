"use client"

import { SplineScene } from "@/components/spline-scene"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { BookOpen, Zap } from "lucide-react"
import Link from "next/link"
import { JournalCard } from "@/src/features/journals/components/journal-card"
import { motion, useScroll, useTransform } from "framer-motion"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { AnimatedCounter } from "@/components/animated-counter"
import { useGetJournals } from "@/src/features/journals"
import type { Journal } from "@/src/features/journals"
import { useGetMetrics } from "@/src/features/metrics"
import { HomeStatsSkeleton } from "@/components/skeletons/home-stats-skeleton"
import { JournalCardSkeleton } from "@/components/skeletons/journal-card-skeleton"

export default function HomePage() {
  const { data: journals = [], isLoading: isLoadingOjs, isError: isErrorOjs } = useGetJournals()
  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useGetMetrics()

  // Scroll animations for the 3D Spline model
  const { scrollY } = useScroll()
  // Pin the model via parallax (y closely follows scrollY), so it smoothly reaches the Journals section
  const splineY = useTransform(scrollY, [0, 1000], [0, 700])
  const splineX = useTransform(scrollY, [0, 1000], [0, 150]) // Scrolls slightly to the right
  const splineScale = useTransform(scrollY, [0, 1000], [1, 1.3]) // Smoother, lower-angle zoom

  const statConfigs = [
    { label: "Active Journals", value: stats?.activeJournals, color: "text-blue-500 dark:text-blue-400" },
    { label: "Published Articles", value: stats?.publishedArticles, color: "text-sky-500 dark:text-sky-400" },
    { label: "Researchers", value: stats?.researchers, color: "text-indigo-500 dark:text-indigo-400" },
    { label: "Countries (Estimated)", value: stats?.countriesEstimated, color: "text-cyan-500 dark:text-cyan-400" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 overflow-x-hidden">
        {/* Hero Section */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative flex min-h-[90vh] items-center bg-slate-50 dark:bg-slate-950 py-20 md:py-32 transition-colors duration-500">
            {/* 3D Scene — anchored to lower-right quadrant as background */}
            <motion.div 
              style={{ y: splineY, x: splineX, scale: splineScale }}
              className="absolute -bottom-[5%] -right-[5%] z-0 h-[100%] w-[100%] md:h-[120%] md:w-[70%] pointer-events-none origin-center"
            >
              <SplineScene />
            </motion.div>

            <div className="container relative z-10 mx-auto px-4 md:px-6 pointer-events-none">
              <div className="mx-auto max-w-3xl text-center pointer-events-auto">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-900/10 dark:border-white/10 bg-slate-900/5 dark:bg-white/5 px-4 py-2 text-sm font-medium text-sky-600 dark:text-sky-300 backdrop-blur-md">
                  <Zap className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                  Scientific Excellence
                </div>
                <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-7xl drop-shadow-2xl">
                  Modern Platform for <br className="hidden md:block" />
                  <span className="bg-gradient-to-r from-sky-500 to-indigo-500 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">Scientific Publishing</span>
                </h1>
                <p className="mb-8 text-xl leading-relaxed text-slate-600 dark:text-slate-300 text-pretty drop-shadow-md">
                  Comprehensive solutions for digital journals, submission management, and global scientific distribution.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button size="lg" className="rounded-full px-8 shadow-lg shadow-sky-500/20" asChild>
                    <Link href="/journals">
                      <BookOpen className="mr-2 h-5 w-5" />
                      Explore Journals
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full border-slate-900/20 dark:border-white/20 bg-transparent px-8 text-slate-900 dark:text-white backdrop-blur-md hover:bg-slate-900/5 dark:hover:bg-white/10" asChild>
                    <Link href="/about">Learn More</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Stats Section */}
        <GSAPWrapper animation="slideUp" delay={0.2}>
          <section className="border-y bg-muted/30 py-12">
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
          <section className="bg-muted/30 py-20">
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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <JournalCardSkeleton key={i} />
                  ))}
                </div>
              ) : isErrorOjs ? (
                <div className="text-center py-12 text-destructive">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-lg font-medium">Connection Error</p>
                  <p className="mt-1 text-sm">Could not fetch journals from the synchronized internal database.</p>
                </div>
              ) : journals && journals.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {journals.slice(0, 6).map((journal: Journal, idx: number) => (
                    <GSAPWrapper key={journal.id} animation="slideUp" delay={0.4 + idx * 0.1}>
                      <JournalCard
                        id={journal.id}
                        ojsId={journal.ojs_id}
                        title={journal.title}
                        description={journal.description || "Currently unavailable"}
                        field={journal.field}
                        coverImage={journal.cover_image_url}
                        variant="featured"
                      />
                    </GSAPWrapper>
                  ))}
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
                <p className="mb-8 text-lg opacity-90 leading-relaxed">Join thousands of researchers sharing their work with the global scientific community.</p>
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
      </main>

      <Footer />
    </div>
  )
}
