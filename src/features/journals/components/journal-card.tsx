import { InteractiveCard } from "@/components/ui/interactive-card"
import { CardContent } from "@/components/ui/card"
import Image from "next/image"
import { BookOpen, ExternalLink, Globe, Hash } from "lucide-react"
import { cn } from "@/src/lib/utils"

export interface JournalCardProps {
  id: string
  title: string
  description?: string | null
  issn?: string | null
  field?: string | null
  publisher?: string | null
  coverImage?: string | null
  ojsId?: string | number | null
  variant?: "default" | "featured" | "compact"
}

export function JournalCard({
  id,
  title,
  description,
  issn,
  field,
  publisher,
  coverImage,
  ojsId,
  variant = "default",
}: JournalCardProps) {
  const segment = encodeURIComponent(ojsId ?? id)
  const href = `/journals/${segment}`
  
  const imageHeight = {
    compact: "h-48",
    default: "h-56",
    featured: "h-72",
  }[variant]

  const isCompact = variant === "compact"

  return (
    <InteractiveCard 
      href={href} 
      className={cn(
        "h-full overflow-hidden",
        "border-border/50 hover:border-primary/30",
        "shadow-sm hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-500 ease-out"
      )}
    >
      {/* Image Container with Academic Gradient Treatment */}
      <div className={cn(
        "relative w-full overflow-hidden bg-slate-50 dark:bg-slate-900",
        "after:absolute after:inset-0 after:bg-gradient-to-t after:from-slate-900/80 after:via-slate-900/20 after:to-transparent",
        "after:opacity-60 group-hover:after:opacity-80 after:transition-opacity after:duration-500",
        imageHeight
      )}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`Cover for ${title}`}
            fill
            className="object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:brightness-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <BookOpen className="h-20 w-20 text-slate-300 dark:text-slate-700 transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}
        
        {/* Field Badge - Positioned with Academic Authority */}
        {field && (
          <div className="absolute top-4 left-4 z-10">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "bg-white/95 dark:bg-slate-950/95 backdrop-blur-md",
              "text-xs font-semibold text-slate-800 dark:text-slate-200",
              "border border-slate-200/50 dark:border-slate-800/50",
              "shadow-lg shadow-black/5",
              "transform transition-all duration-300 group-hover:translate-y-0.5"
            )}>
              <Globe className="h-3 w-3 text-primary" />
              {field}
            </span>
          </div>
        )}

        {/* ISSN Badge - Bottom Right for Academic Credibility */}
        {issn && !isCompact && (
          <div className="absolute bottom-4 right-4 z-10">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1",
              "bg-black/40 backdrop-blur-md text-white/90",
              "text-[10px] font-mono font-medium tracking-wider uppercase",
              "border border-white/10",
              "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
              "transition-all duration-300 delay-75"
            )}>
              <Hash className="h-3 w-3" />
              ISSN {issn}
            </span>
          </div>
        )}
      </div>
      
      <CardContent className={cn(
        "flex flex-col flex-1",
        isCompact ? "p-4" : "p-6"
      )}>
        {/* Title with Improved Typography */}
        <h3 className={cn(
          "font-bold tracking-tight text-foreground line-clamp-2 supports-[text-wrap:balance]:text-balance",
          "group-hover:text-primary transition-colors duration-300",
          isCompact ? "text-base mb-2" : "text-lg mb-3 leading-snug"
        )}>
          {title}
        </h3>
        
        {/* Description with Better Readability */}
        {description && !isCompact && (
          <p className="mb-4 text-sm text-muted-foreground/80 line-clamp-3 leading-relaxed flex-1">
            {description}
          </p>
        )}
        
        {/* Metadata Footer */}
        <div className={cn(
          "mt-auto pt-4 flex items-center justify-between",
          "border-t border-border/60",
          isCompact && "pt-3"
        )}>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {publisher && (
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                {publisher}
              </span>
            )}
            {issn && isCompact && (
              <span className="text-[10px] font-mono text-muted-foreground/70">
                ISSN: {issn}
              </span>
            )}
          </div>
          
          {/* Action Indicator */}
          <span className={cn(
            "flex items-center gap-1 text-xs font-semibold text-primary",
            "opacity-70 group-hover:opacity-100 transform group-hover:translate-x-0.5",
            "transition-all duration-300"
          )}>
            {!isCompact && "View"}
            <ExternalLink className={cn(
              "transition-transform duration-300 group-hover:rotate-12",
              isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
            )} />
          </span>
        </div>
      </CardContent>
    </InteractiveCard>
  )
}
