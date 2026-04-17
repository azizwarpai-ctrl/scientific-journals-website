import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/src/lib/utils"

export function PillarCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  accent,
}: {
  icon: React.ElementType
  eyebrow: string
  title: string
  body: string
  accent: "primary" | "secondary"
}) {
  return (
    <Card
      className={cn(
        "relative h-full overflow-hidden border-border/40 bg-background transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
        "group"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5",
          accent === "secondary" ? "bg-secondary" : "bg-primary"
        )}
      />
      <CardContent className="p-8 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110",
              accent === "secondary"
                ? "bg-secondary/10 text-secondary"
                : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <span className={cn(
            "text-xs font-semibold uppercase tracking-[0.2em]",
            accent === "secondary" ? "text-secondary" : "text-primary"
          )}>
            {eyebrow}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{title}</h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{body}</p>
      </CardContent>
    </Card>
  )
}
