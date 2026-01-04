"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, FileText, Users, HelpCircle } from "lucide-react"
import Link from "next/link"
import { GSAPWrapper } from "@/components/gsap-wrapper"

export default function HelpPage() {
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
                      <AccordionItem value="item-1">
                        <AccordionTrigger>How to submit a manuscript?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          To submit a manuscript, you need to register an account first. After logging in, navigate to the 'Submit Manager' or click 'Submit Manuscript' on the journal's page. Follow the step-by-step submission process to upload your files and provide necessary metadata.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-2">
                        <AccordionTrigger>What is the typical review timeline?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          The initial editorial check usually takes 3-5 days. The peer review process typically takes 4-8 weeks, depending on reviewer availability. Once reviews are in, an editorial decision is made within 1-2 weeks. Total time from submission to first decision averages 8-10 weeks.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-3">
                        <AccordionTrigger>How can I become a reviewer?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          We welcome qualified experts to join our reviewer community. You can update your profile to indicate your interest in reviewing and specify your areas of expertise. Alternatively, you can contact the journal editor directly with your CV and research interests.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-4">
                        <AccordionTrigger>What file formats are accepted?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          For the main manuscript, we accept Microsoft Word (.doc, .docx) and PDF files. For figures, strictly high-resolution JPEG, TIFF, or PNG formats are required. Supplementary materials can be in any common format. Please check the specific journal guidelines for detailed requirements.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-5">
                        <AccordionTrigger>How to track my submission status?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          You can track the status of your manuscript at any time by logging into your account and clicking on 'My Submissions'. The status will be displayed (e.g., 'Under Review', 'Revision Required', 'Accepted'). You will also receive email notifications at key stages.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-6">
                        <AccordionTrigger>Are there publication charges?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          Publication charges (APCs) vary by journal. Many of our journals are Open Access and require an APC upon acceptance to cover publishing costs. Some journals may have waivers or discounts for authors from certain countries or institutions. Please refer to the specific journal's 'Article Processing Charges' page.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-7">
                        <AccordionTrigger>How to reset my password?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          If you have forgotten your password, go to the login page and click on the 'Forgot Password?' link. Enter your registered email address, and we will send you instructions to reset your password.
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="item-8">
                        <AccordionTrigger>What is ORCID?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          ORCID provides a persistent digital identifier that distinguishes you from every other researcher. We strongly encourage all authors to link their ORCID iD to their account to ensure their work is correctly attributed to them.
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
