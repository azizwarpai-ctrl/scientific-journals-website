"use client"

import Image from "next/image"
import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/src/lib/utils"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
export interface JournalCardProps {
  /** Display title (max 2 lines, truncated) */
  title: string
  /** Full URL or path to cover image */
  coverImage?: string | null
  /** URL-safe slug used for /journals/[slug] routing */
  slug: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function JournalCard({ title, coverImage, slug }: JournalCardProps) {
  const href = `/journals/${encodeURIComponent(slug)}`

  return (
    <Link
      href={href}
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl h-full"
      aria-label={`View details for ${title}`}
    >
      <article
        className={cn(
          /* shape & layout */
          "relative flex flex-col h-full overflow-hidden rounded-2xl",

          /* surface */
          "bg-card text-card-foreground",
          "border border-border/50",

          /* dark mode: explicit contrast */
          "dark:bg-zinc-900 dark:border-zinc-800",

          /* shadow & depth */
          "shadow-sm",

          /* transitions */
          "transition-all duration-300 ease-out",

          /* hover effects */
          "hover:-translate-y-1 hover:scale-[1.02]",
          "hover:shadow-xl hover:shadow-primary/5",
          "hover:border-primary/30",

          /* dark mode: glow on hover */
          "dark:hover:shadow-lg dark:hover:shadow-primary/10",
          "dark:hover:border-primary/40"
        )}
      >
        {/* ── Image area ─────────────────────────────────── */}
        <div className="relative w-full aspect-[3/4] overflow-hidden bg-muted/30 dark:bg-zinc-950/50 flex items-center justify-center p-4">
          {coverImage ? (
            <div className="relative w-full h-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] rounded-md overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.03]">
              <Image
                src={coverImage}
                alt={`Cover for ${title}`}
                fill
                className="object-contain bg-white dark:bg-zinc-900"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </div>
          ) : (
            /* Fallback when no image */
            <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-muted to-muted/60 dark:from-zinc-800 dark:to-zinc-900 shadow-sm transition-transform duration-500 group-hover:scale-[1.03]">
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
              "bg-gradient-to-t from-black/5 via-transparent to-black/5",
              "opacity-50",
              "dark:from-black/40 dark:to-black/10 dark:opacity-80"
            )}
            aria-hidden
          />
        </div>

        {/* ── Content area ───────────────────────────────── */}
        <div className="flex flex-col flex-grow items-start justify-between gap-3 p-5">
          {/* Title */}
          <h3
            className={cn(
              "text-base font-bold leading-snug tracking-tight",
              "line-clamp-2 w-full",
              "text-foreground dark:text-zinc-100",
              "transition-colors duration-300",
              "group-hover:text-primary"
            )}
            title={title}
          >
            {title}
          </h3>

          {/* "View Details" Button Placeholder */}
          <div className="mt-auto w-full pt-2">
            <span
              className={cn(
                "inline-flex w-full items-center justify-center gap-2",
                "rounded-xl bg-muted/80 dark:bg-zinc-800 px-4 py-2.5",
                "text-sm font-semibold text-foreground dark:text-zinc-200",
                "transition-all duration-300",
                "group-hover:bg-primary group-hover:text-primary-foreground",
                "dark:group-hover:bg-primary dark:group-hover:text-primary-foreground"
              )}
              aria-hidden
            >
              View Details
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
