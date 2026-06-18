"use client"

import Link from "next/link"
import { OjsImage } from "@/src/features/ojs/components/ojs-image"
import { BookOpen, ArrowRight } from "lucide-react"
import { cn } from "@/src/lib/utils"

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */
export interface JournalCardProps {
  /** Display title (max 2 lines, truncated) */
  title: string
  /** Full URL or path to cover image */
  coverImage?: string | null
  /** URL-safe slug used for /journals/[slug] routing */
  slug: string
  /** The impact factor of the journal */
  impact_factor?: string | null
  /** Access type, e.g. Open Access */
  access_type?: string | null
  /** Editor in Chief name */
  editor_in_chief?: string | null
  /** Recent publications count */
  recent_publications_count?: number | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function JournalCard({
  title,
  coverImage,
  slug,
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
          /* shape & layout */
          "relative flex flex-col h-full overflow-hidden rounded-2xl cursor-pointer",

          /* ─── Light mode: frosted white glass ─── */
          "bg-white/70 backdrop-blur-xl",
          "border border-white/60",
          "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",

          /* ─── Dark mode: deep frosted glass ─── */
          "dark:bg-white/[0.04] dark:backdrop-blur-2xl",
          "dark:border-white/[0.08]",
          "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",

          /* transitions */
          "transition-all duration-500 ease-out",

          /* ─── Hover: light mode ─── */
          "hover:-translate-y-1.5 hover:scale-[1.015]",
          "hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
          "hover:border-primary/30",

          /* ─── Hover: dark mode ─── */
          "dark:hover:shadow-[0_20px_50px_rgba(14,165,233,0.12)]",
          "dark:hover:border-sky-500/25",
          "dark:hover:bg-white/[0.06]"
        )}
      >
        {/* ── Image area ─── fills top of card edge-to-edge ─── */}
        <div className="relative w-full aspect-[3/4] overflow-hidden">
          {coverImage ? (
            <>
              {/* Blurred ambient background layer */}
              <div className="absolute inset-0 scale-125 opacity-40 blur-3xl" aria-hidden="true">
                <OjsImage
                  src={coverImage}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>

              {/* Actual cover image */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  "bg-gradient-to-b from-gray-100/50 to-gray-200/30",
                  "dark:from-slate-900/60 dark:to-slate-950/40"
                )}
              >
                <div
                  className={cn(
                    "relative w-full h-full overflow-hidden",
                    "shadow-[0_4px_24px_rgba(0,0,0,0.15)]",
                    "dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]",
                    "transition-all duration-[600ms] ease-out",
                    "group-hover:scale-[1.05]",
                    "group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]",
                    "dark:group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
                  )}
                >
                  <OjsImage
                    src={coverImage}
                    alt={`Cover for ${title}`}
                    fill
                    className="object-cover bg-white dark:bg-zinc-900"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-black/40">
                        <BookOpen className="h-16 w-16 text-gray-300 dark:text-zinc-700" aria-hidden />
                      </div>
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            /* Fallback when no image */
            <div
              className={cn(
                "flex h-full w-full items-center justify-center",
                "bg-gradient-to-br from-gray-100 to-gray-200/80",
                "dark:from-slate-900 dark:to-slate-950",
                "transition-transform duration-[600ms]",
                "group-hover:scale-[1.03]"
              )}
            >
              <BookOpen
                className="h-16 w-16 text-gray-300 dark:text-slate-700 transition-colors duration-500 group-hover:text-primary/40 dark:group-hover:text-sky-500/40"
                aria-hidden
              />
            </div>
          )}

          {/* Bottom gradient vignette for depth */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              "bg-gradient-to-t from-black/[0.03] via-transparent to-transparent",
              "dark:from-black/30 dark:via-transparent dark:to-black/10"
            )}
            aria-hidden
          />
        </div>

        {/* ── Content area ─── title + CTA ─── */}
        <div className="flex flex-col flex-grow items-center justify-center gap-2.5 p-4">
          {/* Title */}
          <h3
            className={cn(
              "text-sm font-semibold leading-tight tracking-tight text-center",
              "line-clamp-2 w-full",
              "text-foreground/90 dark:text-zinc-100",
              "transition-colors duration-300",
              "group-hover:text-primary dark:group-hover:text-sky-400"
            )}
            title={title}
          >
            {title}
          </h3>

          {/* "View Details" Button */}
          <div className="flex w-full justify-center">
            <span
              className={cn(
                "inline-flex items-center justify-center gap-1.5",
                "rounded-lg px-3.5 py-1.5",

                /* Light mode */
                "bg-gray-100/80 text-foreground/70",
                "border border-gray-200/60",

                /* Dark mode */
                "dark:bg-white/[0.06] dark:text-zinc-300",
                "dark:border-white/[0.08]",

                /* Typography */
                "text-xs font-medium",

                /* Transitions */
                "transition-all duration-300",

                /* Hover */
                "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/50",
                "group-hover:shadow-[0_4px_16px_rgba(var(--color-primary),0.25)]",
                "dark:group-hover:bg-sky-500 dark:group-hover:text-white dark:group-hover:border-sky-400/50",
                "dark:group-hover:shadow-[0_4px_16px_rgba(14,165,233,0.3)]"
              )}
              aria-hidden
            >
              View Details
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
