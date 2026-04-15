"use client"

import { useState } from "react"
import { Users, ChevronDown, ChevronUp } from "lucide-react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"
import { RoleGroup } from "./editorial-board/role-group"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { cn } from "@/src/lib/utils"

interface EditorialBoardSectionProps {
  journalId: string
  editorInChief?: string | null
}

const INITIAL_VISIBLE = 8

function BoardHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="p-2.5 rounded-lg bg-primary/10">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Editorial Board</h2>
        {count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {count} member{count !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  )
}

export function EditorialBoardSection({ journalId, editorInChief }: EditorialBoardSectionProps) {
  const { data, isLoading, isError } = useGetEditorialBoard(journalId)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Editorial Board</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 animate-pulse">
              <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 rounded bg-muted w-3/4" />
                <div className="h-3 rounded bg-muted w-1/2" />
                <div className="h-3 rounded bg-muted w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) return null

  // Prepare members list
  let members: EditorialBoardMember[] = data?.members ? [...data.members] : []

  // Add fallback Editor-in-Chief if provided but not in data
  const hasChief = members.some((m) =>
    m.roleId === 17 || m.roleId === 256 || m.role.toLowerCase().includes("chief")
  )

  if (editorInChief && !hasChief) {
    members.unshift({
      userId: 9999,
      name: String(editorInChief),
      roleId: 17,
      role: "Editor-in-Chief",
      affiliation: null,
    })
  }

  if (members.length === 0) {
    return <EmptyState />
  }

  // Sort by hierarchy priority
  members.sort((a, b) => {
    const configA = getRoleConfig(a.roleId)
    const configB = getRoleConfig(b.roleId)
    if (configA.priority !== configB.priority) {
      return configA.priority - configB.priority
    }
    return a.name.localeCompare(b.name)
  })

  // Group by role tier
  const grouped = members.reduce<Record<string, EditorialBoardMember[]>>((acc, member) => {
    const config = getRoleConfig(member.roleId)
    const key = config.tier === "default" ? member.role : config.label
    if (!acc[key]) acc[key] = []
    acc[key].push(member)
    return acc
  }, {})

  const totalMembers = members.length
  const needsExpansion = totalMembers > INITIAL_VISIBLE

  // Filter for display based on expansion state
  let displayedCount = 0
  const visibleGroups: Array<[string, EditorialBoardMember[], number]> = []

  for (const [roleName, roleMembers] of Object.entries(grouped)) {
    if (!expanded && displayedCount >= INITIAL_VISIBLE) break

    const groupTotal = roleMembers.length
    let displayMembers = roleMembers

    if (!expanded) {
      const remaining = INITIAL_VISIBLE - displayedCount
      displayMembers = roleMembers.slice(0, remaining)
      displayedCount += displayMembers.length
    } else {
      displayedCount += groupTotal
    }

    if (displayMembers.length > 0) {
      visibleGroups.push([roleName, displayMembers, groupTotal])
    }
  }

  // Find Editor-in-Chief for featured display
  const chiefGroup = visibleGroups.find(([role]) => role === "Editor-in-Chief")
  const otherGroups = visibleGroups.filter(([role]) => role !== "Editor-in-Chief")

  return (
    <section className="w-full bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-950 dark:to-slate-900/50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
          {totalMembers > 0 && (
            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-500">
              {totalMembers} members
            </p>
          )}
        </div>

        {/* Featured Editor-in-Chief */}
        {chiefGroup && (
          <div className="mb-16">
            <FeaturedChief
              members={chiefGroup[1]}
              totalCount={chiefGroup[2]}
            />
          </div>
        )}

        {/* Other Editorial Groups */}
        <div className="space-y-16">
          {otherGroups.map(([roleName, members, totalCount]) => (
            <RoleSection
              key={roleName}
              roleName={roleName}
              members={members}
              totalCount={totalCount}
              shownCount={members.length}
            />
          ))}
        </div>

        {/* Expand/Collapse */}
        {needsExpansion && (
          <div className="mt-16 text-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-full shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition-all duration-200 hover:shadow-md"
            >
              {expanded ? (
                <>
                  Show Less <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                </>
              ) : (
                <>
                  View All {totalMembers} Members <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
