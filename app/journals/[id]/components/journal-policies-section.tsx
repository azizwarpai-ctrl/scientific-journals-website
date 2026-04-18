"use client"

import { useEffect, useRef, useState } from "react"
import DOMPurify, { type Config } from "dompurify"
import { Shield, AlertCircle, FileText } from "lucide-react"
import { useGetJournalPolicies } from "@/src/features/journals/api/use-get-journal-policies"

interface JournalPoliciesSectionProps {
  journalId: string
}

const SAFE_HTML_OPTIONS: Config = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "h5", "blockquote", "span", "div",
    "table", "tbody", "tr", "td", "th", "thead", "img",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style", "src", "alt", "width", "height"],
}

function sanitize(html: string | null | undefined): string {
  if (!html) return ""
  // Fail closed on the server — policy HTML is already sanitized server-side by
  // journal-policies-service.ts; returning raw HTML here could expose it in SSR output.
  if (typeof window === "undefined") return ""
  return DOMPurify.sanitize(html, SAFE_HTML_OPTIONS)
}

function PolicyContent({
  html,
  plainDescription,
}: {
  html: string | null
  plainDescription?: string
}) {
  if (!html && plainDescription) {
    return (
      <div className="flex items-start gap-3 text-muted-foreground py-4">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground/50" />
        <p className="text-sm leading-relaxed">{plainDescription}</p>
      </div>
    )
  }

  const safe = sanitize(html)

  return (
    <div
      className="prose prose-sm md:prose-base dark:prose-invert max-w-[72ch] text-foreground/85 prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:w-full prose-table:border-collapse prose-td:border prose-td:border-border/50 prose-td:p-2.5 prose-th:border prose-th:border-border/50 prose-th:p-2.5 prose-th:bg-muted/40 prose-th:font-semibold prose-img:rounded-lg prose-img:shadow-sm prose-blockquote:border-l-primary/40 prose-blockquote:bg-muted/20 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-li:marker:text-primary/60 prose-ul:space-y-1 prose-ol:space-y-1"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function JournalPoliciesSection({ journalId }: JournalPoliciesSectionProps) {
  const [activeTabSlug, setActiveTabSlug] = useState<string | null>(null)
  const { data: policies, isLoading, isError } = useGetJournalPolicies(journalId)

  const tabStripRef = useRef<HTMLDivElement | null>(null)
  const activeButtonRef = useRef<HTMLButtonElement | null>(null)

  const tabs = policies?.tabs || []

  const defaultTabSlug = tabs.length > 0 ? tabs[0].slug : null
  const currentTabSlug = activeTabSlug || defaultTabSlug

  // Keep the active tab in view on narrow viewports when switching via keyboard
  // or when the selected tab lives off-screen in the horizontal strip.
  useEffect(() => {
    if (!activeButtonRef.current || !tabStripRef.current) return
    activeButtonRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [currentTabSlug])

  if (!isLoading && !isError && tabs.length === 0) {
    return null
  }

  const navItems = tabs.map((t) => ({ id: t.slug, title: t.title, content: t.content }))
  const activeItem = navItems.find((t) => t.id === currentTabSlug) ?? navItems[0]

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Shared header */}
      <header className="flex items-center gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-border/40 bg-muted/10">
        <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 shrink-0">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold leading-tight">
            Journal Policies
          </h2>
          <p className="hidden sm:block text-[11px] lg:text-xs text-muted-foreground font-medium mt-0.5">
            Editorial standards, ethics, and submission guidelines
          </p>
        </div>
      </header>

      {/* Horizontal tab strip — shown below the lg breakpoint where a sidebar
         would crowd the reading area. Scrollable on overflow so long titles
         never force wrapping. */}
      <div
        ref={tabStripRef}
        role="tablist"
        aria-label="Journal policy sections"
        className="lg:hidden border-b border-border/40 overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
      >
        {isLoading ? (
          <div className="flex gap-2 px-4 py-3 animate-pulse">
            <div className="h-8 w-28 bg-muted rounded-full" />
            <div className="h-8 w-36 bg-muted rounded-full" />
            <div className="h-8 w-24 bg-muted rounded-full" />
          </div>
        ) : isError ? (
          <div className="px-4 py-3 text-sm text-destructive font-medium">
            Failed to load policies.
          </div>
        ) : (
          <div className="flex min-w-max gap-1 px-3 py-2">
            {navItems.map((item) => {
              const isActive = currentTabSlug === item.id
              return (
                <button
                  key={item.id}
                  ref={isActive ? activeButtonRef : null}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTabSlug(item.id)}
                  className={[
                    "inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  ].join(" ")}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {item.title}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop (lg+) sidebar + content, otherwise full-width content */}
      <div className="flex flex-col lg:flex-row">
        {/* Compact sidebar — narrower than before (w-60, ~240px) so the
           reading column gets the horizontal space it deserves. Sticky so
           navigation stays visible while reading long policies. */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-border/40 bg-muted/10">
          <nav
            role="tablist"
            aria-label="Journal policy sections"
            className="sticky top-4 p-3 space-y-1 max-h-[calc(100vh-2rem)] overflow-y-auto"
          >
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-10 bg-muted rounded-lg" />
                <div className="h-10 bg-muted rounded-lg" />
                <div className="h-10 bg-muted rounded-lg w-3/4" />
              </div>
            ) : isError ? (
              <div className="text-sm text-destructive p-3 rounded-lg bg-destructive/10 font-medium">
                Error loading policies.
              </div>
            ) : (
              navItems.map((item) => {
                const isActive = currentTabSlug === item.id
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTabSlug(item.id)}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium",
                    ].join(" ")}
                  >
                    <FileText
                      className={[
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground/70",
                      ].join(" ")}
                    />
                    <span className="leading-snug">{item.title}</span>
                  </button>
                )
              })
            )}
          </nav>
        </aside>

        {/* Content — fills the remaining width, with a comfortable reading
           measure applied inside the prose block instead of via an outer
           `max-w` that wastes space on wide screens. */}
        <article
          role="tabpanel"
          aria-labelledby={activeItem?.id}
          className="flex-1 min-w-0 px-5 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-10"
        >
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-7 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-11/12" />
              <div className="h-4 bg-muted rounded w-10/12" />
              <div className="h-4 bg-muted rounded w-9/12" />
            </div>
          ) : isError ? (
            <div className="flex items-start gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">
                Failed to load policies. Please try again later.
              </p>
            </div>
          ) : activeItem ? (
            <div className="animate-in fade-in duration-300">
              <header className="flex items-center gap-3 pb-4 mb-6 border-b border-border/40">
                <div className="p-2.5 rounded-lg bg-primary/10 ring-1 ring-primary/15 shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3
                  id={activeItem.id}
                  className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-tight"
                >
                  {activeItem.title}
                </h3>
              </header>

              <PolicyContent
                key={activeItem.id}
                html={activeItem.content || null}
                plainDescription="This policy has no detailed description configured."
              />
            </div>
          ) : null}
        </article>
      </div>
    </div>
  )
}
