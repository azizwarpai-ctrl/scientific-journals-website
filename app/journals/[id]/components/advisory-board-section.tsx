"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useGetAdvisoryBoard } from "@/src/features/journals/api/use-get-advisory-board"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { getRoleConfig } from "./editorial-board/role-styles"
import { AdvisoryRoleSection } from "./advisory-board/advisory-role-section"
import { EditorialBoardSkeleton } from "./editorial-board/editorial-board-skeleton"
import { EmptyState } from "./editorial-board/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface AdvisoryBoardSectionProps {
  journalId: string
}

const INITIAL_VISIBLE_COUNT = 8

export function AdvisoryBoardSection({ journalId }: AdvisoryBoardSectionProps) {
  const { data, isLoading, isError } = useGetAdvisoryBoard(journalId)
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) return <EditorialBoardSkeleton />
  if (isError) {
    return (
      <section className="w-full py-8">
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm font-bold tracking-tight">System Notice</AlertTitle>
          <AlertDescription className="text-xs opacity-80">
            We encountered a temporary issue retrieving the advisory board data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  const rawMembers = data?.members ?? []
  if (rawMembers.length === 0) return <EmptyState />

  // Sort by priority, then name
  const sortedMembers = [...rawMembers].sort((a, b) => {
    const ca = getRoleConfig(a.roleId)
    const cb = getRoleConfig(b.roleId)
    if (ca.priority !== cb.priority) return ca.priority - cb.priority
    return a.name.localeCompare(b.name)
  })

  // Group by role label (normalized for default tier to prevent duplicates)
  const grouped = sortedMembers.reduce<Record<string, { label: string; members: EditorialBoardMember[]; total: number }>>(
    (acc, member) => {
      const config = getRoleConfig(member.roleId)
      const isDefault = config.tier === "default"
      const key = isDefault ? member.role.trim().toLowerCase() : config.label

      if (!acc[key]) {
        acc[key] = {
          label: isDefault ? member.role : config.label,
          members: [],
          total: 0
        }
      }
      acc[key].members.push(member)
      acc[key].total++
      return acc
    },
    {}
  )

  const totalBoardMembers = sortedMembers.length
  const shouldShowExpandButton = totalBoardMembers > INITIAL_VISIBLE_COUNT

  const sectionsToDisplay: Array<{ role: string; members: EditorialBoardMember[]; total: number }> = []

  if (isExpanded) {
    for (const entry of Object.values(grouped)) {
      sectionsToDisplay.push({ role: entry.label, members: entry.members, total: entry.total })
    }
  } else {
    const roleEntries = Object.values(grouped)
    let currentDisplayCount = 0

    // 1. First pass: Allocate 1 member per role to ensure discoverability
    for (const entry of roleEntries) {
      if (currentDisplayCount >= INITIAL_VISIBLE_COUNT) break
      sectionsToDisplay.push({
        role: entry.label,
        members: [entry.members[0]],
        total: entry.total
      })
      currentDisplayCount++
    }

    // 2. Second pass: Fill remaining slots with additional members in priority order
    if (currentDisplayCount < INITIAL_VISIBLE_COUNT) {
      for (const section of sectionsToDisplay) {
        if (currentDisplayCount >= INITIAL_VISIBLE_COUNT) break
        const entry = roleEntries.find(e => e.label === section.role)!
        const available = entry.members.slice(1)
        const space = INITIAL_VISIBLE_COUNT - currentDisplayCount
        const toAdd = available.slice(0, space)
        
        section.members.push(...toAdd)
        currentDisplayCount += toAdd.length
      }
    }
  }

  return (
    <section className="w-full py-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Advisory Board</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalBoardMembers} {totalBoardMembers === 1 ? "member" : "members"}
        </p>
      </div>

      <div 
        id={`advisory-registry-${journalId}`}
        className="space-y-10"
      >
        {sectionsToDisplay.map((section) => (
          <AdvisoryRoleSection
            key={section.role}
            roleName={section.role}
            members={section.members}
            totalCount={section.total}
          />
        ))}
      </div>

      {shouldShowExpandButton && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={`advisory-registry-${journalId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                View all {totalBoardMembers} members
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
