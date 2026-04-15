import { Award } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getRoleStyle } from "./role-styles"
import { MemberCard } from "./member-card"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

interface RoleGroupProps {
  roleDisplayName: string
  roleId: number
  groupTotalCount: number
  members: EditorialBoardMember[]
}

export function RoleGroup({ roleDisplayName, roleId, groupTotalCount, members }: RoleGroupProps) {
  const style = getRoleStyle(roleId)
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <div className={`h-2 w-2 rounded-full ${style.dot} shrink-0`} />
        <Award className={`h-4 w-4 ${style.text} shrink-0`} />
        <Badge variant="outline" className={`text-xs font-bold tracking-wide uppercase ${style.badge}`}>
          {roleDisplayName}
        </Badge>
        <span className="text-xs text-muted-foreground">({groupTotalCount})</span>
        <div className="flex-1 h-px bg-border/40 ml-1" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </div>
    </div>
  )
}
