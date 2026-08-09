import { Skeleton } from "@/components/ui/skeleton"

const CELL_WIDTHS = ["w-full", "w-4/5", "w-3/5", "w-11/12", "w-2/3"]

export function TableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header bar */}
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="grid gap-4" style={gridStyle}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5">
            <div className="grid gap-4" style={gridStyle}>
              {Array.from({ length: columns }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={`h-4 ${CELL_WIDTHS[(r + c) % CELL_WIDTHS.length]}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
