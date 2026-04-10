"use client"

import { Users, UserCircle2, Building2, Award, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"

interface EditorialBoardSectionProps {
  /** The journal's slug / ojs_path / ojs_id — whatever identifier is used in API routes */
  journalId: string
}

// ── Role styling map — color-coded by editorial seniority ──
const ROLE_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  // Journal Manager / top-level roles
  "16": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300" },
  // Editor / Editor-in-Chief
  "256": { bg: "bg-primary/5", text: "text-primary", border: "border-primary/20", badge: "bg-primary/10 text-primary" },
  // Section Editor
  "512": { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-400", border: "border-violet-200 dark:border-violet-800", badge: "bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300" },
  // Assistant / Other editorial roles
  default: { bg: "bg-slate-50 dark:bg-slate-900/30", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-800", badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
}

function getRoleStyle(roleId: number) {
  return ROLE_STYLES[String(roleId)] ?? ROLE_STYLES.default
}

// ── Avatar gradient colors, deterministic by userId ──
const AVATAR_GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-pink-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-fuchsia-500 to-pink-400",
  "from-sky-500 to-cyan-400",
]

/** Initials-based avatar with unique gradient per user */
function MemberAvatar({ name, userId }: { name: string; userId: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const gradient = AVATAR_GRADIENTS[userId % AVATAR_GRADIENTS.length]

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white text-sm font-bold select-none shadow-sm`}
      aria-hidden
    >
      {initials || <UserCircle2 className="h-5 w-5" />}
    </div>
  )
}

/** How many members to show initially before "Show All" */
const INITIAL_VISIBLE = 8

export function EditorialBoardSection({ journalId }: EditorialBoardSectionProps) {
  const { data, isLoading, isError } = useGetEditorialBoard(journalId)
  const [expanded, setExpanded] = useState(false)

  // Loading skeleton
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
              <div className="h-12 w-12 rounded-xl bg-muted shrink-0" />
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

  // Error — render nothing (graceful degradation)
  if (isError) return null

  // Empty — show informative state
  if (!data || data.members.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Editorial Board</h2>
        </div>
        <div className="text-center py-8">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Editorial board information is being prepared for this journal.
          </p>
        </div>
      </div>
    )
  }

  // Group by role for visual hierarchy
  const byRole = data.members.reduce<Record<string, typeof data.members>>(
    (acc, member) => {
      const key = member.role
      if (!acc[key]) acc[key] = []
      acc[key].push(member)
      return acc
    },
    {}
  )

  const totalMembers = data.members.length
  const needsExpansion = totalMembers > INITIAL_VISIBLE

  // Flatten in group order, and slice for collapsible
  const allEntries = Object.entries(byRole)

  // Count displayed members to determine cutoff
  let displayedCount = 0
  const visibleEntries: Array<[string, typeof data.members]> = []

  for (const [role, members] of allEntries) {
    if (!expanded && displayedCount >= INITIAL_VISIBLE) break
    if (!expanded) {
      const remaining = INITIAL_VISIBLE - displayedCount
      const slicedMembers = members.slice(0, remaining)
      visibleEntries.push([role, slicedMembers])
      displayedCount += slicedMembers.length
    } else {
      visibleEntries.push([role, members])
      displayedCount += members.length
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Editorial Board</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalMembers} member{totalMembers !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Board members grouped by role */}
      <div className="space-y-8">
        {visibleEntries.map(([role, members]) => {
          const firstMember = members[0]
          const style = firstMember ? getRoleStyle(firstMember.roleId) : getRoleStyle(0)

          return (
            <div key={role}>
              {/* Role heading with badge */}
              <div className="flex items-center gap-2 mb-4">
                <Award className={`h-4 w-4 ${style.text}`} />
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${style.badge}`}>
                  {role}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({members.length})
                </span>
                <div className="flex-1 h-px bg-border/40 ml-2" />
              </div>

              {/* Members grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className={`flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                  >
                    <MemberAvatar name={member.name} userId={member.userId} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">
                        {member.name}
                      </p>
                      <p className={`mt-0.5 text-xs font-medium ${style.text}`}>
                        {member.role}
                      </p>
                      {member.affiliation && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground leading-snug">
                          <Building2 className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="truncate">{member.affiliation}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Show More / Show Less toggle */}
      {needsExpansion && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? (
              <>
                Show Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show All {totalMembers} Members <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
