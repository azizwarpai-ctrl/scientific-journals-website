import { Award, Star } from "lucide-react"
import { MemberCard } from "./member-card"
import type { EditorialBoardMember } from "@/src/features/journals/types/editorial-board-types"

interface FeaturedChiefProps {
  members: EditorialBoardMember[]
  totalCount: number
}

export function FeaturedChief({ members, totalCount }: FeaturedChiefProps) {
  if (members.length === 0) return null

  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 ring-1 ring-amber-100 dark:ring-amber-900/30">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Editor-in-Chief</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Leading the journal's strategic vision and academic direction
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-4xl">
        {members.map((member) => (
          <MemberCard key={member.userId} member={member} />
        ))}
      </div>
      
      {totalCount > members.length && (
         <div className="mt-4 text-sm text-slate-500 italic">
           + {totalCount - members.length} more in this role
         </div>
      )}
    </div>
  )
}
