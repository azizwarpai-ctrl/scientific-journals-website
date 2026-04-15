"use client"

import { useState } from "react"
import { Users, ChevronDown, ChevronUp } from "lucide-react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"
import { RoleGroup } from "./editorial-board/role-group"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

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

  if (!data || data.members.length === 0) {
    if (editorInChief) {
      return (
        <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
          <BoardHeader count={1} />
          <div className="space-y-8">
            <RoleGroup
              roleDisplayName="Editor-in-Chief"
              roleId={17}
              groupTotalCount={1}
              members={[{ userId: 9999, name: editorInChief, role: "Editor-in-Chief", affiliation: null, roleId: 17 }]}
            />
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <BoardHeader count={0} />
        <div className="text-center py-8">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Editorial board information is being prepared for this journal.
          </p>
        </div>
      </div>
    )
  }

  const hasChief = data.members.some(
    (m) => m.roleId === 17 || m.roleId === 256 || m.role.toLowerCase().includes("chief")
  )
  const members: EditorialBoardMember[] = [...data.members]
  if (editorInChief && !hasChief) {
    members.unshift({ userId: 9999, name: String(editorInChief), roleId: 17, role: "Editor-in-Chief", affiliation: null })
  }

  const byRole = members.reduce<Record<string, EditorialBoardMember[]>>((acc, m) => {
    const key = `${m.roleId}:${m.role}`
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const totalMembers = members.length
  const needsExpansion = totalMembers > INITIAL_VISIBLE

  let displayedCount = 0
  const visibleEntries: Array<[string, EditorialBoardMember[], number]> = []
  for (const [groupKey, groupMembers] of Object.entries(byRole)) {
    if (!expanded && displayedCount >= INITIAL_VISIBLE) break
    const groupTotalCount = groupMembers.length
    if (!expanded) {
      const sliced = groupMembers.slice(0, INITIAL_VISIBLE - displayedCount)
      visibleEntries.push([groupKey, sliced, groupTotalCount])
      displayedCount += sliced.length
    } else {
      visibleEntries.push([groupKey, groupMembers, groupTotalCount])
      displayedCount += groupMembers.length
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
      <BoardHeader count={totalMembers} />

      <div className="space-y-10">
        {visibleEntries.map(([groupKey, groupMembers, groupTotalCount]) => {
          const first = groupMembers[0]
          return (
            <RoleGroup
              key={groupKey}
              roleDisplayName={first?.role || "Editorial Board Member"}
              roleId={first?.roleId ?? 0}
              groupTotalCount={groupTotalCount}
              members={groupMembers}
            />
          )
        })}
      </div>

      {needsExpansion && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <>Show Less <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Show All {totalMembers} Members <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
