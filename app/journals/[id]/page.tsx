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
  Building,
  Mail,
  ArrowRight,
  Database,
  Calendar,
  Scale,
  Target,
  Telescope,
  Archive as ArchiveIcon,
  Newspaper as NewspaperIcon
} from "lucide-react"

import DOMPurify from "dompurify"

import { useGetJournal, useGetJournalStats, useJournalId, useGetJournalFees, useGetJournalAboutContent } from "@/src/features/journals"
import { parseAimsAndScope } from "@/src/features/journals/utils/aims-scope-parser"

import { Navbar } from "@/components/navbar"
import CollapsibleContent from "@/components/ui/collapsible-content"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JournalError } from "@/components/errors/error-states"
import { JournalNotFound } from "@/components/states/not-found-states"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JournalDetailSkeleton } from "@/components/skeletons/journal-detail-skeleton"

import { CurrentIssueSection } from "./components/current-issue-section"
import { ArchiveSection } from "./components/archive-section"
import { EditorialBoardSection } from "./components/editorial-board-section"
import { AdvisoryBoardSection } from "./components/advisory-board-section"
import { JournalInfoCarousel } from "./components/journal-info-carousel"
import { JournalPoliciesSection } from "./components/journal-policies-section"

export default function JournalDetailPage() {
  const id = useJournalId()
  const [activeTab, setActiveTab] = useState("about")

  const { data: journal, isLoading, error } = useGetJournal(id)
  const { data: stats } = useGetJournalStats(id)
  const { data: ojsFees } = useGetJournalFees(id)
  const { data: ojsAbout } = useGetJournalAboutContent(id)

  const sanitizeContent = (html: string | null | undefined): string => {
    if (!html) return ""
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
      ALLOWED_ATTR: [],
    })
  }

  // Richer sanitizer for OJS-sourced fee content, which may include tables,
  // links and inline formatting. The server already runs a strict sanitize
  // pass — this is defense in depth for the browser-side render.
  const sanitizeRichContent = (html: string | null | undefined): string => {
    if (!html) return ""
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a',
        'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'span', 'div',
        'table', 'tbody', 'tr', 'td', 'th', 'thead', 'hr',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
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

  // Aims & Scope resolution:
  //   - When OJS has any content, trust its decision in full. The service
  //     already decided whether to split (extraction from About prose) or to
  //     render as one unified block (dedicated `aims-scope` nav item / static
  //     page authored by an admin). Do not second-guess it locally.
  //   - Only fall back to splitting the local structured `aims_and_scope`
  //     field when OJS returned nothing at all.
  const hasOjs = !!(ojsAbout && (ojsAbout.aims || ojsAbout.scope || ojsAbout.combined))
  const localParts = hasOjs ? null : parseAimsAndScope(journal.aims_and_scope)

  const chosenAims = hasOjs ? ojsAbout?.aims ?? null : localParts?.aims ?? null
  const chosenScope = hasOjs ? ojsAbout?.scope ?? null : localParts?.scope ?? null
  const chosenCombined = hasOjs ? ojsAbout?.combined ?? null : localParts?.combined ?? null

  const safeAims = chosenAims ? sanitizeRichContent(chosenAims) : null
  const safeScope = chosenScope ? sanitizeRichContent(chosenScope) : null
  const safeAimsAndScopeCombined = chosenCombined ? sanitizeRichContent(chosenCombined) : null
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
                  <TabsList className="inline-flex h-auto w-full justify-start gap-1 bg-transparent p-0 border-b border-border rounded-none overflow-x-auto">
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
                    <TabsTrigger
                      value="policies"
                      className="rounded-none border-b-2 border-transparent px-4 py-4 text-sm font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      <Scale className="mr-2 h-4 w-4" />
                      Policies
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

                  <TabsContent value="policies" className="mt-8">
                    <JournalPoliciesSection journalId={id} />
                  </TabsContent>

                  <TabsContent value="about" className="mt-8 space-y-10">
                    {/* 1. Journal Overview & Aims */}
                    <div className="space-y-8">
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

                      {/* Aims & Scope — split into two branded cards when OJS content has
                          distinct headings; fall back to a single combined card otherwise. */}
                      {safeAims && safeScope ? (
                        <div className="grid gap-5 md:grid-cols-2">
                          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-6 sm:p-7 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
                            <div className="relative flex items-center gap-3 mb-5">
                              <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                                <Target className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">Purpose</p>
                                <h2 className="text-lg font-bold leading-tight">Aims of the Journal</h2>
                              </div>
                            </div>
                            <CollapsibleContent maxHeight={260} className="prose prose-slate max-w-none dark:prose-invert relative">
                              <div
                                className="text-[15px] leading-relaxed text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: safeAims }}
                              />
                            </CollapsibleContent>
                          </div>

                          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-6 sm:p-7 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
                            <div className="relative flex items-center gap-3 mb-5">
                              <div className="p-2.5 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                                <Telescope className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">Coverage</p>
                                <h2 className="text-lg font-bold leading-tight">Scope of the Journal</h2>
                              </div>
                            </div>
                            <CollapsibleContent maxHeight={260} className="prose prose-slate max-w-none dark:prose-invert relative">
                              <div
                                className="text-[15px] leading-relaxed text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: safeScope }}
                              />
                            </CollapsibleContent>
                          </div>
                        </div>
                      ) : safeAimsAndScopeCombined ? (
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
                              dangerouslySetInnerHTML={{ __html: safeAimsAndScopeCombined }}
                            />
                          </CollapsibleContent>
                        </div>
                      ) : null}
                    </div>

                    {/* 2. Advisory Board */}
                    <AdvisoryBoardSection journalId={id} />


                    {/* 3. Editorial Board */}
                    <div className="pt-2 border-t border-border/30">
                      <EditorialBoardSection journalId={id} editorInChief={journal.editor_in_chief} />
                    </div>


                    {/* 4. Technical Details Grid — only real data, no N/A fallbacks */}
                    <div className="pt-2 border-t border-border/30">
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
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 -mx-3 border border-border/40 hover:border-border/80 transition-colors">
                              <div className="p-2 rounded-md bg-background shadow-xs mt-0.5 border border-border/50">
                                <item.icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0 py-0.5">
                                <span className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                  {item.label}
                                </span>
                                <span className="block font-medium text-foreground truncate text-sm">
                                  {item.value}
                                </span>
                              </div>
                            </div>
                          ))}
                          {/* Empty state when no details are available */}
                          {!journal.issn && !journal.e_issn && !journal.publisher && !journal.frequency && (
                            <p className="col-span-2 text-sm text-muted-foreground italic">Additional journal details are currently being updated.</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </TabsContent>

                  <TabsContent value="author" className="mt-8 space-y-6">
                    {/* Publication Fees — prefer OJS custom page content, fall back to structured fees */}
                    {(() => {
                      const ojsHtml = ojsFees?.html ?? null
                      const ojsPubFee = ojsFees?.publicationFee ?? null
                      const ojsSubFee = ojsFees?.submissionFee ?? null
                      // Prefer positive OJS values, otherwise use local Prisma cache.
                      const publicationFee = (ojsPubFee && ojsPubFee > 0) ? ojsPubFee : Number(journal.publication_fee ?? 0)
                      const submissionFee = (ojsSubFee && ojsSubFee > 0) ? ojsSubFee : Number(journal.submission_fee ?? 0)
                      const currency = (ojsFees?.currencyCode || "USD").toUpperCase()
                      const safeOjsHtml = ojsHtml ? sanitizeRichContent(ojsHtml) : ""
                      const hasRichContent = safeOjsHtml.length > 0
                      const anyStructuredFee = publicationFee > 0 || submissionFee > 0
                      const fmt = (n: number) => {
                        try {
                          return new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency,
                            minimumFractionDigits: n % 1 === 0 ? 0 : 2,
                            maximumFractionDigits: 2,
                          }).format(n)
                        } catch {
                          // Fallback if currency code is invalid/unknown
                          return `${n.toFixed(n % 1 === 0 ? 0 : 2)} ${currency}`
                        }
                      }

                      return (
                        <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-lg bg-primary/10">
                              <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold">Publication Fees</h2>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Sourced directly from the journal settings on SubmitManager
                              </p>
                            </div>
                          </div>

                          {hasRichContent ? (
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary prose-table:text-sm"
                              dangerouslySetInnerHTML={{ __html: safeOjsHtml }}
                            />
                          ) : anyStructuredFee ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {publicationFee > 0 && (
                                <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-2">
                                    Publication Fee
                                  </p>
                                  <p className="text-3xl font-extrabold tracking-tight">{fmt(publicationFee)}</p>
                                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                    Charged on acceptance. Covers peer-review, copyediting, typesetting, DOI, and long-term open-access hosting.
                                  </p>
                                </div>
                              )}
                              {submissionFee > 0 && (
                                <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-2">
                                    Submission Fee
                                  </p>
                                  <p className="text-3xl font-extrabold tracking-tight">{fmt(submissionFee)}</p>
                                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                    Charged at submission. Covers initial editorial handling and plagiarism screening.
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                              <p className="text-sm font-semibold">Fee details are published on SubmitManager.</p>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                The authoritative fee schedule lives on the journal&rsquo;s SubmitManager page. Open the
                                journal website to view current charges.
                              </p>
                              {directUrl && (
                                <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                                  <Link href={directUrl}>
                                    Open SubmitManager
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Author Guidelines — from OJS journal_settings.authorGuidelines */}
                    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold">Author Guidelines</h2>
                      </div>
                      <CollapsibleContent maxHeight={420} className="prose prose-slate max-w-none dark:prose-invert text-sm leading-relaxed">
                        {journal.author_guidelines ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed overflow-hidden">
                            <div dangerouslySetInnerHTML={{ __html: safeAuthorGuidelines }} />
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                            <p className="text-muted-foreground">Detailed author guidelines are being prepared for this journal.</p>
                          </div>
                        )}
                      </CollapsibleContent>

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

                {/* Journal highlights and Custom Blocks from OJS */}
                <JournalInfoCarousel journalId={id} />

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