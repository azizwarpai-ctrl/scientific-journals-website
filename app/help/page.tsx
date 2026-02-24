"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, FileText, Users, HelpCircle } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { GSAPWrapper } from "@/components/gsap-wrapper"

import { useGetFaqs } from "@/src/features/solutions"

export default function HelpPage() {
  const { data: faqs = [], isLoading } = useGetFaqs()
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Help Center</h1>
                <p className="text-lg text-muted-foreground">Find answers, guides and support for your publishing journey</p>
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
                  <Card className="transition-shadow hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <h3 className="font-semibold">Guide for Authors</h3>
                    </CardContent>
                  </Card>
                  <Card className="transition-shadow hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                          <Users className="h-6 w-6 text-secondary" />
                        </div>
                      </div>
                      <h3 className="font-semibold">Guide for Reviewers</h3>
                    </CardContent>
                  </Card>
                  <Link href="/help/submission-service">
                    <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                      <CardContent className="pt-6 text-center">
                        <div className="mb-3 flex justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                        <h3 className="font-semibold">Submission Help</h3>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/help/technical-support">
                    <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                      <CardContent className="pt-6 text-center">
                        <div className="mb-3 flex justify-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                            <HelpCircle className="h-6 w-6 text-secondary" />
                          </div>
                        </div>
                        <h3 className="font-semibold">Technical Support</h3>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </GSAPWrapper>

              {/* FAQ */}
              <GSAPWrapper animation="fadeIn" delay={0.3}>
                <Card>
                  <CardHeader>
                    <CardTitle>FAQ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {isLoading ? (
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
                            <AccordionContent className="text-muted-foreground leading-relaxed">
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Guide for Authors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">Manuscript Preparation</h4>
                        <p className="leading-relaxed">Ensure your manuscript adheres to the journal's formatting guidelines, including citation style, figure resolution, and word count limits. Use the templates provided if available.</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">Submission Process</h4>
                        <p className="leading-relaxed">Verify that all co-authors are listed correctly and that you have obtained necessary ethical approvals. Prepare a cover letter to the editor highlighting the significance of your work.</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">Revision & Resubmission</h4>
                        <p className="leading-relaxed">When submitting a revised manuscript, include a point-by-point response to the reviewers' comments. Highlight changes in the manuscript text for easy verification.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Guide for Reviewers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">The Review Process</h4>
                        <p className="leading-relaxed">Reviews should be constructive, objective, and timely. Evaluate the study's methodology, clarity, and contribution to the field. Maintain confidentiality throughout the process.</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">Writing Reviews</h4>
                        <p className="leading-relaxed">Provide specific comments and suggestions for improvement. Clearly state your recommendation (Accept, Minor Revision, Major Revision, Reject) to the editor.</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">Timeline & Expectations</h4>
                        <p className="leading-relaxed">Accept review invitations only if you have the expertise and time to complete the review within the deadline. Inform the editor immediately if a conflict of interest or delay arises.</p>
                      </div>
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
