import { Users } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-3 rounded-full bg-muted mb-4">
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No board members found</p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        Editorial board information for this journal is not currently available.
      </p>
    </div>
  )
}
