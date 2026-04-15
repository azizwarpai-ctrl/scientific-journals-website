"use client"

import {
  Users,
  UserCircle2,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  GraduationCap,
  Microscope,
  Award,
  BookOpen,
} from "lucide-react"
import { useState } from "react"
import { useGetEditorialBoard } from "@/src/features/journals/api/use-get-editorial-board"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { cn } from "@/src/lib/utils"

interface EditorialBoardSectionProps {
  journalId: string
  editorInChief?: string | null
}

// ── Academic Role Hierarchy ──────────────────────────────────────────────────
type RoleTier = "chief" | "senior" | "editor" | "guest" | "default"

const ROLE_CONFIG: Record<
  number,
  { tier: RoleTier; label: string; priority: number }
> = {
  17: { tier: "chief", label: "Editor-in-Chief", priority: 1 },      // Editor-in-Chief
  256: { tier: "chief", label: "Editor-in-Chief", priority: 1 },     // Legacy alias
  19: { tier: "senior", label: "Section Editor", priority: 2 },      // Section Editor
  512: { tier: "senior", label: "Section Editor", priority: 2 },     // Legacy alias
  18: { tier: "guest", label: "Guest Editor", priority: 3 },         // Guest Editor
}

const getRoleConfig = (roleId: number) => ROLE_CONFIG[roleId] || { tier: "default", label: "Editorial Board Member", priority: 4 }

// ── Tier-based Styling ───────────────────────────────────────────────────────
const TIER_STYLES: Record<RoleTier, {
  accent: string
  gradient: string
  badge: string
  border: string
  glow: string
}> = {
  chief: {
    accent: "text-amber-700 dark:text-amber-400",
    gradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    border: "border-amber-200/60 dark:border-amber-800/60",
    glow: "group-hover:shadow-amber-500/10",
  },
  senior: {
    accent: "text-indigo-700 dark:text-indigo-400",
    gradient: "from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    border: "border-indigo-200/60 dark:border-indigo-800/60",
    glow: "group-hover:shadow-indigo-500/10",
  },
  editor: {
    accent: "text-slate-700 dark:text-slate-300",
    gradient: "from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-slate-800/20",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    border: "border-slate-200/60 dark:border-slate-700/60",
    glow: "group-hover:shadow-slate-500/10",
  },
  guest: {
    accent: "text-emerald-700 dark:text-emerald-400",
    gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    border: "border-emerald-200/60 dark:border-emerald-800/60",
    glow: "group-hover:shadow-emerald-500/10",
  },
  default: {
    accent: "text-slate-600 dark:text-slate-400",
    gradient: "from-slate-50 to-zinc-50 dark:from-slate-900/20 dark:to-zinc-900/20",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    border: "border-slate-200/60 dark:border-slate-800/60",
    glow: "group-hover:shadow-slate-500/5",
  },
}

// ── Avatar System ─────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-500",
  "from-indigo-600 to-violet-500",
  "from-violet-600 to-purple-500",
  "from-slate-600 to-slate-500",
  "from-zinc-600 to-neutral-500",
  "from-stone-600 to-stone-500",
]

function MemberAvatar({
  name,
  userId,
  imageUrl,
  size = "md",
}: {
  name: string
  userId: number
  imageUrl?: string | null
  size?: "sm" | "md" | "lg" | "xl"
}) {
  const [imgError, setImgError] = useState(false)
  const initials = name
    .split(" ")
    .filter(n => n.length > 0)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const gradient = AVATAR_GRADIENTS[Math.abs(userId) % AVATAR_GRADIENTS.length]

  const sizeClasses = {
    sm: "h-10 w-10 text-xs",
    md: "h-14 w-14 text-sm",
    lg: "h-20 w-20 text-base",
    xl: "h-28 w-28 text-xl",
  }

  if (imageUrl && !imgError) {
    return (
      <div className={cn(
        "shrink-0 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-md",
        sizeClasses[size]
      )}>
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
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white font-bold select-none shadow-md",
        gradient,
        sizeClasses[size]
      )}
      aria-hidden
    >
      {initials || <UserCircle2 className="h-1/2 w-1/2 opacity-80" />}
    </div>
  )
}

// ── URL Validation ────────────────────────────────────────────────────────────
function safeMemberUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
      return url
    }
  } catch {
    // Invalid URL
  }
  return null
}

const INITIAL_VISIBLE = 9

// ── Main Component ────────────────────────────────────────────────────────────
export function EditorialBoardSection({ journalId, editorInChief }: EditorialBoardSectionProps) {
  const { data, isLoading, isError } = useGetEditorialBoard(journalId)
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return <EditorialBoardSkeleton />
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

// ── Sub-components ───────────────────────────────────────────────────────────

function FeaturedChief({ members, totalCount }: { members: EditorialBoardMember[]; totalCount: number }) {
  const member = members[0]
  const style = TIER_STYLES.chief
  const hasLinks = member.orcid || member.googleScholar || member.scopus || safeMemberUrl(member.url)

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-amber-500/10 rounded-3xl blur-3xl" />
      <div className={cn(
        "relative bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 ring-1 shadow-xl",
        style.border
      )}>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <MemberAvatar
            name={member.name}
            userId={member.userId}
            imageUrl={member.profileImage}
            size="xl"
          />

          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800">
              <Award className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300 tracking-wide uppercase">
                Editor-in-Chief{totalCount > 1 ? `s (${totalCount})` : ""}
              </span>
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {member.name}
              </h3>
              {member.affiliation && (
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2">
                  <Building2 className="h-5 w-5 shrink-0 opacity-70" />
                  {member.affiliation}
                </p>
              )}
            </div>

            {hasLinks && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-4">
                <ProfileLinks member={member} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleSection({
  roleName,
  members,
  totalCount,
  shownCount
}: {
  roleName: string
  members: EditorialBoardMember[]
  totalCount: number
  shownCount: number
}) {
  // Determine tier based on first member's roleId
  const firstMember = members[0]
  const config = getRoleConfig(firstMember?.roleId || 0)
  const style = TIER_STYLES[config.tier]

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent")} />
        <div className="flex items-center gap-3">
          <span className={cn(
            "px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase border",
            style.badge
          )}>
            {roleName}
          </span>
          {shownCount < totalCount && (
            <span className="text-sm text-slate-500 dark:text-slate-500">
              Showing {shownCount} of {totalCount}
            </span>
          )}
        </div>
        <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent")} />
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  )
}

function MemberCard({ member }: { member: EditorialBoardMember }) {
  const config = getRoleConfig(member.roleId)
  const style = TIER_STYLES[config.tier]
  const hasLinks = member.orcid || member.googleScholar || member.scopus || safeMemberUrl(member.url)

  return (
    <div className={cn(
      "group relative bg-white dark:bg-slate-800/50 rounded-2xl p-6 transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-1",
      "ring-1 ring-slate-200 dark:ring-slate-700/50",
      style.glow
    )}>
      {/* Subtle gradient background on hover */}
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10",
        style.gradient
      )} />

      <div className="flex items-start gap-4">
        <MemberAvatar
          name={member.name}
          userId={member.userId}
          imageUrl={member.profileImage}
          size="md"
        />

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1 group-hover:text-primary transition-colors">
            {member.name}
          </h4>

          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2",
            style.badge
          )}>
            {member.role}
          </span>

          {member.affiliation && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {member.affiliation}
            </p>
          )}
        </div>
      </div>

      {/* Profile Links */}
      {hasLinks && (
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2">
            <ProfileLinks member={member} compact />
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileLinks({ member, compact = false }: { member: EditorialBoardMember; compact?: boolean }) {
  const safeUrl = safeMemberUrl(member.url)
  const safeScholar = safeMemberUrl(member.googleScholar)
  const safeScopus = safeMemberUrl(member.scopus)

  const linkClass = cn(
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
    "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
    "text-slate-700 dark:text-slate-300",
    "border border-slate-200 dark:border-slate-700"
  )

  return (
    <>
      {member.orcid && (
        <a
          href={`https://orcid.org/${member.orcid}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, "text-[#A6CE39] hover:text-[#8fb92f] dark:text-[#A6CE39]")}
          title="ORCID iD"
        >
          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-[#A6CE39] text-white text-[8px] font-black">iD</span>
          {!compact && "ORCID"}
        </a>
      )}

      {safeScholar && (
        <a
          href={safeScholar}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, "text-blue-600 dark:text-blue-400")}
          title="Google Scholar"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          {!compact && "Scholar"}
        </a>
      )}

      {safeScopus && (
        <a
          href={safeScopus}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, "text-orange-600 dark:text-orange-400")}
          title="Scopus"
        >
          <Microscope className="h-3.5 w-3.5" />
          {!compact && "Scopus"}
        </a>
      )}

      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title="Website"
        >
          <Globe className="h-3.5 w-3.5" />
          {!compact && "Website"}
          {compact && <ExternalLink className="h-3 w-3 opacity-60" />}
        </a>
      )}
    </>
  )
}

function EditorialBoardSkeleton() {
  return (
    <section className="w-full bg-slate-50/50 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-64 mx-auto animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-96 mx-auto animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
          <Users className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Editorial Board
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Editorial board information is being prepared for this journal. Please check back later.
        </p>
      </div>
    </section>
  )
}