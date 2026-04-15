import { Building2, GraduationCap, Microscope, Globe, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MemberAvatar } from "./member-avatar"
import { getRoleStyle } from "./role-styles"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

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

interface MemberCardProps {
  member: EditorialBoardMember
}

export function MemberCard({ member }: MemberCardProps) {
  const roleStyle = getRoleStyle(member.roleId)
  const safeUrl = safeMemberUrl(member.url)
  const safeScholar = safeMemberUrl(member.googleScholar)
  const safeScopus = safeMemberUrl(member.scopus)
  const hasLinks = member.orcid || safeScholar || safeScopus || safeUrl

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Avatar + name row */}
      <div className="flex items-start gap-3">
        <MemberAvatar name={member.name} imageUrl={member.profileImage} />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-sm leading-snug text-foreground">{member.name}</p>
          <Badge
            variant="outline"
            className={`mt-1.5 text-[11px] font-semibold ${roleStyle.badge}`}
          >
            {member.role}
          </Badge>
        </div>
      </div>

      {/* Affiliation */}
      {member.affiliation && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-snug">
          <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-50" />
          <span className="line-clamp-2">{member.affiliation}</span>
        </div>
      )}

      {/* Profile links */}
      {hasLinks && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/30 mt-auto">
          {member.orcid && (
            <a
              href={`https://orcid.org/${member.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`ORCID profile for ${member.name}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-2 py-1 hover:bg-muted/60 transition-colors text-[#A6CE39] hover:text-[#89ab30]"
            >
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-[#A6CE39] text-white text-[9px] font-black leading-none shrink-0">
                iD
              </span>
              ORCID
            </a>
          )}

          {safeScholar && (
            <a
              href={safeScholar}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Google Scholar profile for ${member.name}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-2 py-1 hover:bg-muted/60 transition-colors text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              Scholar
            </a>
          )}

          {safeScopus && (
            <a
              href={safeScopus}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Scopus profile for ${member.name}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-2 py-1 hover:bg-muted/60 transition-colors text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
            >
              <Microscope className="h-4 w-4 shrink-0" />
              Scopus
            </a>
          )}

          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Website for ${member.name}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-md px-2 py-1 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-primary"
            >
              <Globe className="h-4 w-4 shrink-0" />
              Profile
              <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
