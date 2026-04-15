"use client"

import {
  Users,
  UserCircle2,
  Building2,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  GraduationCap,
  Microscope,
} from "lucide-react"
import { useState } from "react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"

interface EditorialBoardSectionProps {
  journalId: string
  editorInChief?: string | null
}

// ── Role styling — academic seniority hierarchy ──────────────────────────────
const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; border: string; badge: string; dot: string }
> = {
  // Editor / Editor-in-Chief (17)
  "17": {
    bg: "bg-primary/5 dark:bg-primary/10",
    text: "text-primary",
    border: "border-primary/25 dark:border-primary/30",
    badge: "bg-primary/10 dark:bg-primary/20 text-primary",
    dot: "bg-primary",
  },
  // Guest Editor (18)
  "18": {
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
    badge: "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  // Section Editor (19)
  "19": {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    badge: "bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  // Other editorial roles
  default: {
    bg: "bg-slate-50 dark:bg-slate-900/30",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-800",
    badge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
}

const LEGACY_ALIASES: Record<string, string> = { "256": "17", "512": "19" }

function getRoleStyle(roleId: number) {
  const key = LEGACY_ALIASES[String(roleId)] ?? String(roleId)
  return ROLE_STYLES[key] ?? ROLE_STYLES.default
}

// ── Avatar gradients — deterministic by userId ──────────────────────────────
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

function MemberAvatar({
  name,
  userId,
  imageUrl,
}: {
  name: string
  userId: number
  imageUrl?: string | null
}) {
  const [imgError, setImgError] = useState(false)
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const gradient = AVATAR_GRADIENTS[Math.abs(userId) % AVATAR_GRADIENTS.length]

  if (imageUrl && !imgError) {
    return (
      <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden shadow-md ring-2 ring-border/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white text-sm font-bold select-none shadow-md`}
      aria-hidden
    >
      {initials || <UserCircle2 className="h-5 w-5" />}
    </div>
  )
}

const INITIAL_VISIBLE = 8

/** Returns `url` only when it uses http(s) or mailto — rejects javascript: and similar. */
function safeMemberUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
      return url
    }
  } catch {
    // malformed URL — discard
  }
  return null
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
              <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
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
  const members: MemberShape[] = [...data.members]
  if (editorInChief && !hasChief) {
    members.unshift({ userId: 9999, name: String(editorInChief), roleId: 17, role: "Editor-in-Chief", affiliation: null })
  }

  const byRole = members.reduce<Record<string, MemberShape[]>>((acc, m) => {
    const key = `${m.roleId}:${m.role}`
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const totalMembers = members.length
  const needsExpansion = totalMembers > INITIAL_VISIBLE

  let displayedCount = 0
  const visibleEntries: Array<[string, MemberShape[], number]> = []
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

// ── Sub-components ────────────────────────────────────────────────────────────

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

interface MemberShape {
  userId: number
  name: string
  role: string
  affiliation: string | null
  roleId: number
  orcid?: string | null
  url?: string | null
  profileImage?: string | null
  googleScholar?: string | null
  scopus?: string | null
}

interface RoleGroupProps {
  roleDisplayName: string
  roleId: number
  groupTotalCount: number
  members: MemberShape[]
}

function RoleGroup({ roleDisplayName, roleId, groupTotalCount, members }: RoleGroupProps) {
  const style = getRoleStyle(roleId)
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <div className={`h-2 w-2 rounded-full ${style.dot} shrink-0`} />
        <Award className={`h-4 w-4 ${style.text} shrink-0`} />
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${style.badge}`}>
          {roleDisplayName}
        </span>
        <span className="text-xs text-muted-foreground">({groupTotalCount})</span>
        <div className="flex-1 h-px bg-border/40 ml-1" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} style={style} />
        ))}
      </div>
    </div>
  )
}

interface MemberCardProps {
  member: MemberShape
  style: (typeof ROLE_STYLES)[string]
}

function MemberCard({ member, style }: MemberCardProps) {
  const safeUrl = safeMemberUrl(member.url)
  const hasLinks = member.orcid || member.googleScholar || member.scopus || safeUrl

  return (
    <div
      className={`group relative flex flex-col gap-3 rounded-2xl border ${style.border} ${style.bg} p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        <MemberAvatar name={member.name} userId={member.userId} imageUrl={member.profileImage} />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-bold text-sm leading-snug text-foreground">{member.name}</p>
          <p className={`mt-0.5 text-xs font-semibold ${style.text}`}>{member.role}</p>
        </div>
      </div>

      {/* Affiliation */}
      {member.affiliation && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
          <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
          <span className="line-clamp-2">{member.affiliation}</span>
        </div>
      )}

      {/* Profile links — ORCID · Google Scholar · Scopus · Website */}
      {hasLinks && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30 mt-auto">
          {/* ORCID */}
          {member.orcid && (
            <a
              href={`https://orcid.org/${member.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`ORCID profile for ${member.name}`}
              title="ORCID iD"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#A6CE39] hover:text-[#89ab30] transition-colors"
            >
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#A6CE39] text-white text-[9px] font-black leading-none shrink-0">
                iD
              </span>
              ORCID
            </a>
          )}

          {/* Google Scholar */}
          {member.googleScholar && (
            <a
              href={member.googleScholar}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Google Scholar profile for ${member.name}`}
              title="Google Scholar"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              Scholar
            </a>
          )}

          {/* Scopus */}
          {member.scopus && (
            <a
              href={member.scopus}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Scopus profile for ${member.name}`}
              title="Scopus"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 transition-colors"
            >
              <Microscope className="h-3.5 w-3.5 shrink-0" />
              Scopus
            </a>
          )}

          {/* Personal website */}
          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Website for ${member.name}`}
              title="Personal website"
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="h-3 w-3 shrink-0" />
              Profile
              <ExternalLink className="h-2.5 w-2.5 opacity-60 shrink-0" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
