"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Zap } from "lucide-react"
import Link from "next/link"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { AnimatedCounter } from "@/components/animated-counter"

export default function HomePage() {
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

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "Journal of Prosthetic Dentistry",
                    issn: "ISSN 0022-3913",
                    field: "Dental Medicine",
                    fieldImage: "/images/imegjournal.jpg",
                  },
                  {
                    title: "Journal of Computerized Dentistry",
                    issn: "ISSN 1560-4853",
                    field: "Digital Dentistry",
                    fieldImage: "/images/2.png",
                  },
                  {
                    title: "Journal of Technology Research",
                    issn: "ISSN 3005-639X",
                    field: "Engineering",
                    fieldImage: "/images/1.png",
                  },
                ].map((journal, idx) => (
                  <GSAPWrapper key={idx} animation="slideUp" delay={0.4 + idx * 0.1}>
                    <Card className="transition-shadow hover:shadow-lg overflow-hidden">
                      <div className="relative h-64 w-full overflow-hidden">
                        <img
                          src={journal.fieldImage || "/placeholder.svg"}
                          alt={journal.field}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <span className="inline-block rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
                            {journal.field}
                          </span>
                        </div>
                      </div>
                      <CardContent className="pt-6">
                        <h3 className="mb-2 font-semibold text-balance">{journal.title}</h3>
                        <p className="mb-4 text-sm text-muted-foreground">{journal.issn}</p>
                        <div className="flex items-center justify-between">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/journals/${idx + 1}`}>View Details</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </GSAPWrapper>
                ))}
              </div>
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
