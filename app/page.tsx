"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Zap, Loader2 } from "lucide-react"
import Link from "next/link"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { AnimatedCounter } from "@/components/animated-counter"
import { useGetOjsJournals } from "@/src/features/ojs/api/use-get-ojs-journals"

export default function HomePage() {
  const { data: ojsData, isLoading } = useGetOjsJournals()
  const journals = ojsData?.data ?? []

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20 md:py-32">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                  <Zap className="h-4 w-4" />
                  Scientific Excellence
                </div>
                <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl text-balance">Modern Platform for Scientific Publishing</h1>
                <p className="mb-8 text-lg text-muted-foreground leading-relaxed text-pretty">Comprehensive solutions for digital journals, submission management, and scientific publishing.</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button size="lg" asChild>
                    <Link href="/journals">
                      <BookOpen className="mr-2 h-5 w-5" />
                      Explore Journals
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
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
              <div className="grid gap-8 md:grid-cols-4">
                <div className="text-center">
                  <div className="mb-2 text-primary">
                    <AnimatedCounter end={250} suffix="+" duration={2500} />
                  </div>
                  <div className="text-sm text-muted-foreground">Active Journals</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-secondary">
                    <AnimatedCounter end={15000} suffix="+" duration={2500} />
                  </div>
                  <div className="text-sm text-muted-foreground">Published Articles</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-primary">
                    <AnimatedCounter end={50000} suffix="+" duration={2500} />
                  </div>
                  <div className="text-sm text-muted-foreground">Researchers</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 text-secondary">
                    <AnimatedCounter end={120} suffix="+" duration={2500} />
                  </div>
                  <div className="text-sm text-muted-foreground">Countries</div>
                </div>
              </div>
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

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : journals.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {journals.slice(0, 6).map((journal, idx) => (
                    <GSAPWrapper key={journal.journal_id} animation="slideUp" delay={0.4 + idx * 0.1}>
                      <Card className="transition-shadow hover:shadow-lg overflow-hidden">
                        <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <span className="inline-block rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                              {journal.primary_locale}
                            </span>
                          </div>
                        </div>
                        <CardContent className="pt-6">
                          <h3 className="mb-2 font-semibold text-balance">{journal.name || journal.path}</h3>
                          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                            {journal.description || "No description available"}
                          </p>
                          <div className="flex items-center justify-between">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/journals/${journal.journal_id}`}>View Details</Link>
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
