"use client"

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Info,
  Calendar,
  FileText,
  Clock,
  Shield,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Globe,
  Send,
  User,
  Building,
} from "lucide-react";


import { useGetJournal, useJournalId } from "@/src/features/journals"

import { JournalDetailSkeleton } from "@/components/skeletons/journal-detail-skeleton";
import { JournalError } from "@/components/errors/error-states";
import { JournalNotFound } from "@/components/states/not-found-states";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card"

export default function JournalDetailPage() {
  const id = useJournalId()
  const [activeTab, setActiveTab] = useState("about")


  const { data: journal, isLoading, error } = useGetJournal(id)

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

  // Remove the old /api/ojs/sso/redirect local jump. Build pure URLs via direct reference or stateless form submit.
  const ojsBaseUrl = process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://submitmanager.com"
  const ojsDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
  const directUrl = journal.ojs_path ? `${ojsDomain}/index.php/${journal.ojs_path}/submission/wizard` : null
  
  const BUTTON_FROSTED_STYLE = "rounded-full border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white backdrop-blur-sm transition-colors"

  const renderSubmitButton = (buttonClass: string = "", variant: "default" | "outline" = "default", children: React.ReactNode) => {
    if (!directUrl || !journal.ojs_path) return null;

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
        {/* Hero Section — Compact: Cover + Title + Metadata + Actions */}
        <section className="relative overflow-hidden bg-slate-900 py-12 text-white md:py-16">
          <div className="absolute inset-0 z-0">
            {journal.cover_image_url && (
              <Image
                src={journal.cover_image_url}
                alt=""
                fill
                className="object-cover opacity-10 blur-md"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/70" />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
              {/* Cover Image — Fixed size, not dominant */}
              <div className="mx-auto w-48 flex-shrink-0 overflow-hidden rounded-lg shadow-2xl md:mx-0 md:w-56">
                <Image
                  src={journal.cover_image_url || "/images/logodigitopub.png"}
                  alt={journal.title}
                  width={224}
                  height={312}
                  className="h-auto w-full object-cover"
                />
              </div>

              {/* Title + Metadata Badges + Actions */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
                    {journal.field}
                  </span>
                  <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                    {journal.issn || journal.e_issn || "ISSN Currently unavailable"}
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl text-balance leading-tight">
                  {journal.title}
                </h1>

                {/* Compact metadata row */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                  {journal.publisher && (
                    <span className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 opacity-70" /> {journal.publisher}
                    </span>
                  )}
                  {journal.editor_in_chief && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 opacity-70" /> {journal.editor_in_chief}
                    </span>
                  )}
                  {journal.frequency && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 opacity-70" /> {journal.frequency}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {renderSubmitButton(
                    "rounded-full px-8 shadow-lg shadow-primary/20",
                    "default",
                    <><Send className="mr-2 h-4 w-4" /> Submit Manuscript</>
                  )}
                  {journal.website_url && (
                    <Button
                      size="lg"
                      variant="outline"
                      className={BUTTON_FROSTED_STYLE}
                      asChild
                    >
                      <Link href={journal.website_url} target="_blank" rel="noopener noreferrer">
                        Official Website <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 md:py-20 lg:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                  <TabsList className="inline-flex h-auto w-full justify-start gap-4 bg-transparent p-0 border-b">
                    <TabsTrigger
                      value="about"
                      className="rounded-none border-b-2 border-transparent px-2 py-3 text-base font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      About Journal
                    </TabsTrigger>
                    <TabsTrigger
                      value="scope"
                      className="rounded-none border-b-2 border-transparent px-2 py-3 text-base font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      Aims & Scope
                    </TabsTrigger>
                    <TabsTrigger
                      value="author"
                      className="rounded-none border-b-2 border-transparent px-2 py-3 text-base font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    >
                      Author Guidelines
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="space-y-12">
                    {/* Full description — Only shown here, not in the hero */}
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <div className="flex items-center gap-2 text-primary font-bold mb-4">
                        <Info className="h-5 w-5" />
                        <h2>Journal Information</h2>
                      </div>
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        {journal.description || "Currently unavailable"}
                      </p>

                      <div className="mt-8 grid gap-6 sm:grid-cols-2">
                        <div className="rounded-xl border bg-slate-50 p-6 dark:bg-slate-900/50">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="mb-2 font-bold">Frequency</h4>
                          <p className="text-sm text-muted-foreground">{journal.frequency || "Currently unavailable"}</p>
                        </div>
                        <div className="rounded-xl border bg-slate-50 p-6 dark:bg-slate-900/50">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Clock className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="mb-2 font-bold">Publication Speed</h4>
                          <p className="text-sm text-muted-foreground">Peer-review process usually takes 2-3 months.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-muted/30 p-8">
                      <div className="mb-6 flex items-center gap-2 text-primary font-bold">
                        <FileText className="h-5 w-5" />
                        <h2>Journal Details</h2>
                      </div>
                      <div className="grid gap-y-4 text-sm sm:grid-cols-2 sm:gap-x-12">
                        {[
                          { label: "ISSN (Print)", value: journal.issn || "Currently unavailable" },
                          { label: "ISSN (Online)", value: journal.e_issn || "Currently unavailable" },
                          { label: "Publisher", value: journal.publisher || "Currently unavailable" },
                          { label: "Editor-in-Chief", value: journal.editor_in_chief || "Currently unavailable" },
                          { label: "Open Access", value: "Yes" },
                          { label: "Peer Review", value: "Double-blind" },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between border-b pb-2 sm:block sm:border-0 sm:pb-0">
                            <span className="font-semibold text-slate-600 dark:text-slate-400 sm:block sm:mb-1">
                              {item.label}
                            </span>
                            <span className="font-bold sm:text-base">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="scope" className="space-y-6">
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <div className="flex items-center gap-2 text-primary font-bold mb-4">
                        <BookOpen className="h-5 w-5" />
                        <h2>Aims & Scope</h2>
                      </div>
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        Our goal is to publish high-quality original research, reviews, and case studies that contribute
                        to the understanding and practice of {journal.field} worldwide.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="author" className="space-y-8">
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <div className="flex items-center gap-2 text-primary font-bold mb-4">
                        <Shield className="h-5 w-5" />
                        <h2>Policies</h2>
                      </div>
                      <div className="grid gap-6">
                        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="rounded-full bg-primary/10 p-2 mt-1">
                                <CreditCard className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="mb-2 font-bold text-lg">Article Processing Charge (APC)</h4>
                                <p className="text-muted-foreground">
                                  Upon acceptance, authors are required to pay an APC of ${journal.publication_fee || journal.submission_fee || 0} USD.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-8">
                {/* Sidebar Cards */}
                <div className="rounded-2xl border bg-slate-950 p-8 text-white shadow-xl shadow-slate-200 dark:shadow-none">
                  <h3 className="mb-6 text-xl font-bold border-b border-white/10 pb-4">Quick Actions</h3>
                  <div className="space-y-4">
                    {renderSubmitButton(
                      "w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white",
                      "outline",
                      <>Submit Now <ChevronRight className="h-4 w-4" /></>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      onClick={() => setActiveTab("author")}
                    >
                        Guidelines <ChevronRight className="h-4 w-4" />
                    </Button>
                    {journal.website_url && (
                      <Button variant="outline" className={`w-full justify-between ${BUTTON_FROSTED_STYLE}`} asChild>
                        <Link href={journal.website_url} target="_blank" rel="noopener noreferrer">
                          Visit Journal <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-8 dark:bg-slate-900/50">
                  <h3 className="mb-6 text-xl font-bold border-b pb-4">Social Presence</h3>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="#"
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-110 active:scale-95 dark:bg-slate-800"
                    >
                      <Globe className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </Link>
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
