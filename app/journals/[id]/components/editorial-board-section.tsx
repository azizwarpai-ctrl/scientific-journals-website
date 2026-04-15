"use client"

import { useState } from "react"
import { Users, ChevronDown, ChevronUp, BookOpen } from "lucide-react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"
import { cn } from "@/src/lib/utils"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

// Sub-components & Utilities
import { getRoleConfig } from "./editorial-board/role-styles"
import { EmptyState } from "./editorial-board/empty-state"
import { FeaturedChief } from "./editorial-board/featured-chief"
import { RoleSection } from "./editorial-board/role-section"

interface EditorialBoardSectionProps {
  journalId: string
  editorInChief?: string | null
}

const INITIAL_VISIBLE_COUNT = 8

export function EditorialBoardSection({ journalId, editorInChief }: EditorialBoardSectionProps) {
  const { data, isLoading, isError } = useGetEditorialBoard(journalId)
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) {
    return <EditorialBoardSkeleton />
  }

  if (isError) return null

  // 1. Prepare and Sort Members
  const rawMembers: EditorialBoardMember[] = data?.members ? [...data.members] : []
  
  // Add fallback Editor-in-Chief if provided via props and not already in the list
  const hasChiefInList = rawMembers.some((m) =>
    m.roleId === 17 || m.roleId === 256 || m.role.toLowerCase().includes("chief")
  )

  if (editorInChief && !hasChiefInList) {
    rawMembers.unshift({
      userId: 9999,
      name: String(editorInChief),
      roleId: 17,
      role: "Editor-in-Chief",
      affiliation: null,
    })
  }

  if (rawMembers.length === 0) {
    return <EmptyState />
  }

  // Sort by defined priority, then by name
  const sortedMembers = [...rawMembers].sort((a, b) => {
    const configA = getRoleConfig(a.roleId)
    const configB = getRoleConfig(b.roleId)
    if (configA.priority !== configB.priority) {
      return configA.priority - configB.priority
    }
    return a.name.localeCompare(b.name)
  })

  // 2. Group by Role
  const grouped = sortedMembers.reduce<Record<string, { members: EditorialBoardMember[], total: number }>>((acc, member) => {
    const config = getRoleConfig(member.roleId)
    const key = config.tier === "default" ? member.role : config.label
    if (!acc[key]) acc[key] = { members: [], total: 0 }
    acc[key].members.push(member)
    acc[key].total++
    return acc
  }, {})

  const totalBoardMembers = sortedMembers.length
  const shouldShowExpandButton = totalBoardMembers > INITIAL_VISIBLE_COUNT

  // 3. Determine Display List
  let currentDisplayCount = 0
  const sectionsToDisplay: Array<{ role: string, members: EditorialBoardMember[], total: number }> = []

  for (const [roleName, entry] of Object.entries(grouped)) {
    if (!isExpanded && currentDisplayCount >= INITIAL_VISIBLE_COUNT) break

    let displayMembers = entry.members
    if (!isExpanded) {
      const remainingSpace = INITIAL_VISIBLE_COUNT - currentDisplayCount
      displayMembers = entry.members.slice(0, remainingSpace)
    }

    if (displayMembers.length > 0) {
      sectionsToDisplay.push({
        role: roleName,
        members: displayMembers,
        total: entry.total
      })
      currentDisplayCount += displayMembers.length
    }
  }

  const chiefSection = sectionsToDisplay.find(s => s.role === "Editor-in-Chief")
  const otherSections = sectionsToDisplay.filter(s => s.role !== "Editor-in-Chief")

  return (
    <section className="w-full bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-950 dark:to-slate-900/50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 mb-6">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
            Editorial Board
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            Distinguished scholars and researchers committed to maintaining the highest standards of academic excellence
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
            <Users className="h-4 w-4" />
            <span>{totalBoardMembers} members</span>
          </div>
        </div>

        {/* Board Content */}
        <div className="space-y-16">
          {chiefSection && (
            <FeaturedChief 
              members={chiefSection.members} 
              totalCount={chiefSection.total} 
            />
          )}

          {otherSections.map((section) => (
            <RoleSection
              key={section.role}
              roleName={section.role}
              members={section.members}
              totalCount={section.total}
              shownCount={section.members.length}
            />
          ))}
        </div>

        {/* Pagination Trigger */}
        {shouldShowExpandButton && (
          <div className="mt-16 text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="group inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-full shadow-md ring-1 ring-slate-200 dark:ring-slate-700 transition-all duration-300 hover:shadow-lg active:scale-95"
            >
              {isExpanded ? (
                <>
                  Show Less <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-1" />
                </>
              ) : (
                <>
                  View All {totalBoardMembers} Members <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function EditorialBoardSkeleton() {
  return (
    <div className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col items-center mb-12">
        <div className="h-12 w-12 rounded-2xl bg-muted animate-pulse mb-6" />
        <div className="h-8 w-64 bg-muted animate-pulse rounded mb-4" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse border border-border/50" />
        ))}
      </div>
    </div>
  )
}
