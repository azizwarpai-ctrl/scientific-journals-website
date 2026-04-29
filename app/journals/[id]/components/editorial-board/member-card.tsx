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
    <article className="group flex h-full flex-row overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="w-24 sm:w-1/3 flex-shrink-0">
        <MemberPhoto
          name={member.name}
          imageUrl={member.profileImage}
          className="aspect-square sm:aspect-[3/4] h-full w-full"
        />
      </div>

      <div className="flex w-[calc(100%-6rem)] sm:w-2/3 flex-1 flex-col gap-2 p-3 sm:p-4 min-w-0">
        <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2 break-words">
          {member.name}
        </h3>

        {member.affiliation && (
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3 break-words">
            {member.affiliation}
          </p>
        )}

        <div className="mt-auto pt-2">
          <div className="h-px bg-border/60" />
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className={
                isChief
                  ? "inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20"
                  : "inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-inset ring-border/60"
              }
              title={roleLabel}
            >
              {roleLabel}
            </span>

            {hasLinks && (
              <div className="flex items-center gap-1.5">
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
        </div>
      </div>
    </article>
  )
}
