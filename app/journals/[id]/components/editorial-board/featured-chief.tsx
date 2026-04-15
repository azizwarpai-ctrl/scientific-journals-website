import { Building2, GraduationCap, Microscope, Globe } from "lucide-react"
import { MemberAvatar } from "./member-avatar"
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

function ChiefCard({ member }: { member: EditorialBoardMember }) {
  const safeScholar = safeMemberUrl(member.googleScholar)
  const safeScopus = safeMemberUrl(member.scopus)
  const safeUrl = safeMemberUrl(member.url)
  const hasLinks = member.orcid || safeScholar || safeScopus || safeUrl

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex">
        {/* Primary left accent bar */}
        <div className="w-1 bg-primary shrink-0" />
        <div className="flex-1 p-5 flex items-start gap-4">
          <MemberAvatar name={member.name} imageUrl={member.profileImage} size="lg" />
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="font-bold text-sm text-foreground leading-snug">{member.name}</p>
              <p className="mt-0.5 text-xs font-medium text-primary">Editor-in-Chief</p>
            </div>
            {member.affiliation && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-relaxed">
                <Building2 className="h-3.5 w-3.5 shrink-0 mt-px" />
                <span>{member.affiliation}</span>
              </div>
            )}
            {hasLinks && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2">
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
        </div>
      </div>
    </div>
  )
}

interface FeaturedChiefProps {
  members: EditorialBoardMember[]
  totalCount: number
}

export function FeaturedChief({ members, totalCount }: FeaturedChiefProps) {
  if (members.length === 0) return null

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Editor-in-Chief
        </p>
        <div className="mt-2 h-px bg-border" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {members.map((member) => (
          <ChiefCard key={member.userId} member={member} />
        ))}
      </div>
      {totalCount > members.length && (
        <p className="text-xs text-muted-foreground">
          +{totalCount - members.length} more
        </p>
      )}
    </div>
  )
}
