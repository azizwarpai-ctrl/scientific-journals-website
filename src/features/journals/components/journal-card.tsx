"use client"

import Link from "next/link"
import { OjsImage } from "@/src/features/ojs/components/ojs-image"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
export interface JournalCardProps {
  /** Display title */
  title: string
  /** Full URL or path to cover image */
  coverImage?: string | null
  /** URL-safe slug used for /journals/[slug] routing */
  slug: string
  /** Optional Impact Factor (e.g., "3.567") */
  impactFactor?: string | null
  /** Access Type (e.g., "Open Access") */
  accessType?: string | null
  /** Editor-in-Chief name */
  editorName?: string | null
  /** Recent publications count */
  recentPublicationsCount?: number | null
  /** Fallback category/field */
  field?: string | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function JournalCard({ 
  title, 
  coverImage, 
  slug,
  impactFactor,
  accessType = "Peer-Reviewed",
  editorName,
  recentPublicationsCount,
  field
}: JournalCardProps) {
  const href = `/journals/${encodeURIComponent(slug)}`

  return (
    <Link
      href={href}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl h-full"
      aria-label={`View details for ${title}`}
    >
      <article
        className={cn(
          "glass-card relative flex flex-col md:flex-row overflow-hidden rounded-2xl h-full group"
        )}
      >
        {/* ── Image area ─────────────────────────────────── */}
        <div className="w-full md:w-5/12 overflow-hidden aspect-[4/3] md:aspect-auto relative bg-muted/20 dark:bg-zinc-950/50 flex items-center justify-center">
          {coverImage ? (
            <div className="relative w-full h-full">
              <OjsImage
                src={coverImage}
                alt={`Cover for ${title}`}
                fill
                className="cover-scale object-cover bg-white dark:bg-zinc-900"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : (
            /* Fallback when no image */
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60 dark:from-zinc-800 dark:to-zinc-900 cover-scale">
              <BookOpen
                className="h-16 w-16 text-muted-foreground/30"
                aria-hidden
              />
            </div>
          )}

          {/* Subtle vignette/overlay effect for depth */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              "bg-gradient-to-t from-black/20 via-transparent to-black/5",
              "opacity-50",
              "dark:from-black/60 dark:to-black/10 dark:opacity-80"
            )}
            aria-hidden
          />
        </div>

        {/* ── Content area ───────────────────────────────── */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {impactFactor && (
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-sans text-xs font-semibold tracking-wide">
                  IF {impactFactor}
                </span>
              )}
              {field && !impactFactor && (
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-sans text-xs font-semibold tracking-wide">
                  {field}
                </span>
              )}
              <span className="text-muted-foreground font-sans text-xs uppercase tracking-widest">
                {accessType}
              </span>
            </div>
            
            <h2 
              className="font-display text-2xl md:text-3xl font-semibold mb-4 text-foreground line-clamp-3"
              title={title}
            >
              {title}
            </h2>
            
            <div className="space-y-4 opacity-80 mt-6">
              {(editorName || field) && (
                <div>
                  <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {editorName ? "Editor-in-Chief" : "Focus Area"}
                  </p>
                  <p className="font-sans text-sm font-medium">{editorName || field}</p>
                </div>
              )}
              {recentPublicationsCount !== undefined && (
                <div>
                  <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Recent Publications
                  </p>
                  <p className="font-sans text-sm font-medium">{recentPublicationsCount} articles</p>
                </div>
              )}
            </div>
          </div>
          
          <Button asChild variant="default" className="mt-8 self-start font-sans text-xs font-semibold px-6 py-3 rounded-lg flex items-center gap-2 hover:shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all duration-300 group-active:scale-95 group/btn">
            <div>
              VIEW DETAILS
              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </div>
          </Button>
        </div>
      </article>
    </Link>
  )
}
