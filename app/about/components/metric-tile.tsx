"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/src/lib/utils"
import { useCountUp } from "@/src/hooks/use-count-up"

export function MetricTile({
  icon: Icon,
  value,
  label,
  caption,
  accent = "primary",
}: {
  icon: React.ElementType
  value: number
  label: string
  caption?: string
  accent?: "primary" | "secondary"
}) {
  const { value: animated, ref } = useCountUp(value)
  return (
    <Card className="group relative overflow-hidden border-border/40 bg-background hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div
        className={cn(
          "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90",
          accent === "secondary" ? "bg-secondary/20" : "bg-primary/20"
        )}
        aria-hidden
      />
      <CardContent className="relative p-7">
        <div
          className={cn(
            "mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
            accent === "secondary"
              ? "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-foreground"
              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-5xl font-extrabold tracking-tight text-foreground leading-none">
          <span ref={ref} className="tabular-nums">
            {animated.toLocaleString()}
          </span>
        </div>
        <div className="mt-3 text-sm font-semibold text-foreground/80 uppercase tracking-wider">{label}</div>
        {caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}
        <div className={cn("mt-5 h-1 w-12 rounded-full", accent === "secondary" ? "bg-secondary" : "bg-primary")} />
      </CardContent>
    </Card>
  )
}
