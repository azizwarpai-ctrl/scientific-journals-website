import { GraduationCap } from "lucide-react"
import { MemberPhoto } from "./member-avatar"
import { getRoleConfig } from "./role-styles"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

function safeLink(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    if (protocol === "https:" || protocol === "http:") return url
  } catch {
    /* malformed URL */
  }
  return null
}

interface MemberCardProps {
  member: EditorialBoardMember
}

export function MemberCard({ member }: MemberCardProps) {
  const config = getRoleConfig(member.roleId)
  const roleLabel = config.tier === "default" ? member.role : config.label
  const isChief = config.tier === "chief"

  const orcidUrl = member.orcid ? `https://orcid.org/${member.orcid}` : null
  const scholarUrl = safeLink(member.googleScholar)
  const scopusUrl = safeLink(member.scopus)
  const hasLinks = orcidUrl || scholarUrl || scopusUrl

  return (
    <article className="group flex items-start gap-3.5 rounded-xl border border-border/50 bg-card p-3.5 sm:p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-sm h-full">
      {/* Square portrait with rounded edges — larger than the legacy circular
          avatar so the face is recognisable at a glance while keeping cards
          compact enough for a 3-up grid. */}
      <div className="shrink-0">
        <MemberPhoto
          name={member.name}
          imageUrl={member.profileImage}
          className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg ring-1 ring-border/60"
        />
      </div>

      {/* Identity + role + links */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground min-w-0 flex-1 break-words">
            {member.name}
          </h3>
          <span
            className={
              isChief
                ? "shrink-0 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20"
                : "shrink-0 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border border-border/50"
            }
          >
            {roleLabel}
          </span>
        </div>

        {member.affiliation && (
          <p className="text-[11px] leading-snug text-muted-foreground line-clamp-3">
            {member.affiliation}
          </p>
        )}

        {hasLinks && (
          <div className="mt-1 flex items-center gap-1.5">
            {orcidUrl && (
              <a
                href={orcidUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`ORCID profile for ${member.name}`}
                title="ORCID"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#A6CE39]/10 text-[#A6CE39] transition-colors hover:bg-[#A6CE39] hover:text-white"
              >
                <span className="text-[8px] font-black leading-none">iD</span>
              </a>
            )}
            {scholarUrl && (
              <a
                href={scholarUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Google Scholar profile for ${member.name}`}
                title="Google Scholar"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#4285F4]/10 text-[#4285F4] transition-colors hover:bg-[#4285F4] hover:text-white"
              >
                <GraduationCap className="h-3 w-3" />
              </a>
            )}
            {scopusUrl && (
              <a
                href={scopusUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Scopus profile for ${member.name}`}
                title="Scopus"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#E9711C]/10 text-[#E9711C] transition-colors hover:bg-[#E9711C] hover:text-white"
              >
                <span className="text-[9px] font-black leading-none">S</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
