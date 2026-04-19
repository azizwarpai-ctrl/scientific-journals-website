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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <MemberPhoto
        name={member.name}
        imageUrl={member.profileImage}
        className="aspect-[3/4] w-full"
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="space-y-1.5">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
            {member.name}
          </h3>
          <span
            className={
              isChief
                ? "inline-flex max-w-full items-center truncate rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20"
                : "inline-flex max-w-full items-center truncate rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border/60"
            }
            title={roleLabel}
          >
            {roleLabel}
          </span>
        </div>

        {member.affiliation && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {member.affiliation}
          </p>
        )}

        {hasLinks && (
          <div className="mt-auto flex items-center gap-1.5 pt-2">
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
      </div>
    </article>
  )
}
