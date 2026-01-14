"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Download, ExternalLink, LogIn } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { useState, useEffect } from "react"

const journalData: Record<string, any> = {
  "1": {
    title: "Journal of Digitodontics",
    issn: "ISSN 2456-7890",
    field: "Digital Dentistry",
    publisher: "dis Scientific",
    year: "2020",
    coverImage: "/images/imegjournal.jpg",
    description:
      "A premier peer-reviewed journal dedicated to advancing the field of digital dentistry through cutting-edge research and clinical applications.",
    aims: "To publish high-quality original research, reviews, and case studies that contribute to the understanding and practice of digital dentistry worldwide.",
    frequency: "Quarterly (4 issues per year)",
    loginUrl: "/journals/1/login",
    detailedInfo: {
      founded: "2020",
      language: "English",
      openAccess: "Yes",
      peerReview: "Double-blind",
      articleProcessingCharge: "$500 USD",
      submissionToDecision: "45 days average",
      acceptanceToPublication: "30 days average",
      copyrightPolicy: "Creative Commons Attribution 4.0 International License",
      withdrawalPolicy: "Available upon request with valid justification",
    },
  },
  "2": {
    title: "Open Journal of Biomedical Research",
    issn: "ISSN 2456-7891",
    field: "Biomedical Science",
    publisher: "dis Scientific",
    year: "2019",
    coverImage: "/images/2.png",
    description:
      "An open-access journal publishing groundbreaking biomedical research across all areas of human health and disease.",
    aims: "To accelerate the dissemination of biomedical discoveries and foster collaboration among researchers worldwide.",
    frequency: "Bi-monthly (6 issues per year)",
    loginUrl: "/journals/2/login",
    detailedInfo: {
      founded: "2019",
      language: "English",
      openAccess: "Yes",
      peerReview: "Double-blind",
      articleProcessingCharge: "$600 USD",
      submissionToDecision: "40 days average",
      acceptanceToPublication: "25 days average",
      copyrightPolicy: "Creative Commons Attribution 4.0 International License",
      withdrawalPolicy: "Available upon request with valid justification",
    },
  },
}

export default function JournalDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [journalId, setJournalId] = useState<string>("1")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = params instanceof Promise ? await params : params
      setJournalId(resolvedParams.id)
      setIsLoading(false)
    }
    resolveParams()
  }, [params])

  if (isLoading) {
    return null // or a loading spinner if preferred
  }

  const journal = journalData[journalId] || journalData["1"]

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-start gap-4">
                  {journal.coverImage && (
                    <div className="flex-shrink-0">
                      <Image
                        src={journal.coverImage || "/images/logodigitopub.png"}
                        alt={journal.title}
                        width={80}
                        height={100}
                        className="rounded-lg shadow-md object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {journal.field}
                    </div>
                    <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl text-balance">{journal.title}</h1>
                    <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{journal.issn}</span>
                      <span>•</span>
                      <span>{journal.publisher}</span>
                      <span>•</span>
                      <span>Founded {journal.year}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" asChild>
                    <Link href={journal.loginUrl}>
                      <LogIn className="mr-2 h-5 w-5" />
                      Access Journal Portal
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline">
                    <FileText className="mr-2 h-5 w-5" />
                    Submit Manuscript
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Quick Stats */}
        <GSAPWrapper animation="slideUp" delay={0.2}>
          <section className="border-b bg-muted/30 py-8">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-primary">45 days</div>
                  <div className="text-sm text-muted-foreground">Review Time</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-secondary">92%</div>
                  <div className="text-sm text-muted-foreground">Acceptance Rate</div>
                </div>
                <div className="text-center">
                  <div className="mb-1 text-3xl font-bold text-primary">{journal.frequency.split(" ")[0]}</div>
                  <div className="text-sm text-muted-foreground">Publication</div>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Main Content */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <GSAPWrapper animation="fadeIn" delay={0.3}>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="info">Journal Info</TabsTrigger>
                    <TabsTrigger value="editorial">Editorial Board</TabsTrigger>
                    <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
                    <TabsTrigger value="issues">Current Issue</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>About the Journal</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="leading-relaxed text-muted-foreground">{journal.description}</p>
                        <div>
                          <h4 className="mb-2 font-semibold">Aims and Scope</h4>
                          <p className="leading-relaxed text-muted-foreground">{journal.aims}</p>
                        </div>
                        <div>
                          <h4 className="mb-2 font-semibold">Publication Details</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Frequency: {journal.frequency}</li>
                            <li>• ISSN: {journal.issn}</li>
                            <li>• Publisher: {journal.publisher}</li>
                            <li>• Open Access: Yes</li>
                            <li>• Peer Review: Double-blind</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Indexing and Archiving</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="mb-2 font-semibold text-sm">Indexed in</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              <li>• PubMed Central</li>
                              <li>• Scopus</li>
                              <li>• Web of Science</li>
                              <li>• Google Scholar</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm">Archived by</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              <li>• Portico</li>
                              <li>• CLOCKSS</li>
                              <li>• National Library Archives</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="info" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Detailed Journal Information</CardTitle>
                        <CardDescription>
                          Complete information about the journal policies and procedures
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Founded</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.founded}</p>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Language</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.language}</p>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Open Access</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.openAccess}</p>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Peer Review Type</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.peerReview}</p>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Article Processing Charge</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.articleProcessingCharge}</p>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Submission to Decision</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.submissionToDecision}</p>
                          </div>
                          <div>
                            <h4 className="mb-2 font-semibold text-sm text-primary">Acceptance to Publication</h4>
                            <p className="text-muted-foreground">{journal.detailedInfo.acceptanceToPublication}</p>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h4 className="mb-2 font-semibold text-sm text-primary">Copyright Policy</h4>
                          <p className="text-muted-foreground leading-relaxed">
                            {journal.detailedInfo.copyrightPolicy}
                          </p>
                        </div>

                        <div>
                          <h4 className="mb-2 font-semibold text-sm text-primary">Withdrawal Policy</h4>
                          <p className="text-muted-foreground leading-relaxed">
                            {journal.detailedInfo.withdrawalPolicy}
                          </p>
                        </div>

                        <div className="rounded-lg bg-muted p-4">
                          <h4 className="mb-2 font-semibold text-sm">Contact Information</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Editorial Office: {journal.title}</p>
                            <p>Email: editorial@{journal.issn.toLowerCase().replace(/\s+/g, "")}.com</p>
                            <p>Publisher: {journal.publisher}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="editorial" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Editorial Board</CardTitle>
                        <CardDescription>
                          Our distinguished panel of experts guiding scholarly excellence
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          {
                            name: "Dr. Sarah Johnson",
                            role: "Editor-in-Chief",
                            affiliation: "Harvard University, USA",
                          },
                          {
                            name: "Prof. Michael Chen",
                            role: "Associate Editor",
                            affiliation: "Stanford University, USA",
                          },
                          { name: "Dr. Emily Roberts", role: "Associate Editor", affiliation: "Oxford University, UK" },
                          {
                            name: "Prof. Ahmed Al-Rashid",
                            role: "Editorial Board Member",
                            affiliation: "King Saud University, Saudi Arabia",
                          },
                        ].map((member, idx) => (
                          <div key={idx} className="border-b pb-4 last:border-0">
                            <h4 className="font-semibold">{member.name}</h4>
                            <p className="text-sm text-primary">{member.role}</p>
                            <p className="text-sm text-muted-foreground">{member.affiliation}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="guidelines" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Author Guidelines</CardTitle>
                        <CardDescription>
                          Essential information for manuscript preparation and submission
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="mb-2 font-semibold">Manuscript Preparation</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Use standard manuscript format (Title, Abstract, Introduction, Methods, Results,
                              Discussion, References)
                            </li>
                            <li>• Maximum word count: 6,000 words</li>
                            <li>• Abstract: 250 words maximum</li>
                            <li>• References: Follow APA 7th edition style</li>
                            <li>• Figures and tables: High resolution (300 dpi minimum)</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="mb-2 font-semibold">Submission Process</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Register or login to the journal portal</li>
                            <li>• Complete the online submission form</li>
                            <li>• Upload manuscript and supplementary files</li>
                            <li>• Suggest potential reviewers</li>
                            <li>• Submit for editorial review</li>
                          </ul>
                        </div>
                        <Button asChild>
                          <Link href={journal.loginUrl}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Full Guidelines (PDF)
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="issues" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Current Issue - Volume 4, Issue 3 (2024)</CardTitle>
                        <CardDescription>Latest published articles</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          {
                            title: "Advanced CAD/CAM Technologies in Modern Dentistry",
                            authors: "Smith J, Brown A, Davis M",
                            pages: "1-12",
                            doi: "10.1234/jd.2024.001",
                          },
                          {
                            title: "Digital Workflow in Implant Dentistry: A Systematic Review",
                            authors: "Johnson K, Williams R",
                            pages: "13-28",
                            doi: "10.1234/jd.2024.002",
                          },
                          {
                            title: "Artificial Intelligence Applications in Dental Diagnostics",
                            authors: "Chen L, Park S, Kumar V",
                            pages: "29-45",
                            doi: "10.1234/jd.2024.003",
                          },
                        ].map((article, idx) => (
                          <div key={idx} className="border-b pb-4 last:border-0">
                            <h4 className="mb-1 font-semibold hover:text-primary">
                              <Link href="#">{article.title}</Link>
                            </h4>
                            <p className="mb-1 text-sm text-muted-foreground">{article.authors}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Pages {article.pages}</span>
                              <span>DOI: {article.doi}</span>
                              <Button size="sm" variant="ghost" className="h-auto p-0">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                View Article
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </GSAPWrapper>
            </div>
          </div>
        </section>

        {/* CTA */}
        <GSAPWrapper animation="scale" delay={0.4}>
          <section className="bg-muted/30 py-12">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl">
                <Card className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  <CardContent className="p-8 text-center">
                    <h2 className="mb-4 text-2xl font-bold">Ready to Access This Journal?</h2>
                    <p className="mb-6 opacity-90">
                      Login to submit manuscripts, review articles, or browse the complete archive
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button size="lg" variant="secondary" asChild>
                        <Link href={journal.loginUrl}>
                          <LogIn className="mr-2 h-5 w-5" />
                          Journal Login Portal
                        </Link>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent hover:bg-primary-foreground/10"
                        asChild
                      >
                        <Link href="/register">Create Account</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </GSAPWrapper>
      </main>

      <Footer />
    </div>
  )
}
