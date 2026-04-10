"use client"

import { Users, UserCircle2, Building2 } from "lucide-react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"

interface EditorialBoardSectionProps {
  /** The journal's slug / ojs_path / ojs_id — whatever identifier is used in API routes */
  journalId: string
}

/** Initials-based avatar placeholder */
function MemberAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold select-none"
      aria-hidden
    >
      {initials || <UserCircle2 className="h-5 w-5" />}
    </div>
  )
}

export function EditorialBoardSection({ journalId }: EditorialBoardSectionProps) {
  const { data, isLoading, isError } = useGetEditorialBoard(journalId)

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
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 animate-pulse">
              <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 rounded bg-muted w-3/4" />
                <div className="h-3 rounded bg-muted w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error or empty — render nothing (graceful degradation)
  if (isError || !data || data.members.length === 0) {
    return null
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

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Editorial Board</h2>
      </div>

      <div className="space-y-8">
        {Object.entries(byRole).map(([role, members]) => (
          <div key={role}>
            {/* Role heading */}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border/40">
              {role}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <MemberAvatar name={member.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{member.name}</p>
                    {member.affiliation && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {member.affiliation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
