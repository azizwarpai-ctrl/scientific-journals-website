"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, FileText, Users, HelpCircle, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { GSAPWrapper } from "@/components/gsap-wrapper"

import { useGetFaqs } from "@/src/features/faq"
import { useGetHelpContent } from "@/src/features/help"

export default function HelpPage() {
  const { data: faqs = [], isLoading: isFaqLoading } = useGetFaqs()
  const { data: helpData, isLoading: isHelpLoading, isError: isHelpError } = useGetHelpContent()

  if (isHelpLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const content = helpData || {
    heroTitle: "Help Center",
    heroSubtitle: "Find answers, guides and support for your publishing journey",
    authorGuide: { title: "Guide for Authors", content: [] },
    reviewerGuide: { title: "Guide for Reviewers", content: [] }
  }

  const quickLinks = [
    { icon: BookOpen, title: "Guide for Authors", href: "#guide-authors", color: "primary" as const },
    { icon: Users, title: "Guide for Reviewers", href: "#guide-reviewers", color: "secondary" as const },
    { icon: FileText, title: "Submission Help", href: "/help/submission-service", color: "primary" as const },
    { icon: HelpCircle, title: "Technical Support", href: "/help/technical-support", color: "secondary" as const },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{content.heroTitle}</h1>
                <p className="text-lg text-muted-foreground">{content.heroSubtitle}</p>
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
                  {quickLinks.map((link) => {
                    const isExternal = link.href.startsWith("/")
                    const Wrapper = isExternal ? Link : "a"
                    return (
                      <Wrapper key={link.title} href={link.href}>
                        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-border/50 h-full">
                          <CardContent className="pt-6 text-center">
                            <div className="mb-3 flex justify-center">
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                                link.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                              }`}>
                                <link.icon className={`h-6 w-6 ${
                                  link.color === "primary" ? "text-primary" : "text-secondary"
                                }`} />
                              </div>
                            </div>
                            <h3 className="font-semibold">{link.title}</h3>
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
                    <CardTitle>Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {isFaqLoading ? (
                        <div className="space-y-4 py-4">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="border-b pb-4">
                              <Skeleton className="h-6 w-3/4" />
                            </div>
                          ))}
                        </div>
                      ) : faqs.length > 0 ? (
                        faqs.map((faq, idx) => (
                          <AccordionItem key={faq.id} value={`item-${idx}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))
                      ) : (
                        <div className="py-8 text-center text-muted-foreground">
                          No FAQ items found.
                        </div>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>
              </GSAPWrapper>

              {/* User Guides */}
              <GSAPWrapper animation="slideUp" delay={0.4}>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <Card id="guide-authors" className="border-border/50 scroll-mt-24">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle>{content.authorGuide.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                      {content.authorGuide.content.map((item, i) => (
                        <div key={i}>
                          <h4 className="mb-1 font-semibold text-foreground">{item.heading}</h4>
                          <p className="leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card id="guide-reviewers" className="border-border/50 scroll-mt-24">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                          <Users className="h-5 w-5 text-secondary" />
                        </div>
                        <CardTitle>{content.reviewerGuide.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground">
                      {content.reviewerGuide.content.map((item, i) => (
                        <div key={i}>
                          <h4 className="mb-1 font-semibold text-foreground">{item.heading}</h4>
                          <p className="leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </GSAPWrapper>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
