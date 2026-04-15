import { Building2, GraduationCap, Microscope, Globe } from "lucide-react"
import { MemberAvatar } from "./member-avatar"
import { getRoleConfig } from "./role-styles"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

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
  const config = getRoleConfig(member.roleId)
  const safeUrl = safeMemberUrl(member.url)
  const safeScholar = safeMemberUrl(member.googleScholar)
  const safeScopus = safeMemberUrl(member.scopus)
  const hasLinks = member.orcid || safeScholar || safeScopus || safeUrl
  const roleLabel = config.label || member.role

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-sm">
      {/* Avatar + name */}
      <div className="flex items-start gap-3">
        <MemberAvatar name={member.name} imageUrl={member.profileImage} size="md" />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-sm leading-snug text-foreground">{member.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
        </div>
      </div>

      {/* Affiliation */}
      {member.affiliation && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
          <Building2 className="h-3.5 w-3.5 shrink-0 mt-px" />
          <span className="line-clamp-2">{member.affiliation}</span>
        </div>
      )}

      {/* Profile links */}
      {hasLinks && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-3 border-t border-border/40 mt-auto">
          {member.orcid && (
            <a
              href={`https://orcid.org/${member.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`ORCID profile for ${member.name}`}
              className="inline-flex items-center gap-1 text-xs text-[#A6CE39] hover:text-[#89ab30] transition-colors font-medium"
            >
              <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-[#A6CE39] text-white text-[8px] font-black leading-none shrink-0">
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
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
              Scholar
            </a>
          )}
          {safeScopus && (
            <a
              href={safeScopus}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Scopus profile for ${member.name}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <Microscope className="h-3.5 w-3.5 shrink-0" />
              Scopus
            </a>
          )}
          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Website for ${member.name}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              Profile
            </a>
          )}
        </div>
      )}
    </div>
  )
}
