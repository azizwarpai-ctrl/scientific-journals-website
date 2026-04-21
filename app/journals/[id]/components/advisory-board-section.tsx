"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Users } from "lucide-react"
import { useGetAdvisoryBoard } from "@/src/features/journals/api/use-get-advisory-board"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { getRoleConfig } from "./editorial-board/role-styles"
import { RoleSection } from "./editorial-board/role-section"
import { EditorialBoardSkeleton } from "./editorial-board/editorial-board-skeleton"

interface AdvisoryBoardSectionProps {
  journalId: string
}

const INITIAL_VISIBLE_COUNT = 8

export function AdvisoryBoardSection({ journalId }: AdvisoryBoardSectionProps) {
  const { data, isLoading, isError } = useGetAdvisoryBoard(journalId)
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) return <EditorialBoardSkeleton />
  if (isError) return null

  const rawMembers: EditorialBoardMember[] = data?.members ? [...data.members] : []

  // If there's no advisory board, we don't even show the section
  // unlike the editorial board which is mandatory in the UI.
  if (rawMembers.length === 0) return null

  // Sort by priority, then name
  const sortedMembers = [...rawMembers].sort((a, b) => {
    const ca = getRoleConfig(a.roleId)
    const cb = getRoleConfig(b.roleId)
    if (ca.priority !== cb.priority) return ca.priority - cb.priority
    return a.name.localeCompare(b.name)
  })

  // Group by role label
  const grouped = sortedMembers.reduce<Record<string, { members: EditorialBoardMember[]; total: number }>>(
    (acc, member) => {
      const config = getRoleConfig(member.roleId)
      const key = config.tier === "default" ? member.role : config.label
      if (!acc[key]) acc[key] = { members: [], total: 0 }
      acc[key].members.push(member)
      acc[key].total++
      return acc
    },
    {}
  )

  const totalBoardMembers = sortedMembers.length
  const shouldShowExpandButton = totalBoardMembers > INITIAL_VISIBLE_COUNT

  let currentDisplayCount = 0
  const sectionsToDisplay: Array<{ role: string; members: EditorialBoardMember[]; total: number }> = []

  for (const [roleName, entry] of Object.entries(grouped)) {
    if (!isExpanded && currentDisplayCount >= INITIAL_VISIBLE_COUNT) break
    let displayMembers = entry.members
    if (!isExpanded) {
      const remaining = INITIAL_VISIBLE_COUNT - currentDisplayCount
      displayMembers = entry.members.slice(0, remaining)
    }
    if (displayMembers.length > 0) {
      sectionsToDisplay.push({ role: roleName, members: displayMembers, total: entry.total })
      currentDisplayCount += displayMembers.length
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

      <div className="space-y-10">
        {sectionsToDisplay.map((section) => (
          <RoleSection
            key={section.role}
            roleName={section.role}
            members={section.members}
            totalCount={section.total}
            shownCount={section.members.length}
          />
        ))}
      </div>

      {shouldShowExpandButton && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
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
                View all {totalBoardMembers} advisory members
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
