import { MemberCard } from "./member-card"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

interface RoleSectionProps {
  roleName: string
  members: EditorialBoardMember[]
  totalCount: number
  shownCount: number
}

export function RoleSection({ roleName, members, totalCount, shownCount }: RoleSectionProps) {
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
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
