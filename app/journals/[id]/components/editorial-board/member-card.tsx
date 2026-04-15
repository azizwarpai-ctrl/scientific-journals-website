import { GraduationCap } from "lucide-react"
import { MemberPhoto } from "./member-avatar"
import { getRoleConfig } from "./role-styles"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

/** Returns `url` only when it uses http(s) — rejects javascript:, data:, etc. */
function safeLink(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const { protocol } = new URL(url)
    if (protocol === "https:" || protocol === "http:") return url
  } catch {
    /* malformed URL — discard */
  }
  return null
}

interface MemberCardProps {
  member: EditorialBoardMember
}

export function MemberCard({ member }: MemberCardProps) {
  const config = getRoleConfig(member.roleId)
  // When the role ID is unknown, getRoleConfig returns the default placeholder
  // config whose label is a generic "Board Member" string. Fall back to the
  // free-text role parsed from OJS in that case so headings like "Advisory
  // Board" actually surface instead of being flattened to the placeholder.
  const roleLabel = config.tier === "default" ? member.role : config.label
  const isChief = config.tier === "chief"

  const orcidUrl = member.orcid ? `https://orcid.org/${member.orcid}` : null
  const scholarUrl = safeLink(member.googleScholar)
  const scopusUrl = safeLink(member.scopus)
  const hasLinks = orcidUrl || scholarUrl || scopusUrl

  return (
    <article className="group flex flex-col rounded-2xl border border-border/60 bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      {/* Portrait — 4:5 aspect, rounded 20px */}
      <MemberPhoto
        name={member.name}
        imageUrl={member.profileImage}
        className="aspect-[4/5] w-full rounded-[18px]"
      />

      {/* Identity block */}
      <div className="flex flex-1 flex-col gap-2 px-1 pt-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
          {member.name}
        </h3>

        <div>
          <span
            className={
              isChief
                ? "inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                : "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            }
          >
            {roleLabel}
          </span>
        </div>

        {member.affiliation && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {member.affiliation}
          </p>
        )}
      </div>

      {/* Profile links — DOI-style icon buttons, only rendered when present */}
      {hasLinks && (
        <div className="mt-4 flex items-center gap-1.5 border-t border-border/40 px-1 pt-3">
          {orcidUrl && (
            <a
              href={orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`ORCID profile for ${member.name}`}
              title="ORCID"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-[#A6CE39]/10 text-[#A6CE39] transition-colors hover:bg-[#A6CE39] hover:text-white"
            >
              <span className="text-[10px] font-black leading-none">iD</span>
            </a>
          )}
          {scholarUrl && (
            <a
              href={scholarUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Google Scholar profile for ${member.name}`}
              title="Google Scholar"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-[#4285F4]/10 text-[#4285F4] transition-colors hover:bg-[#4285F4] hover:text-white"
            >
              <GraduationCap className="h-4 w-4" />
            </a>
          )}
          {scopusUrl && (
            <a
              href={scopusUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Scopus profile for ${member.name}`}
              title="Scopus"
              className="inline-flex size-8 items-center justify-center rounded-lg bg-[#E9711C]/10 text-[#E9711C] transition-colors hover:bg-[#E9711C] hover:text-white"
            >
              <span className="text-[11px] font-black leading-none">S</span>
            </a>
          )}
        </div>
      )}
    </article>
  )
}
