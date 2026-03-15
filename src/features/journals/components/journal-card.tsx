import { InteractiveCard } from "@/components/ui/interactive-card"
import { CardContent } from "@/components/ui/card"
import Image from "next/image"
import { BookOpen } from "lucide-react"

export interface JournalCardProps {
  id: string
  title: string
  description?: string | null
  issn?: string | null
  field?: string | null
  publisher?: string | null
  coverImage?: string | null
  ojsId?: string | number | null
  variant?: "default" | "featured"
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
  const href = `/journals/${ojsId || id}`
  const imageHeight = variant === "featured" ? "h-64" : "h-56"

  return (
    <InteractiveCard href={href} className="h-full">
      <div className={`relative w-full overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/10 ${imageHeight}`}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={`Cover for ${title}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center opacity-40">
            <BookOpen className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Subtle gradient overlay to ensure badge readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Badges container */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          {field && (
            <span className="inline-block rounded-full bg-primary/95 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-md shadow-sm">
              {field}
            </span>
          )}
        </div>
      </div>
      
      <CardContent className="flex flex-col flex-1 p-5">
        <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground line-clamp-2 text-balance group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        {issn && (
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            ISSN: {issn}
          </p>
        )}
        
        {description && (
          <p className="mb-4 text-sm text-muted-foreground line-clamp-3 flex-1">
            {description}
          </p>
        )}
        
        {publisher && (
          <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
            <span className="font-medium text-slate-600 dark:text-slate-400">{publisher}</span>
            <span className="text-primary font-medium group-hover:underline">View Details</span>
          </div>
        )}
        
        {!publisher && (
          <div className="mt-auto pt-4 flex items-center justify-end text-xs border-t border-border/50">
            <span className="text-primary font-medium group-hover:underline">View Details</span>
          </div>
        )}
      </CardContent>
    </InteractiveCard>
  )
}
