"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  BookOpen,
  Users2,
  Shield,
  HelpCircle,
  Search,
  Mail,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { useState, useMemo, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

import { useGetHelpCategories } from "@/src/features/help/api/use-help-categories"
import { useGetHelpContent } from "@/src/features/help/api/use-get-help-content"
import { defaultHelpContent } from "@/src/features/help/schemas/help-schema"

// Icon mapping per well-known category slug. Visuals otherwise stay aligned
// with the platform's primary-themed design language — no per-category colors.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "guide-for-authors": BookOpen,
  "guide-for-reviewers": Users2,
  "publication-ethics": Shield,
  "faq": HelpCircle,
}

const GUIDE_SLUGS = new Set(["guide-for-authors", "guide-for-reviewers"])
const ACCORDION_SLUGS = new Set(["faq"])

type Category = {
  id: string
  slug: string
  title: string
  topics?: Array<{ id: string; title: string; content: string; is_active?: boolean }>
}

type Topic = { id: string; title: string; content: string }

// ─── Sub-components ──────────────────────────────────────────────────────────

function CardHeader({ Icon, title, topicCount }: {
  Icon: LucideIcon
  title: string
  topicCount: number
}) {
  return (
    <header className="flex items-center gap-3 border-b border-border/40 px-6 py-5">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold leading-tight tracking-tight">{title}</h2>
        {topicCount > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {topicCount} {topicCount === 1 ? "topic" : "topics"}
          </p>
        )}
      </div>
    </header>
  )
}

function EmptyBody({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary/50" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground/70">Content in preparation</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          This section is being developed. Please check back soon.
        </p>
      </div>
    </div>
  )
}

/**
 * Guide-style card: each topic rendered inline as a numbered section, so the
 * card reads as one cohesive document rather than a stack of foldable panels.
 */
function GuideCard({ category, topics }: { category: Category; topics: Topic[] }) {
  const Icon = CATEGORY_ICONS[category.slug] ?? BookOpen
  return (
    <article
      id={category.slug}
      className="scroll-mt-24 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <CardHeader Icon={Icon} title={category.title} topicCount={topics.length} />
      {topics.length === 0 ? (
        <EmptyBody Icon={Icon} />
      ) : (
        <div className="flex-1 divide-y divide-border/40">
          {topics.map((topic, idx) => (
            <section key={topic.id} className="px-6 py-5">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-bold tracking-wider text-primary">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-semibold leading-snug">{topic.title}</h3>
              </div>
              <p className="mt-2 pl-8 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {topic.content}
              </p>
            </section>
          ))}
        </div>
      )}
    </article>
  )
}

/**
 * FAQ-style card: accordion is the natural format for Q&A, kept for FAQ only.
 */
function AccordionCard({ category, topics }: { category: Category; topics: Topic[] }) {
  const Icon = CATEGORY_ICONS[category.slug] ?? HelpCircle
  return (
    <article
      id={category.slug}
      className="scroll-mt-24 flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <CardHeader Icon={Icon} title={category.title} topicCount={topics.length} />
      {topics.length === 0 ? (
        <EmptyBody Icon={Icon} />
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {topics.map((topic) => (
            <AccordionItem key={topic.id} value={`topic-${topic.id}`} className="border-border/40">
              <AccordionTrigger className="px-6 py-4 text-sm font-medium hover:no-underline hover:bg-muted/30 transition-colors">
                {topic.title}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 pt-0">
                <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {topic.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </article>
  )
}

function CategoryCard({ category, topics }: { category: Category; topics: Topic[] }) {
  return ACCORDION_SLUGS.has(category.slug)
    ? <AccordionCard category={category} topics={topics} />
    : <GuideCard category={category} topics={topics} />
}

function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((n) => (
          <div key={n} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/40 px-6 py-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 px-6 py-5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-8 w-8 text-primary/60" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No help content yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
          Please check back later, or contact our support team if you need immediate assistance.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/contact">
          <Mail className="mr-2 h-4 w-4" />
          Contact Support
        </Link>
      </Button>
    </div>
  )
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Search className="h-8 w-8 text-primary/60" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No results for &ldquo;{query}&rdquo;</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try different keywords or browse all sections below.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear search
      </Button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { data: categories, isLoading: isCategoriesLoading } = useGetHelpCategories()
  const { data: helpResponse, isLoading: isHelpLoading } = useGetHelpContent()
  const [searchTerm, setSearchTerm] = useState("")

  const content = helpResponse || defaultHelpContent
  const activeCategories = useMemo<Category[]>(
    () => (Array.isArray(categories) ? (categories as Category[]) : []),
    [categories]
  )

  // Re-apply hash scroll after async category data has landed so footer
  // deep-links (/help#guide-for-authors, etc.) resolve correctly.
  useEffect(() => {
    if (isCategoriesLoading) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [isCategoriesLoading, activeCategories.length])

  const filteredCategories = useMemo<Category[]>(() => {
    if (!searchTerm.trim()) return activeCategories
    const query = searchTerm.toLowerCase()
    return activeCategories
      .map((cat) => ({
        ...cat,
        topics: (cat.topics || []).filter(
          (t) =>
            t.is_active !== false &&
            (t.title.toLowerCase().includes(query) ||
              t.content.toLowerCase().includes(query))
        ),
      }))
      .filter((cat) => (cat.topics || []).length > 0)
  }, [activeCategories, searchTerm])

  const displayCategories: Category[] = searchTerm.trim() ? filteredCategories : activeCategories

  const topicsFor = (category: Category): Topic[] =>
    searchTerm
      ? (category.topics || []) as Topic[]
      : ((category.topics || []).filter((t) => t.is_active !== false) as Topic[])

  // Partition: guides render side-by-side; everything else stacks full-width.
  const guideCards = displayCategories.filter((c) => GUIDE_SLUGS.has(c.slug))
  const otherCards = displayCategories.filter((c) => !GUIDE_SLUGS.has(c.slug))

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ── */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/40 via-background to-background">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              aria-hidden
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 15%, color-mix(in oklab, var(--color-primary) 14%, transparent) 0%, transparent 45%), radial-gradient(circle at 80% 25%, color-mix(in oklab, var(--color-primary) 10%, transparent) 0%, transparent 45%)",
              }}
            />

            <div className="container relative mx-auto px-4 pb-14 pt-20 md:pb-20 md:pt-28 md:px-6">
              <div className="mx-auto max-w-2xl text-center">
                {isHelpLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="mx-auto h-10 w-56" />
                    <Skeleton className="mx-auto h-5 w-80" />
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary/80">
                      Help Centre
                    </p>
                    <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                      {content.heroTitle}
                    </h1>
                    <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                      {content.heroSubtitle}
                    </p>
                  </>
                )}

                {/* Search */}
                <div className="relative mt-8">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search guides, topics, questions…"
                    className="h-12 rounded-xl border-border/60 bg-background pl-11 pr-4 text-sm shadow-sm focus-visible:ring-primary/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Category nav pills — unified primary styling, hidden during search */}
                {!isCategoriesLoading && activeCategories.length > 0 && !searchTerm && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {activeCategories.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.slug] ?? BookOpen
                      return (
                        <button
                          key={cat.slug}
                          onClick={() => {
                            const el = document.getElementById(cat.slug)
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {cat.title}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* ── Categories ── */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <GSAPWrapper animation="slideUp" delay={0.15}>
              <div className="mx-auto max-w-5xl space-y-6">
                {isCategoriesLoading ? (
                  <SkeletonLoader />
                ) : activeCategories.length === 0 ? (
                  <EmptyState />
                ) : filteredCategories.length === 0 && searchTerm ? (
                  <NoResults query={searchTerm} onClear={() => setSearchTerm("")} />
                ) : (
                  <>
                    {guideCards.length > 0 && (
                      <div className="grid gap-6 md:grid-cols-2">
                        {guideCards.map((category) => (
                          <CategoryCard
                            key={category.id}
                            category={category}
                            topics={topicsFor(category)}
                          />
                        ))}
                      </div>
                    )}
                    {otherCards.length > 0 && (
                      <div className="space-y-6">
                        {otherCards.map((category) => (
                          <CategoryCard
                            key={category.id}
                            category={category}
                            topics={topicsFor(category)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </GSAPWrapper>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
