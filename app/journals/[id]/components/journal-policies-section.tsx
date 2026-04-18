"use client"

import { useState } from "react"
import DOMPurify, { type Config } from "dompurify"
import {
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
} from "lucide-react"
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

function PolicyContent({ html, plainDescription }: { html: string | null; plainDescription?: string }) {
  const [expanded, setExpanded] = useState(false)
  const MAX_HEIGHT = 260

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
    <div className="relative animate-in fade-in duration-300">
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${!expanded ? "max-h-[260px]" : "max-h-[9999px]"}`}
        style={{ maxHeight: !expanded ? `${MAX_HEIGHT}px` : undefined }}
      >
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:w-full prose-table:border-collapse prose-td:border prose-td:border-border/50 prose-td:p-2.5 prose-th:border prose-th:border-border/50 prose-th:p-2.5 prose-th:bg-muted/40 prose-th:font-semibold prose-img:rounded-lg prose-img:shadow-sm prose-blockquote:border-l-primary/40 prose-blockquote:bg-muted/20 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-li:marker:text-primary/60 prose-ul:space-y-1 prose-ol:space-y-1"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      </div>

      {safe.length > 600 && (
        <>
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
          )}
          <button
            onClick={() => setExpanded((prev: boolean) => !prev)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" /> Show less</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" /> Read full policy</>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function JournalPoliciesSection({ journalId }: JournalPoliciesSectionProps) {
  const [activeTabSlug, setActiveTabSlug] = useState<string | null>(null)
  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null | undefined>(undefined)
  const { data: policies, isLoading, isError } = useGetJournalPolicies(journalId)

  const tabs = policies?.tabs || []

  const defaultTabSlug = tabs.length > 0 ? tabs[0].slug : null;
  const currentTabSlug = activeTabSlug || defaultTabSlug;

  // If completely empty without config
  if (!isLoading && !isError && tabs.length === 0) {
    return null; // Hide the entire section if absolutely no policies exist
  }

  // Combine items to a single array so we can render them cleanly
  const navItems = [
    ...tabs.map(t => ({ id: t.slug, title: t.title, type: "policy" as const, content: t.content }))
  ]

  const activeItem = navItems.find(t => t.id === currentTabSlug)

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col md:flex-row">
      
      {/* ── Mobile/Tablet Accordion List (Hidden on Desktop) ── */}
      <div className="md:hidden flex flex-col w-full">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border/40 bg-muted/10">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Journal Policies</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
             <div className="h-14 bg-muted rounded-xl animate-pulse" />
             <div className="h-14 bg-muted rounded-xl animate-pulse" />
             <div className="h-14 bg-muted rounded-xl animate-pulse" />
          </div>
        ) : isError ? (
           <div className="p-4">
             <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-semibold flex flex-col gap-1">
               Failed to load policies.
               <span className="text-xs opacity-80 font-medium">Please try again later.</span>
             </div>
           </div>
        ) : (
          <div className="divide-y divide-border/40">
            {navItems.map(item => {
              const isActive = (expandedAccordionId === undefined ? defaultTabSlug : expandedAccordionId) === item.id;
              return (
                <div key={item.id} className="flex flex-col bg-card relative">
                  <button
                    onClick={() => setExpandedAccordionId(isActive ? null : item.id)}
                    className={`flex items-center justify-between px-6 py-4 transition-colors ${isActive ? "bg-primary/5 text-primary" : "text-foreground hover:bg-muted/40"}`}
                  >
                    <div className="flex items-center gap-3">
                       <FileText className="h-4 w-4" />
                       <span className="text-sm font-bold">{item.title}</span>
                    </div>
                    {isActive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
                  </button>
                  {isActive && (
                    <div className="p-6 bg-card border-t border-border/40 animate-in slide-in-from-top-2 duration-300 shadow-inner">
                      <PolicyContent key={item.id} html={item.content || null} plainDescription="This policy has no detailed description configured." />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Desktop Sidebar Layout (Hidden on Mobile) ── */}
      <div className="hidden md:flex flex-row w-full min-h-[450px]">
        {/* Sidebar */}
        <div className="w-1/3 md:w-[280px] lg:w-[320px] shrink-0 bg-muted/20 border-r border-border/40 flex flex-col z-10 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border/40">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Journal Policies</h2>
          </div>
          
          <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            {isLoading ? (
               <div className="space-y-3 animate-pulse">
                <div className="h-11 bg-muted rounded-xl w-full" />
                <div className="h-11 bg-muted rounded-xl w-full" />
                <div className="h-11 bg-muted rounded-xl w-3/4" />
               </div>
            ) : isError ? (
               <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-xl font-medium">Error loading policies.</div>
            ) : (
              navItems.map(item => {
                const isActive = currentTabSlug === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTabSlug(item.id)}
                    className={[
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group",
                      isActive 
                        ? "bg-primary/10 text-primary shadow-sm font-semibold" 
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground font-medium"
                    ].join(" ")}
                  >
                    <div className={`p-1.5 rounded-md transition-colors ${isActive ? "bg-primary/20 text-primary" : "bg-transparent text-muted-foreground group-hover:text-foreground"}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-sm tracking-tight">{item.title}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-card max-h-[800px] overflow-y-auto min-w-0">
           {!isLoading && !isError && activeItem ? (
             <div className="animate-in fade-in duration-500 max-w-4xl p-8 lg:p-10">
                <div className="flex items-center gap-4 mb-8 pb-5 border-b border-border/40">
                  <div className="p-3 rounded-xl bg-primary/10 shadow-sm ring-1 ring-primary/20">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                    {activeItem.title}
                  </h3>
                </div>

                <div className="pl-1">
                  <PolicyContent
                    key={activeItem.id}
                    html={activeItem.content || null}
                    plainDescription="This policy has no detailed description configured."
                  />
                </div>
             </div>
           ) : null}
        </div>
      </div>

    </div>
  )
}
