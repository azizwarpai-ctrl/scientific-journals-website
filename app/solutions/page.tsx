"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
<<<<<<< HEAD
import { Loader2, BookOpen, Users, FileText, Globe, Shield, Zap } from "lucide-react"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

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
=======
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, Loader2, Lightbulb, HelpCircle, FileText, Zap } from "lucide-react"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { useGetFaqs } from "@/src/features/solutions"
import type { Solution } from "@/src/features/solutions"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Group solutions by category
function groupByCategory(solutions: Solution[]): Record<string, Solution[]> {
  return solutions.reduce((acc, solution) => {
    const category = solution.category || "General"
    if (!acc[category]) acc[category] = []
    acc[category].push(solution)
    return acc
  }, {} as Record<string, Solution[]>)
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  general: HelpCircle,
  publishing: BookOpen,
  submission: FileText,
  technical: Zap,
}

function getCategoryIcon(category: string) {
  const key = category.toLowerCase()
  return CATEGORY_ICONS[key] || Lightbulb
}

export default function SolutionsPage() {
  const { data: solutions = [], isLoading, error } = useGetFaqs()
  const grouped = groupByCategory(solutions)
  const categories = Object.keys(grouped)
>>>>>>> fix/dynamic-content-and-sso

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
                  worldwide. Find answers to common questions and explore our services.
                </p>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Solutions Content */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            {error ? (
<<<<<<< HEAD
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
=======
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
                <HelpCircle className="mx-auto mb-3 h-8 w-8 text-destructive opacity-60" />
                <p className="text-destructive font-medium">Failed to load solutions. Please try again later.</p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
>>>>>>> fix/dynamic-content-and-sso
              </div>
            ) : solutions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Lightbulb className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-lg font-medium">No solutions available yet</p>
                <p className="mt-1 text-sm">Check back soon for helpful resources and answers.</p>
              </div>
            ) : (
<<<<<<< HEAD
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
=======
              <div className="mx-auto max-w-4xl space-y-10">
                {categories.map((category, catIdx) => {
                  const Icon = getCategoryIcon(category)
                  const items = grouped[category]

                  return (
                    <GSAPWrapper key={category} animation="slideUp" delay={0.1 + catIdx * 0.1}>
                      <Card className="border-border/50 shadow-sm">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold capitalize">{category}</h2>
                            <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                              {items.length} {items.length === 1 ? "item" : "items"}
                            </span>
                          </div>

                          <Accordion type="single" collapsible className="w-full">
                            {items.map((solution, idx) => (
                              <AccordionItem key={solution.id} value={`${category}-${idx}`}>
                                <AccordionTrigger className="text-left text-sm font-medium hover:text-primary transition-colors">
                                  {solution.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
                                  {solution.answer}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
>>>>>>> fix/dynamic-content-and-sso
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
                <h2 className="mb-4 text-2xl font-bold md:text-3xl">Still need help?</h2>
                <p className="mb-6 opacity-90">Our support team is ready to assist you with any questions.</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/contact">Contact Support</Link>
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
