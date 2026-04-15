import { Award } from "lucide-react"
import { MemberCard } from "./member-card"
import { getRoleStyle } from "./role-styles"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

interface RoleSectionProps {
  roleName: string
  members: EditorialBoardMember[]
  totalCount: number
  shownCount: number
}

export function RoleSection({ roleName, members, totalCount, shownCount }: RoleSectionProps) {
  // Use a heuristic for roleId since we only have roleName here from the grouped object
  // In a real scenario, we might want to pass the roleId from the grouping logic
  const memberWithRoleId = members.find(m => m.roleId)
  const style = getRoleStyle(memberWithRoleId?.roleId ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${style.badge} ring-1 ring-inset border-none shadow-sm`}>
          <Award className={`h-4 w-4 ${style.text}`} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {roleName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">
            {totalCount} {totalCount === 1 ? 'Member' : 'Members'}
          </p>
        </div>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800 ml-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </div>
      
      {totalCount > shownCount && (
        <p className="text-sm text-slate-500 italic mt-2">
          ... and {totalCount - shownCount} more
        </p>
      )}
    </div>
  )
}
