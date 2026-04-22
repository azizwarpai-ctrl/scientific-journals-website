import { type EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { ExternalLink, GraduationCap } from "lucide-react"

interface AdvisoryMemberCardProps {
  member: EditorialBoardMember
}

export function AdvisoryMemberCard({ member }: AdvisoryMemberCardProps) {
  return (
    <div className="group relative flex h-full flex-col border border-border bg-card transition-all hover:border-primary/30 hover:bg-accent/5">
      {/* 1. Header/Info Section */}
      <div className="p-5 flex-1 space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {member.name}
          </h3>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            {member.role}
          </p>
        </div>

        {member.affiliation && (
          <div className="flex items-start gap-2 pt-1">
            <GraduationCap className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/60" />
            <span className="text-sm leading-relaxed text-muted-foreground">
              {member.affiliation}
            </span>
          </div>
        )}
      </div>

      {/* 2. Social/Links Bar - Sharp & Minimal */}
      {(member.orcid || member.googleScholar || member.scopus || member.url) && (
        <div className="mt-auto border-t border-border/60 bg-muted/30 px-5 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {member.orcid && (
              <a
                href={`https://orcid.org/${member.orcid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-[#A6CE39] transition-colors"
              >
                <div className="flex h-4 w-4 items-center justify-center border border-muted-foreground/30 text-[9px]">ID</div>
                ORCID
              </a>
            )}
            {member.googleScholar && (
              <a
                href={member.googleScholar}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-[#4285F4] transition-colors"
              >
                <div className="flex h-4 w-4 items-center justify-center border border-muted-foreground/30 text-[9px]">GS</div>
                Scholar
              </a>
            )}
            {member.scopus && (
              <a
                href={member.scopus}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-[#ff6600] transition-colors"
              >
                <div className="flex h-4 w-4 items-center justify-center border border-muted-foreground/30 text-[9px]">SC</div>
                Scopus
              </a>
            )}
            {member.url && (
              <a
                href={member.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors ml-auto"
              >
                <ExternalLink className="h-3 w-3" />
                Profile
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* Decorative Corner Element - Premium Touch */}
      <div className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-transparent transition-colors group-hover:border-primary/20" />
    </div>
  )
}
