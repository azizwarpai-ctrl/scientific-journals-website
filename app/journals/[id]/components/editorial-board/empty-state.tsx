import { Users } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 mb-6">
        <Users className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No board members found
      </h3>
      <p className="text-slate-600 dark:text-slate-400 max-w-sm">
        We couldn't find any information about the editorial board for this journal at the moment.
      </p>
    </div>
  )
}
