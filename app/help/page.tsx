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

// Static visual config keyed by well-known category slugs.
// Unknown slugs fall back to FALLBACK_CONFIG.
const CATEGORY_CONFIG: Record<string, {
  Icon: LucideIcon
  iconBg: string
  iconText: string
  accentBar: string
  pillBg: string
  pillHover: string
  pillText: string
  numBg: string
  numText: string
}> = {
  "guide-for-authors": {
    Icon: BookOpen,
    iconBg: "bg-sky-500/10",
    iconText: "text-sky-500",
    accentBar: "bg-sky-500",
    pillBg: "bg-sky-500/10",
    pillHover: "hover:bg-sky-500/20",
    pillText: "text-sky-600 dark:text-sky-400",
    numBg: "bg-sky-500/10",
    numText: "text-sky-600 dark:text-sky-400",
  },
  "guide-for-reviewers": {
    Icon: Users2,
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-500",
    accentBar: "bg-emerald-500",
    pillBg: "bg-emerald-500/10",
    pillHover: "hover:bg-emerald-500/20",
    pillText: "text-emerald-600 dark:text-emerald-400",
    numBg: "bg-emerald-500/10",
    numText: "text-emerald-600 dark:text-emerald-400",
  },
  "publication-ethics": {
    Icon: Shield,
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-500",
    accentBar: "bg-violet-500",
    pillBg: "bg-violet-500/10",
    pillHover: "hover:bg-violet-500/20",
    pillText: "text-violet-600 dark:text-violet-400",
    numBg: "bg-violet-500/10",
    numText: "text-violet-600 dark:text-violet-400",
  },
  "faq": {
    Icon: HelpCircle,
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
    accentBar: "bg-amber-500",
    pillBg: "bg-amber-500/10",
    pillHover: "hover:bg-amber-500/20",
    pillText: "text-amber-600 dark:text-amber-400",
    numBg: "bg-amber-500/10",
    numText: "text-amber-600 dark:text-amber-400",
  },
}

const FALLBACK_CONFIG = {
  Icon: BookOpen,
  iconBg: "bg-primary/10",
  iconText: "text-primary",
  accentBar: "bg-primary",
  pillBg: "bg-primary/10",
  pillHover: "hover:bg-primary/20",
  pillText: "text-primary",
  numBg: "bg-primary/10",
  numText: "text-primary",
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CategoryCard({ category, topics, cfg }: {
  category: { id: string; slug: string; title: string }
  topics: { id: string; title: string; content: string }[]
  cfg: typeof FALLBACK_CONFIG
}) {
  return (
    <article
      id={category.slug}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      {/* Card header */}
      <header className="flex items-center gap-4 border-b border-border/40 px-6 py-5">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
          <cfg.Icon className={`h-5 w-5 ${cfg.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold leading-tight">{category.title}</h2>
          {topics.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {topics.length} {topics.length === 1 ? "topic" : "topics"}
            </p>
          )}
        </div>
        <div className={`h-8 w-1 flex-shrink-0 rounded-full ${cfg.accentBar}`} />
      </header>

      {/* Card body */}
      {topics.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.iconBg}`}>
            <cfg.Icon className={`h-6 w-6 ${cfg.iconText} opacity-50`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground/70">Content in preparation</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              This section is being developed. Please check back soon.
            </p>
          </div>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {topics.map((topic, idx) => (
            <AccordionItem
              key={topic.id}
              value={`topic-${topic.id}`}
              className="border-border/40"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                <span className="flex items-center gap-3 text-sm font-medium text-left">
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none ${cfg.numBg} ${cfg.numText}`}>
                    {idx + 1}
                  </span>
                  {topic.title}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 pt-0">
                <div className="ml-9 border-l-2 border-border/50 pl-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
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

function SkeletonLoader() {
  return (
    <div className="space-y-8">
      {[1, 2].map((n) => (
        <div key={n} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex items-center gap-4 border-b border-border/40 px-6 py-5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4">
                <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/10 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
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
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Search className="h-8 w-8 text-muted-foreground/50" />
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
  const activeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories])

  // Re-apply hash scroll after async category data has landed so footer
  // deep-links (/help#guide-for-authors, etc.) resolve correctly.
  useEffect(() => {
    if (isCategoriesLoading) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [isCategoriesLoading, activeCategories.length])

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return activeCategories
    const query = searchTerm.toLowerCase()
    return activeCategories
      .map((cat: any) => ({
        ...cat,
        topics: (cat.topics || []).filter(
          (t: any) =>
            t.is_active &&
            (t.title.toLowerCase().includes(query) ||
              t.content.toLowerCase().includes(query))
        ),
      }))
      .filter((cat: any) => cat.topics.length > 0)
  }, [activeCategories, searchTerm])

  const displayCategories: any[] = searchTerm.trim() ? filteredCategories : activeCategories

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

                {/* Category nav pills — hidden during search */}
                {!isCategoriesLoading && activeCategories.length > 0 && !searchTerm && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {activeCategories.map((cat: any) => {
                      const cfg = CATEGORY_CONFIG[cat.slug] ?? FALLBACK_CONFIG
                      return (
                        <button
                          key={cat.slug}
                          onClick={() => {
                            const el = document.getElementById(cat.slug)
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${cfg.pillBg} ${cfg.pillHover} ${cfg.pillText}`}
                        >
                          <cfg.Icon className="h-3.5 w-3.5" />
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
              <div className="mx-auto max-w-3xl space-y-6">
                {isCategoriesLoading ? (
                  <SkeletonLoader />
                ) : activeCategories.length === 0 ? (
                  <EmptyState />
                ) : filteredCategories.length === 0 && searchTerm ? (
                  <NoResults query={searchTerm} onClear={() => setSearchTerm("")} />
                ) : (
                  displayCategories.map((category: any) => {
                    const cfg = CATEGORY_CONFIG[category.slug] ?? FALLBACK_CONFIG
                    const topics = searchTerm
                      ? category.topics || []
                      : (category.topics || []).filter((t: any) => t.is_active)
                    return (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        topics={topics}
                        cfg={cfg}
                      />
                    )
                  })
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
