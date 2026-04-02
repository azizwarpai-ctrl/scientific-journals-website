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
          /* shape & fixed height */
          "relative flex flex-col overflow-hidden rounded-2xl",
          "h-[320px]",

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
        {/* ── Image area ─────────────────────────────────── 78 % */}
        <div className="relative w-full h-[78%] min-h-0 overflow-hidden bg-muted">
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

        {/* ── Content area ───────────────────────────────── 22 % */}
        <div className="flex h-[22%] flex-col items-center justify-center gap-1 px-3 py-2">
          {/* Title – centered, max 2 lines with ellipsis */}
          <h3
            className={cn(
              "text-sm font-semibold leading-snug tracking-tight",
              "line-clamp-2 w-full text-center",
              "text-foreground dark:text-white",
              "transition-colors duration-300",
              "group-hover:text-primary"
            )}
            title={title}
          >
            {title}
          </h3>

          {/* "View Details" — centered below title */}
          <span
            className={cn(
              "inline-flex items-center gap-1",
              "text-[11px] font-medium",
              "text-muted-foreground/70 dark:text-zinc-400",
              "transition-all duration-300",
              "group-hover:text-primary group-hover:gap-1.5"
            )}
            aria-hidden
          >
            View Details
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  )
}
