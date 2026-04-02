"use client"

import Image from "next/image"
import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/src/lib/utils"

/* ------------------------------------------------------------------ */
/*  Props – simplified for the spotlight card                          */
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
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
      aria-label={`View details for ${title}`}
    >
      <article
        className={cn(
          /* shape & aspect */
          "relative flex flex-col overflow-hidden rounded-2xl",
          "aspect-[3/4]",

          /* surface */
          "bg-card text-card-foreground",
          "border border-border/40",

          /* dark mode: explicit contrast */
          "dark:bg-zinc-900 dark:border-zinc-800",

          /* shadow & depth */
          "shadow-md",

          /* transitions */
          "transition-all duration-300 ease-out",

          /* hover effects */
          "hover:scale-[1.03]",
          "hover:shadow-xl hover:shadow-primary/10",
          "hover:border-primary/40",

          /* dark mode: glow on hover */
          "dark:hover:shadow-lg dark:hover:shadow-primary/20",
          "dark:hover:border-primary/50"
        )}
      >
        {/* ── Image area ─────────────────────────────────── ~75 % */}
        <div className="relative w-full flex-[3] min-h-0 overflow-hidden bg-muted">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={`Cover for ${title}`}
              fill
              className={cn(
                "object-cover",
                "transition-transform duration-500 ease-out",
                "group-hover:scale-110"
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            /* Fallback when no image */
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60">
              <BookOpen
                className="h-16 w-16 text-muted-foreground/30 transition-transform duration-500 group-hover:scale-110"
                aria-hidden
              />
            </div>
          )}

          {/* Dark overlay – always visible in dark mode, fades in on hover in light */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              "bg-gradient-to-t from-black/60 via-black/10 to-transparent",
              "opacity-0 group-hover:opacity-100",
              "dark:opacity-40 dark:group-hover:opacity-70",
              "transition-opacity duration-300"
            )}
            aria-hidden
          />
        </div>

        {/* ── Content area ───────────────────────────────── ~25 % */}
        <div className="flex flex-[1] items-center justify-between gap-2 px-4 py-3">
          {/* Title – max 2 lines with ellipsis */}
          <h3
            className={cn(
              "text-sm font-semibold leading-snug tracking-tight",
              "line-clamp-2 flex-1 min-w-0",
              "text-foreground dark:text-white",
              "transition-colors duration-300",
              "group-hover:text-primary"
            )}
            title={title}
          >
            {title}
          </h3>

          {/* "View Details" — right-aligned */}
          <span
            className={cn(
              "inline-flex items-center gap-1 shrink-0",
              "text-xs font-medium",
              "text-muted-foreground/70 dark:text-zinc-400",
              "transition-all duration-300",
              "group-hover:text-primary group-hover:gap-1.5"
            )}
            aria-hidden
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  )
}
