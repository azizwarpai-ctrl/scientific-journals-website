"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, FileText, Users, HelpCircle, ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"

import { useGetFaqs } from "@/src/features/faq"
import { useGetHelpContent } from "@/src/features/help"
import { defaultHelpContent } from "@/src/features/help/schemas/help-schema"
import { useGetHelpArticles } from "@/src/features/help-articles"

export default function HelpPage() {
  const { data: faqResponse, isLoading: isFaqLoading } = useGetFaqs(1, 50)
  const { data: helpResponse, isLoading: isHelpLoading } = useGetHelpContent()
  const { data: articlesResponse, isLoading: isArticlesLoading } = useGetHelpArticles(1, 50)
  const [faqFilter, setFaqFilter] = useState("")

  const faqs = faqResponse?.data || []
  const content = helpResponse || defaultHelpContent
  const articles = articlesResponse?.data || []

  // Filter FAQs by search term
  const filteredFaqs = useMemo(() => {
    if (!faqFilter.trim()) return faqs
    const q = faqFilter.toLowerCase()
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer?.toLowerCase().includes(q)
    )
  }, [faqs, faqFilter])

  // Group FAQs by category for better organization
  const groupedFaqs = useMemo(() => {
    const groups: Record<string, typeof filteredFaqs> = {}
    for (const faq of filteredFaqs) {
      const cat = faq.category || "General"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(faq)
    }
    return groups
  }, [filteredFaqs])

  const hasCategories = Object.keys(groupedFaqs).length > 1

  // Group help articles by category
  const groupedArticles = useMemo(() => {
    const groups: Record<string, typeof articles> = {}
    for (const article of articles) {
      const cat = article.category || "General"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(article)
    }
    return groups
  }, [articles])



  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                {isHelpLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="mx-auto h-12 w-64 md:h-14" />
                    <Skeleton className="mx-auto h-6 w-full max-w-md" />
                  </div>
                ) : (
                  <>
                    <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{content.heroTitle}</h1>
                    <p className="text-lg text-muted-foreground">{content.heroSubtitle}</p>
                  </>
                )}
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Quick Links */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <GSAPWrapper animation="slideUp" delay={0.2}>
                <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {content.quickLinks?.map((link) => {
                    const isRoute = link.href.startsWith("/")
                    const Wrapper = isRoute ? Link : "a"
                    const iconName = link.icon || "BookOpen"
                    const IconElement = iconName === "Users" ? Users : iconName === "HelpCircle" ? HelpCircle : iconName === "FileText" ? FileText : BookOpen
                    
                    return (
                      <Wrapper key={link.id || link.title} href={link.href as string}>
                        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 h-full">
                          <CardContent className="pt-6 text-center">
                            <div className="mb-3 flex justify-center">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                                link.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                              }`}>
                                <IconElement className={`h-6 w-6 ${
                                  link.color === "primary" ? "text-primary" : "text-secondary"
                                }`} />
                              </div>
                            </div>
                            <h3 className="font-semibold">{link.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
                            <ChevronRight className="mx-auto mt-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardContent>
                        </Card>
                      </Wrapper>
                    )
                  })}
                </div>
              </GSAPWrapper>


              {/* FAQ */}
              <GSAPWrapper animation="fadeIn" delay={0.3}>
                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle>Frequently Asked Questions</CardTitle>
                      {!isFaqLoading && faqs.length > 3 && (
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="faq-search"
                            type="search"
                            placeholder="Filter FAQs..."
                            className="pl-9 h-9 text-sm"
                            value={faqFilter}
                            onChange={(e) => setFaqFilter(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isFaqLoading ? (
                      <div className="space-y-4 py-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="border-b pb-4">
                            <Skeleton className="h-6 w-3/4" />
                          </div>
                        ))}
                      </div>
                    ) : filteredFaqs.length > 0 ? (
                      hasCategories ? (
                        // Grouped by category
                        <div className="space-y-6">
                          {Object.entries(groupedFaqs).map(([category, items]) => (
                            <div key={category}>
                              <h3 className="mb-3 text-sm font-semibold text-primary uppercase tracking-wider">
                                {category}
                              </h3>
                              <Accordion type="single" collapsible className="w-full">
                                {items.map((faq, idx) => (
                                  <AccordionItem key={faq.id} value={`${category}-item-${idx}`}>
                                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                      {faq.answer}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Flat list
                        <Accordion type="single" collapsible className="w-full">
                          {filteredFaqs.map((faq, idx) => (
                            <AccordionItem key={faq.id} value={`item-${idx}`}>
                              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                              <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )
                    ) : faqFilter ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p>No FAQs matching &ldquo;{faqFilter}&rdquo;</p>
                        <button
                          className="mt-2 text-sm text-primary hover:underline"
                          onClick={() => setFaqFilter("")}
                        >
                          Clear filter
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">
                        No FAQ items found.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </GSAPWrapper>

              {/* Dynamic Help Articles & Guides */}
              <GSAPWrapper animation="slideUp" delay={0.4}>
                {(isArticlesLoading || Object.keys(groupedArticles).length > 0) && (
                  <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                    {isArticlesLoading ? (
                      [...Array(2)].map((_, i) => (
                        <Card key={i} className="border-border/50">
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-lg" />
                              <Skeleton className="h-6 w-32" />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {[...Array(3)].map((_, j) => (
                              <div key={j} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-12 w-full" />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      Object.entries(groupedArticles).map(([category, items]) => {
                        const iconName = items[0]?.icon || "BookOpen"
                        const IconElement = iconName === "Users" ? Users : iconName === "HelpCircle" ? HelpCircle : iconName === "FileText" ? FileText : BookOpen
                        
                        // ID generator for Quick Links (e.g., guide-for-authors -> guide-authors ideally, or just standard slug)
                        // If it's "Guide for Authors", make it "guide-authors" matching old hardcoded anchor
                        const anchorId = category.toLowerCase().includes("authors") ? "guide-authors" : category.toLowerCase().includes("reviewers") ? "guide-reviewers" : category.toLowerCase().replace(/[^a-z0-9]+/g, "-")

                        return (
                          <Card key={category} id={anchorId} className="border-border/50 scroll-mt-24">
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                  iconName === "Users" ? "bg-secondary/10" : "bg-primary/10"
                                }`}>
                                  <IconElement className={`h-5 w-5 ${
                                    iconName === "Users" ? "text-secondary" : "text-primary"
                                  }`} />
                                </div>
                                <CardTitle>{category}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-6 text-sm text-muted-foreground">
                              {items.map((article) => (
                                <div key={String(article.id)}>
                                  <h4 className="mb-1 font-semibold text-foreground">{article.title}</h4>
                                  <p className="leading-relaxed whitespace-pre-wrap">{article.content}</p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                )}
              </GSAPWrapper>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
