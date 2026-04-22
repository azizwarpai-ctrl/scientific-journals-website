import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"
import { AdvisoryMemberCard } from "./advisory-member-card"

interface AdvisoryRoleSectionProps {
  roleName: string
  members: EditorialBoardMember[]
  totalCount: number
}

export function AdvisoryRoleSection({ roleName, members, totalCount }: AdvisoryRoleSectionProps) {
  const shownCount = members.length
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {roleName}
          </p>
          <span className="text-xs text-muted-foreground/60">
            {totalCount} {totalCount === 1 ? "member" : "members"}
          </span>
        </div>
        <div className="mt-2 h-px bg-border" />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-4xl">
        {members.map((member) => (
          <AdvisoryMemberCard key={member.userId} member={member} />
        ))}
      </div>

      {totalCount > shownCount && (
        <p className="text-xs text-muted-foreground">
          +{totalCount - shownCount} more
        </p>
      )}
    </div>
  )
}
