"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Users, Info } from "lucide-react"
import { useGetAdvisoryBoard } from "@/src/features/journals/api/use-get-advisory-board"
import { AdvisoryMemberCard } from "./advisory-board/advisory-member-card"
import { AdvisoryBoardSkeleton } from "./advisory-board/advisory-board-skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AdvisoryBoardSectionProps {
  journalId: string
}

const INITIAL_VISIBLE_COUNT = 9

export function AdvisoryBoardSection({ journalId }: AdvisoryBoardSectionProps) {
  const { data, isLoading, isError } = useGetAdvisoryBoard(journalId)
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) return <AdvisoryBoardSkeleton />
  
  if (isError) {
    return (
      <section className="w-full py-12 border-t border-border">
        <Alert variant="destructive" className="rounded-none border-destructive/50 bg-destructive/5">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm font-bold tracking-tight">System Notice</AlertTitle>
          <AlertDescription className="text-xs opacity-80">
            We encountered a temporary issue retrieving the advisory board data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const members = data?.members ?? []
  if (members.length === 0) return null

  const displayMembers = isExpanded ? members : members.slice(0, INITIAL_VISIBLE_COUNT)
  const hasMore = members.length > INITIAL_VISIBLE_COUNT

  return (
    <section className="w-full py-12 border-t border-border">
      {/* Header - Sharp & Minimal */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Academic Governance</span>
          </div>
          <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground sm:text-3xl">
            Advisory Board
          </h2>
        </div>
        
        <div className="flex items-center gap-3 border-l border-border pl-4 md:border-l-0 md:pl-0">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Registry</p>
            <p className="text-xl font-black tracking-tighter text-foreground">{members.length}</p>
          </div>
        </div>
      </div>

      {/* Grid Layout - Sharp Edges */}
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 border border-border">
        {displayMembers.map((member) => (
          <div key={member.userId} className="bg-background">
            <AdvisoryMemberCard member={member} />
          </div>
        ))}
      </div>

      {/* Footer / Pagination - Solid Sharp Button */}
      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="group relative flex items-center justify-center gap-3 overflow-hidden border border-primary px-8 py-3 text-xs font-bold uppercase tracking-widest transition-all hover:bg-primary hover:text-primary-foreground"
          >
            <div className="relative z-10 flex items-center gap-2">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                  Collapse Registry
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                  Expand Full Registry ({members.length})
                </>
              )}
            </div>
            {/* Hover effect background */}
            <div className="absolute inset-0 z-0 bg-primary translate-y-full transition-transform group-hover:translate-y-0" />
          </button>
        </div>
      )}

      {/* Professional Note */}
      <div className="mt-12 border-l-2 border-primary/20 pl-4 py-1">
        <p className="text-[10px] italic leading-relaxed text-muted-foreground/60 max-w-2xl">
          The Advisory Board provides strategic guidance and ensures the peer-review integrity and academic standards of the journal. 
          Members are selected for their recognized expertise and contribution to the field.
        </p>
      </div>
    </section>
  )
}
