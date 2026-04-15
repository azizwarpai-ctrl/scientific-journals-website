import { MemberCard } from "./member-card"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

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

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
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
