"use client"

import { useState } from "react"
import DOMPurify from "dompurify"
import {
  Shield,
  Copyright,
  FileCheck,
  BookMarked,
  Search,
  Fingerprint,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react"
import { useGetJournalPolicies } from "@/src/features/journals/api/use-get-journal-policies"

interface JournalPoliciesSectionProps {
  journalId: string
}

type IconComponent = (props: { className?: string }) => JSX.Element

interface PolicyTab {
  id: string
  label: string
  icon: IconComponent
  field: "privacyStatement" | "copyrightStatement" | "authorSelfArchivePolicy" | "reviewPolicy" | "openAccessPolicy" | "_doiorcid"
  description: string
}

const POLICY_TABS: PolicyTab[] = [
  {
    id: "privacy",
    label: "Privacy",
    icon: Shield,
    field: "privacyStatement",
    description: "How we collect, use, and protect personal data submitted to this journal.",
  },
  {
    id: "ethics",
    label: "Ethics",
    icon: FileCheck,
    field: "reviewPolicy",
    description: "Peer review process, authorship criteria, and publication ethics standards.",
  },
  {
    id: "copyright",
    label: "Copyright",
    icon: Copyright,
    field: "copyrightStatement",
    description: "Copyright terms, author rights, and permitted reuse of published content.",
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: BookMarked,
    field: "authorSelfArchivePolicy",
    description: "Editorial workflow, self-archiving, and open access policies.",
  },
  {
    id: "indexing",
    label: "Indexing",
    icon: Search,
    field: "openAccessPolicy",
    description: "Database indexing, open access terms, and discoverability information.",
  },
  {
    id: "doiorcid",
    label: "DOI & ORCID",
    icon: Fingerprint,
    field: "_doiorcid",
    description: "Digital Object Identifier and ORCID iD policies for this journal.",
  },
]

const SAFE_HTML_OPTIONS = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", "h3", "h4", "h5", "blockquote", "span"],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
} as const

function sanitize(html: string | null | undefined): string {
  if (!html) return ""
  if (typeof window === "undefined") return html
  return DOMPurify.sanitize(html, SAFE_HTML_OPTIONS)
}

function PolicyContent({ html, plainDescription }: { html: string | null; plainDescription: string }) {
  const [expanded, setExpanded] = useState(false)
  const MAX_HEIGHT = 260

  if (!html) {
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
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-p:leading-relaxed prose-a:text-primary"
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

function DoiOrcidPanel({ doiEnabled, orcidEnabled }: { doiEnabled: boolean; orcidEnabled: boolean }) {
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

      <div className={`rounded-xl border p-4 ${orcidEnabled ? "border-[#A6CE39]/40 bg-[#A6CE39]/5" : "border-border/40 bg-muted/30"}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${orcidEnabled ? "bg-[#A6CE39] text-white" : "bg-muted text-muted-foreground"}`}>
            iD
          </span>
          <h4 className="text-sm font-bold">ORCID iD Integration</h4>
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${orcidEnabled ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {orcidEnabled ? "Enabled" : "Not configured"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {orcidEnabled
            ? "Authors are required to provide their ORCID iD, ensuring unambiguous author identification across publications."
            : "ORCID iD collection has not been enabled for this journal."}
        </p>
      </div>
    </div>
  )
}

export function JournalPoliciesSection({ journalId }: JournalPoliciesSectionProps) {
  const [activeTab, setActiveTab] = useState("privacy")
  const { data: policies, isLoading } = useGetJournalPolicies(journalId)

  const active = POLICY_TABS.find((t) => t.id === activeTab) ?? POLICY_TABS[0]
  const ActiveIcon = active.icon

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
          {POLICY_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex items-center gap-2 px-4 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
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
        ) : (
          <>
            {/* Active tab descriptor */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-primary/10">
                <ActiveIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{active.label} Policy</h3>
              </div>
            </div>

            {active.field === "_doiorcid" ? (
              <DoiOrcidPanel
                doiEnabled={policies?.doiEnabled ?? false}
                orcidEnabled={policies?.orcidEnabled ?? false}
              />
            ) : (
              <PolicyContent
                html={policies ? policies[active.field as keyof typeof policies] as string | null : null}
                plainDescription={active.description}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
