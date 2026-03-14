"use client"

import { SplineScene } from "@/components/spline-scene"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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

  const statConfigs = [
    { label: "Active Journals", value: stats?.activeJournals, color: "text-blue-500 dark:text-blue-400" },
    { label: "Published Articles", value: stats?.publishedArticles, color: "text-sky-500 dark:text-sky-400" },
    { label: "Researchers", value: stats?.researchers, color: "text-indigo-500 dark:text-indigo-400" },
    { label: "Countries (Estimated)", value: stats?.countriesEstimated, color: "text-cyan-500 dark:text-cyan-400" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-slate-950 py-20 md:py-32">
            {/* 3D Scene — anchored to lower-right quadrant as background */}
            <div className="absolute -bottom-[15%] -right-[10%] z-0 h-[110%] w-[100%] md:h-[130%] md:w-[80%] pointer-events-auto cursor-grab active:cursor-grabbing">
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
                  <Button size="lg" variant="outline" className="rounded-full border-white/20 bg-white/5 px-8 text-white backdrop-blur-md hover:bg-white/10 hover:text-white" asChild>
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
                      <Card className="transition-shadow hover:shadow-lg overflow-hidden">
                        <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                          {journal.cover_image_url ? (
                            <Image
                              src={journal.cover_image_url}
                              alt={journal.title || "Journal"}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Image
                                src="/images/logodigitopub.png"
                                alt="DigitoPub"
                                width={120}
                                height={120}
                                className="opacity-60"
                              />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            {journal.field && (
                              <span className="inline-block rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                                {journal.field}
                              </span>
                            )}
                          </div>
                        </div>
                        <CardContent className="pt-6">
                          <h3 className="mb-2 font-semibold text-balance">{journal.title}</h3>
                          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                            {journal.description || "Currently unavailable"}
                          </p>
                          <div className="flex items-center justify-between">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/journals/${journal.ojs_id || journal.id}`}>View Details</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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
