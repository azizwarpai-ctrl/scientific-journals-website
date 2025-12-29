"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, FileText, Users, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/hooks/use-language"
import { GSAPWrapper } from "@/components/gsap-wrapper"

export default function HelpPage() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{t("helpCenter")}</h1>
                <p className="text-lg text-muted-foreground">{t("helpDescription")}</p>
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
                      <h3 className="font-semibold">{t("authorGuides")}</h3>
                    </CardContent>
                  </Card>
                  <Card className="transition-shadow hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                          <Users className="h-6 w-6 text-secondary" />
                        </div>
                      </div>
                      <h3 className="font-semibold">{t("reviewerGuides")}</h3>
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
                        <h3 className="font-semibold">{t("submissionHelp")}</h3>
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
                        <h3 className="font-semibold">{t("technicalSupport")}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </GSAPWrapper>

              {/* FAQ */}
              <GSAPWrapper animation="fadeIn" delay={0.3}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("faq")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>{t("howToSubmitManuscript")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("submitManuscriptInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-2">
                        <AccordionTrigger>{t("typicalReviewTimeline")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("reviewTimelineInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-3">
                        <AccordionTrigger>{t("howToBecomeReviewer")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("becomeReviewerInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-4">
                        <AccordionTrigger>{t("acceptedFileFormats")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("fileFormatsInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-5">
                        <AccordionTrigger>{t("howToTrackSubmissionStatus")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("trackSubmissionStatusInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-6">
                        <AccordionTrigger>{t("publicationCharges")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("publicationChargesInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-7">
                        <AccordionTrigger>{t("howToResetPassword")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("resetPasswordInstructions")}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-8">
                        <AccordionTrigger>{t("whatIsORCID")}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {t("orcidInstructions")}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </GSAPWrapper>

              {/* User Guides */}
              <GSAPWrapper animation="slideUp" delay={0.4}>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("authorGuides")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{t("manuscriptPreparation")}</h4>
                        <p className="leading-relaxed">{t("manuscriptPreparationInstructions")}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{t("submissionProcess")}</h4>
                        <p className="leading-relaxed">{t("submissionProcessInstructions")}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{t("revisionAndResubmission")}</h4>
                        <p className="leading-relaxed">{t("revisionAndResubmissionInstructions")}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t("reviewerGuides")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{t("reviewProcess")}</h4>
                        <p className="leading-relaxed">{t("reviewProcessInstructions")}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{t("writingReviews")}</h4>
                        <p className="leading-relaxed">{t("writingReviewsInstructions")}</p>
                      </div>
                      <div>
                        <h4 className="mb-1 font-semibold text-foreground">{t("timelineAndExpectations")}</h4>
                        <p className="leading-relaxed">{t("timelineAndExpectationsInstructions")}</p>
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
