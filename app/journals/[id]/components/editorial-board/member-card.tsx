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
    <article className="group flex flex-col rounded-xl border border-border/50 bg-card transition-all duration-200 hover:border-border hover:shadow-md overflow-hidden h-full">
      {/* Portrait photo */}
      <div className="relative overflow-hidden bg-muted/30 shrink-0">
        <MemberPhoto
          name={member.name}
          imageUrl={member.profileImage}
          className="aspect-[3/4] w-full"
        />
        {/* Role badge overlaid on photo */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-start">
          <span
            className={
              isChief
                ? "inline-flex items-center rounded-md bg-primary/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                : "inline-flex items-center rounded-md bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm border border-border/30"
            }
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Identity */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-2">
          {member.name}
        </h3>

        {member.affiliation && (
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {member.affiliation}
          </p>
        )}
      </div>

      {/* Profile links */}
      {hasLinks && (
        <div className="flex items-center gap-1.5 px-3 pb-3 border-t border-border/30 pt-2.5">
          {orcidUrl && (
            <a
              href={orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`ORCID profile for ${member.name}`}
              title="ORCID"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#A6CE39]/10 text-[#A6CE39] transition-colors hover:bg-[#A6CE39] hover:text-white"
            >
              <span className="text-[9px] font-black leading-none">iD</span>
            </a>
          )}
          {scholarUrl && (
            <a
              href={scholarUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Google Scholar profile for ${member.name}`}
              title="Google Scholar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#4285F4]/10 text-[#4285F4] transition-colors hover:bg-[#4285F4] hover:text-white"
            >
              <GraduationCap className="h-3.5 w-3.5" />
            </a>
          )}
          {scopusUrl && (
            <a
              href={scopusUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Scopus profile for ${member.name}`}
              title="Scopus"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#E9711C]/10 text-[#E9711C] transition-colors hover:bg-[#E9711C] hover:text-white"
            >
              <span className="text-[10px] font-black leading-none">S</span>
            </a>
          )}
        </div>
      )}
    </article>
  )
}
