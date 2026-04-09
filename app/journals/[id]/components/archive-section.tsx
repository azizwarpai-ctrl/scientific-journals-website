"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Archive,
  BookOpen,
  Calendar,
  FileText,
  ArrowRight,
} from "lucide-react"

import { useGetArchiveIssues, type ArchiveIssue } from "@/src/features/journals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArchiveSkeleton } from "@/components/skeletons/archive-skeleton"
import { ArchiveError } from "@/components/errors/archive-error"
import { ArchiveEmpty } from "@/components/states/archive-empty"
import { ArchiveIssueDetail } from "./archive-issue-detail"
import { getIssueTitle, getIssueSubtitle } from "./issue-helpers"

interface ArchiveSectionProps {
  journalId: string
}

export function ArchiveSection({ journalId }: ArchiveSectionProps) {
  const { data: response, isLoading, error, refetch } = useGetArchiveIssues(journalId)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const archiveIssues = response?.data || []

  if (isLoading) return <ArchiveSkeleton />
  if (error) return <ArchiveError retry={() => refetch()} />
  if (archiveIssues.length === 0) {
    return <ArchiveEmpty message={response?.message} />
  }

  // ── If an issue is selected, show its detail view ─────────────
  if (selectedIssueId !== null) {
    return (
      <ArchiveIssueDetail
        journalId={journalId}
        issueId={selectedIssueId}
        onBack={() => setSelectedIssueId(null)}
      />
    )
  }

  // ── Archive Grid ──────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Archive className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Past Issues</h2>
            <p className="text-sm text-muted-foreground">
              {archiveIssues.length} archived issue{archiveIssues.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Issue Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {archiveIssues.map((issue) => (
          <ArchiveIssueCard
            key={issue.issueId}
            issue={issue}
            onClick={() => setSelectedIssueId(issue.issueId)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Archive Issue Card ─────────────────────────────────────────────

function ArchiveIssueCard({
  issue,
  onClick,
}: {
  issue: ArchiveIssue
  onClick: () => void
}) {
  const [hasCoverError, setHasCoverError] = useState(false)



  return (
    <button
      type="button"
      onClick={onClick}
      id={`archive-issue-${issue.issueId}`}
      className="group relative flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1.5 text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden">
        {issue.issueCoverUrl && !hasCoverError ? (
          <Image
            src={issue.issueCoverUrl}
            alt={getIssueTitle(issue)}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setHasCoverError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30">
            <BookOpen className="h-16 w-16 mb-3" strokeWidth={1} />
            <span className="text-xs uppercase tracking-widest font-semibold opacity-50">
              No Cover
            </span>
          </div>
        )}

        {/* Article count badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-background/90 text-foreground backdrop-blur-md shadow-md border-border/30 text-[10px] font-bold py-1 px-2.5 gap-1">
            <FileText className="h-3 w-3" />
            {issue.articleCount} {issue.articleCount === 1 ? "article" : "articles"}
          </Badge>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Hover CTA */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <div className="flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full py-2.5 px-5 text-sm font-semibold shadow-lg">
            View Issue
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col gap-2">
        <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {getIssueTitle(issue)}
        </h3>

        {getIssueSubtitle(issue) && (
          <p className="text-sm text-muted-foreground font-medium">
            {getIssueSubtitle(issue)}
          </p>
        )}

        <div className="flex items-center gap-4 mt-auto pt-3 text-xs text-muted-foreground">
          {issue.datePublished && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(issue.datePublished).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
