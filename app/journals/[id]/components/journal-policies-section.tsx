"use client"

import { useState, useEffect } from "react"
import DOMPurify, { type Config } from "dompurify"
import {
  Shield,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText
} from "lucide-react"
import { useGetJournalPolicies } from "@/src/features/journals/api/use-get-journal-policies"

interface JournalPoliciesSectionProps {
  journalId: string
}

const SAFE_HTML_OPTIONS: Config = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", 
    "h1", "h2", "h3", "h4", "h5", "blockquote", "span", "div", 
    "table", "tbody", "tr", "td", "th", "thead", "img"
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
    <div className="relative">
      <div
        className={`overflow-hidden transition-all duration-300 ${!expanded ? "max-h-[260px]" : "max-h-[9999px]"}`}
        style={{ maxHeight: !expanded ? `${MAX_HEIGHT}px` : undefined }}
      >
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-table:w-full prose-table:border-collapse prose-td:border prose-td:p-2 prose-th:border prose-th:p-2 prose-img:rounded-md"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      </div>

      {safe.length > 600 && (
        <>
          {!expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
          <button
            onClick={() => setExpanded((prev: boolean) => !prev)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" /> Read full policy</>
            )}
          </button>
        </>
      )}
    </div>
  )
}

function DoiOrcidPanel({ doiEnabled, requireAuthorCompetingInterestsEnabled }: { doiEnabled: boolean; requireAuthorCompetingInterestsEnabled: boolean }) {
  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 ${doiEnabled ? "border-primary/20 bg-primary/5" : "border-border/40 bg-muted/30"}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${doiEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            DOI
          </span>
          <h4 className="text-sm font-bold">Digital Object Identifier (DOI)</h4>
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${doiEnabled ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {doiEnabled ? "Enabled" : "Not configured"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {doiEnabled
            ? "This journal assigns DOIs to all published articles via Crossref, enabling permanent, citable references."
            : "DOI assignment has not been configured for this journal yet."}
        </p>
      </div>

      <div className={`rounded-xl border p-4 ${requireAuthorCompetingInterestsEnabled ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20" : "border-border/40 bg-muted/30"}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${requireAuthorCompetingInterestsEnabled ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
            CI
          </span>
          <h4 className="text-sm font-bold">Competing Interests</h4>
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${requireAuthorCompetingInterestsEnabled ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {requireAuthorCompetingInterestsEnabled ? "Required" : "Not required"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {requireAuthorCompetingInterestsEnabled
            ? "Authors are required to declare any competing interests at the time of submission."
            : "A competing interests declaration is not currently required by this journal."}
        </p>
      </div>
    </div>
  )
}

export function JournalPoliciesSection({ journalId }: JournalPoliciesSectionProps) {
  const [activeTabSlug, setActiveTabSlug] = useState<string | null>(null)
  const { data: policies, isLoading, isError } = useGetJournalPolicies(journalId)

  const tabs = policies?.tabs || []
  const hasDoiFeatures = policies?.doiEnabled || policies?.requireAuthorCompetingInterestsEnabled

  const defaultTabSlug = tabs.length > 0 ? tabs[0].slug : (hasDoiFeatures ? "_doiorcid" : null);
  const currentTabSlug = activeTabSlug || defaultTabSlug;

  // If completely empty without config
  if (!isLoading && !isError && tabs.length === 0 && !hasDoiFeatures) {
    return null; // Hide the entire section if absolutely no policies exist
  }

  const activeTabContent = tabs.find(t => t.slug === currentTabSlug)
  const isDoiTabActive = currentTabSlug === "_doiorcid"

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-border/40">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Journal Policies</h2>
      </div>

      {/* Tab navigation — scrollable on mobile */}
      <div className="overflow-x-auto border-b border-border/40 bg-muted/20">
        <div className="flex min-w-max px-2">
          {isLoading ? (
            <div className="flex gap-4 p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
          ) : (
            <>
              {tabs.map((tab) => {
                const isActive = currentTabSlug === tab.slug
                return (
                  <button
                    key={tab.slug}
                    onClick={() => setActiveTabSlug(tab.slug)}
                    className={[
                      "flex items-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                      isActive
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {tab.title}
                  </button>
                )
              })}
              
              {hasDoiFeatures && (
                <button
                  onClick={() => setActiveTabSlug("_doiorcid")}
                  className={[
                    "flex items-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                    isDoiTabActive
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  ].join(" ")}
                >
                  <Fingerprint className="h-3.5 w-3.5" />
                  DOI & ORCID
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active tab content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        ) : isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Failed to load policies</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Journal policy information could not be retrieved. Please try again later.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Active tab descriptor */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-primary/10">
                {isDoiTabActive ? (
                  <Fingerprint className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isDoiTabActive ? "DOI & ORCID Policy" : activeTabContent?.title}
                </h3>
              </div>
            </div>

            {isDoiTabActive ? (
              <DoiOrcidPanel
                doiEnabled={policies?.doiEnabled ?? false}
                requireAuthorCompetingInterestsEnabled={policies?.requireAuthorCompetingInterestsEnabled ?? false}
              />
            ) : (
              <PolicyContent
                key={currentTabSlug || "unselected"}
                html={activeTabContent?.content || null}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
