"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Users, FileText, Globe, Shield, Zap } from "lucide-react"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface SolutionItem {
  id: string
  title: string
  description: string
  icon: string | null
  features: string[] | null
  display_order: number
  is_published: boolean
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Users,
  FileText,
  Globe,
  Shield,
  Zap,
}

function getIcon(iconName: string | null) {
  if (!iconName || !ICON_MAP[iconName]) return BookOpen
  return ICON_MAP[iconName]
}

export default function SolutionsPage() {
  const { data: solutions = [], isLoading, error } = useQuery<SolutionItem[]>({
    queryKey: ["solutions", "public"],
    queryFn: async () => {
      const response = await client.solutions.index.$get()
      if (!response.ok) {
        throw new Error("Failed to fetch solutions")
      }
      const { data } = await response.json()
      return data as SolutionItem[]
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  const colors = ["primary", "secondary"]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl text-balance">Our Solutions</h1>
                <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                  Comprehensive digital publishing solutions designed to empower journals, editors, and researchers
                  worldwide.
                </p>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Solutions Content */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-6 text-center text-destructive">
                <p className="font-medium">Failed to load solutions. Please try again later.</p>
              </div>
            ) : isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-full border-border/50">
                    <CardContent className="pt-6">
                      <Skeleton className="mb-4 h-12 w-12 rounded-lg" />
                      <Skeleton className="mb-2 h-6 w-3/4" />
                      <Skeleton className="mb-4 h-16 w-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : solutions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Solutions Coming Soon</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We are preparing our comprehensive publishing solutions. Check back soon for updates.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {solutions.map((solution, idx) => {
                  const Icon = getIcon(solution.icon)
                  const colorClass = colors[idx % colors.length]

                  return (
                    <GSAPWrapper key={solution.id} animation="slideUp" delay={0.1 + idx * 0.1}>
                      <Card className="h-full transition-all hover:shadow-xl hover:-translate-y-1 border-border/50">
                        <CardContent className="pt-6">
                          <div
                            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                              colorClass === "primary" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <h3 className="mb-2 text-xl font-semibold">{solution.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {solution.description}
                          </p>
                          {solution.features && solution.features.length > 0 && (
                            <ul className="space-y-1.5">
                              {solution.features.map((feature, fIdx) => (
                                <li key={fIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                    colorClass === "primary" ? "bg-primary" : "bg-secondary"
                                  }`} />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    </GSAPWrapper>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <GSAPWrapper animation="scale" delay={0.3}>
          <section className="py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-br from-primary to-secondary p-8 text-center text-primary-foreground md:p-12">
                <h2 className="mb-4 text-2xl font-bold md:text-3xl">Need a custom solution?</h2>
                <p className="mb-6 opacity-90">Our team is ready to help you find the right solution for your publishing needs.</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="bg-transparent hover:bg-primary-foreground/10" asChild>
                    <Link href="/help">Visit Help Center</Link>
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
