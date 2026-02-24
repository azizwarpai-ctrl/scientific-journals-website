"use client"

import { use } from "react";
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
} from "lucide-react";

import { useGetJournal, useJournalId } from "@/src/features/journals"

import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card"

export default function JournalDetailPage() {
  const id = useJournalId()

  const { data: journal, isLoading, error } = useGetJournal(id)

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto py-12 px-4">
            <Skeleton className="h-[400px] w-full rounded-xl mb-12" />
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !journal) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Journal Not Found</h1>
            <p className="text-muted-foreground mb-8">
              {error?.message || "The journal you are looking for does not exist or has been removed."}
            </p>
            <Button asChild>
              <Link href="/journals">Back to Journals</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-slate-900 py-16 text-white md:py-24">
          <div className="absolute inset-0 z-0">
            <Image
              src={journal.cover_image_url || "/images/imegjournal.jpg"}
              alt={journal.title}
              fill
              className="object-cover opacity-20 blur-sm"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:items-center">
              <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-lg shadow-2xl md:mx-0">
                <Image
                  src={journal.cover_image_url || "/images/logodigitopub.png"}
                  alt={journal.title}
                  width={400}
                  height={560}
                  className="h-auto w-full object-cover"
                />
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
                    {journal.field}
                  </span>
                  <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                    {journal.issn || journal.e_issn || "ISSN N/A"}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl text-balance leading-tight">
                  {journal.title}
                </h1>
                <p className="max-w-xl text-lg text-slate-300 leading-relaxed text-pretty">
                  {journal.description || "A premier peer-reviewed journal dedicated to advancing research in its field."}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20" asChild>
                    <Link href={`#`}>Submit Manuscript</Link>
                  </Button>
                  {journal.website_url && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/20 px-8 text-white hover:bg-white/10"
                      asChild
                    >
                      <Link href={journal.website_url} target="_blank">
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
                <Tabs defaultValue="about" className="space-y-8">
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
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <div className="flex items-center gap-2 text-primary font-bold mb-4">
                        <Info className="h-5 w-5" />
                        <h2>Journal Information</h2>
                      </div>
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        {journal.description || "No description available."}
                      </p>

                      <div className="mt-8 grid gap-6 sm:grid-cols-2">
                        <div className="rounded-xl border bg-slate-50 p-6 dark:bg-slate-900/50">
                          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <h4 className="mb-2 font-bold">Frequency</h4>
                          <p className="text-sm text-muted-foreground">{journal.frequency || "Periodic"}</p>
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
                          { label: "ISSN (Print)", value: journal.issn || "N/A" },
                          { label: "ISSN (Online)", value: journal.e_issn || "N/A" },
                          { label: "Publisher", value: journal.publisher || "dis Scientific" },
                          { label: "Language", value: "English" },
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
                    <Button variant="outline" className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white" asChild>
                      <Link href={`#`}>
                        Submit Now <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white" asChild>
                      <Link href="#">
                        Guidelines <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-between bg-white/5 border-white/10 hover:bg-white/10 text-white" asChild>
                      <Link href="#">
                        Editorial Board <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
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
