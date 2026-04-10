"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  BookOpen,
  Info,
  FileText,
  Shield,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Globe,
  Send,
  User,
  Building,
  Mail,
  ArrowRight,
  Database,
  Calendar,
} from "lucide-react"

import DOMPurify from "isomorphic-dompurify"

import { useGetJournal, useGetJournalStats, useJournalId } from "@/src/features/journals"

import { Navbar } from "@/components/navbar"
import CollapsibleContent from "@/components/ui/collapsible-content"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { JournalError } from "@/components/errors/error-states"
import { JournalNotFound } from "@/components/states/not-found-states"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JournalDetailSkeleton } from "@/components/skeletons/journal-detail-skeleton"
import { CurrentIssueSection } from "./components/current-issue-section"
import { ArchiveSection } from "./components/archive-section"
import { Newspaper as NewspaperIcon, Archive as ArchiveIcon } from "lucide-react"
import { EditorialBoardSection } from "./components/editorial-board-section"
import { CustomBlocksCarousel } from "./components/custom-blocks-carousel"

export default function JournalDetailPage() {
  const id = useJournalId()
  const [activeTab, setActiveTab] = useState("about")

  const { data: journal, isLoading, error } = useGetJournal(id)
  const { data: stats } = useGetJournalStats(id)

  const sanitizeContent = (html: string | null | undefined): string => {
    if (!html) return ""
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
      ALLOWED_ATTR: [],
    })
  }


  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <JournalDetailSkeleton />
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <JournalError message={error.message} />
        </main>
        <Footer />
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <JournalNotFound />
        </main>
        <Footer />
      </div>
    )
  }

  const safeAimsAndScope = sanitizeContent(journal.aims_and_scope)
  const safeAuthorGuidelines = sanitizeContent(journal.author_guidelines)

  const ojsBaseUrl = process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://submitmanager.com"
  // Ensure we have a trailing slash removed for consistent URL building
  const ojsDomain = ojsBaseUrl.endsWith('/') ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl

  // URL priority: ojs_path slug → website_url slug → numeric db id
  let targetSlug = journal.ojs_path
  if (!targetSlug) {
    console.warn('Journal ojs_path missing, falling back to website_url')
    if (journal.website_url) {
      try {
        const url = new URL(journal.website_url)
        const parts = url.pathname.split('/')
        targetSlug = parts.filter(Boolean).pop() || ''
      } catch {
        const urlWithoutProtocol = journal.website_url.replace(/^https?:\/\//, '')
        const parts = urlWithoutProtocol.split('/')
        targetSlug = parts.filter(Boolean).pop() || ''
      }
    }
  }

  const directUrl = targetSlug ? `${ojsDomain}/index.php/${targetSlug}/submission` : null


  const renderSubmitButton = (buttonClass: string = "", variant: "default" | "outline" = "default", children: React.ReactNode) => {
    if (!ojsDomain || !directUrl) return null;
    return (
      <Button size={variant === "outline" ? "default" : "lg"} variant={variant} className={buttonClass} asChild>
        <Link href={directUrl}>
          {children}
        </Link>
      </Button>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section - Professional Academic Design */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 z-0">
            {journal.cover_image_url && (
              <Image
                src={journal.cover_image_url}
                alt=""
                fill
                className="object-cover opacity-5 blur-2xl"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/90" />
            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="grid gap-10 md:grid-cols-[240px_1fr] md:items-start lg:gap-16">
              {/* Cover Image - Refined Display */}
              <div className="mx-auto w-40 md:mx-0 md:w-48 lg:w-56 flex-shrink-0">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
                  <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-white/10">
                    <Image
                      src={journal.cover_image_url || "/images/logodigitopub.png"}
                      alt={journal.title}
                      width={224}
                      height={312}
                      className="h-auto w-full object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Title + Metadata + Actions */}
              <div className="space-y-6">
                {/* Badges */}
                <div className="flex flex-wrap gap-2.5">
                  {journal.field && (
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-sm px-3.5 py-1.5 text-xs font-semibold">
                      <Globe className="mr-1.5 h-3 w-3" />
                      {journal.field}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium">
                    <Database className="mr-1.5 h-3 w-3" />
                    {journal.issn || journal.e_issn || "ISSN Coming Soon"}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium">
                    <Globe className="mr-1.5 h-3 w-3" />
                    Open Access
                  </Badge>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance leading-tight">
                  {journal.title}
                </h1>

                {/* Metadata Row - Clean Display */}
                <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
                  {journal.publisher && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-white/5">
                        <Building className="h-4 w-4 text-primary/80" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Publisher</span>
                        <span className="font-medium text-slate-200">{journal.publisher}</span>
                      </div>
                    </div>
                  )}
                  {journal.frequency && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-white/5">
                        <Calendar className="h-4 w-4 text-primary/80" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Frequency</span>
                        <span className="font-medium text-slate-200">{journal.frequency}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {renderSubmitButton(
                    "rounded-lg px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                    "default",
                    <>
                      <span className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Submit Manuscript</span>
                      </span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-10 md:py-14 lg:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="inline-flex h-auto w-full justify-start gap-1 bg-transparent p-0 border-b border-border rounded-none">
                    <TabsTrigger
                      value="about"
                      className="rounded-none border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      About Journal
                    </TabsTrigger>
                    <TabsTrigger
                      value="author"
                      className="rounded-none border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Author Guidelines
                    </TabsTrigger>
                    <TabsTrigger
                      value="current"
                      className="rounded-none border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <NewspaperIcon className="mr-2 h-4 w-4" />
                      Current Issue
                    </TabsTrigger>
                    <TabsTrigger
                      value="archive"
                      className="rounded-none border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <ArchiveIcon className="mr-2 h-4 w-4" />
                      Archive
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="current" className="mt-8">
                    <CurrentIssueSection
                      journalId={id}
                    />
                  </TabsContent>

                  <TabsContent value="archive" className="mt-8">
                    <ArchiveSection
                      journalId={id}
                    />
                  </TabsContent>

                  <TabsContent value="about" className="mt-8 space-y-8">
                    {/* Description / Overview Section */}
                    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <Info className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">Journal Overview</h2>
                      </div>
                      <CollapsibleContent maxHeight={300} className="prose prose-slate max-w-none dark:prose-invert">
                        {journal.description || "Journal description is currently being updated. Please check back soon for more information about this publication."}
                      </CollapsibleContent>

                      {/* Publication Frequency — only if data exists */}
                      {journal.frequency && (
                        <div className="mt-8">
                          <div className="rounded-xl border bg-muted/40 p-5">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Calendar className="h-4 w-4 text-primary" />
                              </div>
                              <h4 className="font-semibold text-sm">Publication Frequency</h4>
                            </div>
                            <p className="text-muted-foreground text-sm">{journal.frequency}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Aims & Scope — inline, only if data exists in DB */}
                    {journal.aims_and_scope && (
                      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2.5 rounded-lg bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <h2 className="text-xl font-bold">Aims &amp; Scope</h2>
                        </div>
                        <CollapsibleContent maxHeight={300} className="prose prose-slate max-w-none dark:prose-invert">
                          <div
                            className="text-base leading-relaxed text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: safeAimsAndScope }}
                          />
                        </CollapsibleContent>
                      </div>
                    )}

                    {/* Technical Details Grid — only real data, no N/A fallbacks */}
                    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">Journal Details</h2>
                      </div>
                      <div className="grid gap-y-5 text-sm sm:grid-cols-2 sm:gap-x-8">
                        {([
                          journal.issn ? { label: "ISSN (Print)", value: journal.issn, icon: Database } : null,
                          journal.e_issn ? { label: "ISSN (Online)", value: journal.e_issn, icon: Globe } : null,
                          journal.publisher ? { label: "Publisher", value: journal.publisher, icon: Building } : null,
                          journal.frequency ? { label: "Frequency", value: journal.frequency, icon: Calendar } : null,
                        ] as const).filter((item): item is NonNullable<typeof item> => item !== null).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 -mx-3">
                            <div className="p-1.5 rounded-md bg-primary/10 mt-0.5">
                              <item.icon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs text-muted-foreground font-medium">
                                {item.label}
                              </span>
                              <span className="block font-semibold text-foreground truncate">
                                {item.value}
                              </span>
                            </div>
                          </div>
                        ))}
                        {/* Empty state when no details are available */}
                        {!journal.issn && !journal.e_issn && !journal.publisher && !journal.frequency && (
                          <p className="col-span-2 text-sm text-muted-foreground">Journal details are being updated.</p>
                        )}
                      </div>
                    </div>

                    {/* Editorial Board — incorporates local Editor in Chief fallback if needed */}
                    <EditorialBoardSection journalId={id} editorInChief={journal.editor_in_chief} />

                  </TabsContent>

                  <TabsContent value="author" className="mt-8 space-y-6">
                    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">Author Guidelines</h2>
                      </div>
                      <div className="space-y-6">
                        <Card className="border-border/60 bg-muted/30 shadow-none">
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="p-2.5 rounded-lg bg-primary/10">
                                <CreditCard className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-base mb-2">Article Processing Charge (APC)</h4>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  Upon acceptance, authors are required to pay an APC of ${journal.publication_fee || journal.submission_fee || 0} USD.
                                  This covers the cost of open access publishing, peer review, and article maintenance.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <CollapsibleContent maxHeight={300} className="prose prose-slate max-w-none dark:prose-invert text-sm leading-relaxed">
                          {journal.author_guidelines ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed overflow-hidden">
                              <div dangerouslySetInnerHTML={{ __html: safeAuthorGuidelines }} />

                              {directUrl && (
                                <div className="mt-8 pt-6 border-t border-border/60">
                                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold px-8 h-12 shadow-sm" asChild>
                                    <Link href={directUrl}>
                                      Submit Manuscript
                                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                    </Link>
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                              <p className="text-muted-foreground">Detailed author guidelines are being prepared for this journal.</p>
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
                {/* Quick Actions Card */}
                <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-5 pb-3 border-b border-border/60">Quick Actions</h3>
                  <div className="space-y-3">
                    {renderSubmitButton(
                      "w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90",
                      "default",
                      <>
                        <span className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Submit Now
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-between border-border/60 hover:bg-muted/50"
                      onClick={() => setActiveTab("author")}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Author Guidelines
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-border/60 hover:bg-muted/50"
                      onClick={() => setActiveTab("current")}
                    >
                      <span className="flex items-center gap-2">
                        <NewspaperIcon className="h-4 w-4" />
                        Current Issue
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-border/60 hover:bg-muted/50"
                      onClick={() => setActiveTab("archive")}
                    >
                      <span className="flex items-center gap-2">
                        <ArchiveIcon className="h-4 w-4" />
                        Archive
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Custom Blocks Carousel — from OJS Custom Block Manager plugin */}
                <CustomBlocksCarousel journalId={id} />

                {/* Journal Statistics Card */}
                {stats !== undefined && (
                  <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-5 pb-3 border-b border-border/60">Journal Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <span className="text-2xl font-bold text-primary">{stats.articles}</span>
                        <span className="text-xs text-muted-foreground mt-1 text-center">Published Articles</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <span className="text-2xl font-bold text-primary">{stats.issues}</span>
                        <span className="text-xs text-muted-foreground mt-1 text-center">Total Issues</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Card */}
                {(() => {
                  const journalWithEmail = journal as typeof journal & { contact_email?: string }
                  return (
                    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                      <h3 className="text-lg font-bold mb-5 pb-3 border-b border-border/60">Contact</h3>
                      <div className="space-y-4 text-sm">
                        {journalWithEmail.publisher && (
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-md bg-muted mt-0.5">
                              <Building className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="block text-xs text-muted-foreground">Publisher</span>
                              <span className="font-medium">{journalWithEmail.publisher}</span>
                            </div>
                          </div>
                        )}
                        {journalWithEmail.contact_email && (
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-md bg-muted mt-0.5">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="block text-xs text-muted-foreground">Contact Email</span>
                              <Link
                                href={`mailto:${journalWithEmail.contact_email}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {journalWithEmail.contact_email}
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* ISSN Display */}
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4">ISSN Information</h3>
                  <div className="space-y-3">
                    {journal.issn && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/40">
                        <span className="text-xs text-muted-foreground">Print ISSN</span>
                        <span className="font-mono font-semibold text-sm">{journal.issn}</span>
                      </div>
                    )}
                    {journal.e_issn && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/40">
                        <span className="text-xs text-muted-foreground">Online ISSN</span>
                        <span className="font-mono font-semibold text-sm">{journal.e_issn}</span>
                      </div>
                    )}
                    {!journal.issn && !journal.e_issn && (
                      <p className="text-sm text-muted-foreground">ISSN information coming soon</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}