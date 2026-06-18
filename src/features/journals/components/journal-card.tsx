"use client"

import Link from "next/link"
import { OjsImage } from "@/src/features/ojs/components/ojs-image"
import { BookOpen, ArrowRight, BarChart2, FileText, User } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { Badge } from "@/components/ui/badge"

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
  impact_factor,
  access_type,
  editor_in_chief,
  recent_publications_count
}: JournalCardProps) {
  const href = `/journals/${encodeURIComponent(slug)}`

  const isOpenAccess = access_type?.toLowerCase().includes("open")

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
          "bg-white/5 backdrop-blur-xl",
          "border border-white/10",

          /* dark mode defaults (this is a dark modern grid design, so it defaults to dark style but respects light mode gracefully) */
          "dark:bg-zinc-900/50 dark:border-zinc-800/80",

          /* shadow & depth */
          "shadow-[0_8px_30px_rgb(0,0,0,0.12)]",

          /* transitions */
          "transition-all duration-500 ease-out",

          /* hover effects */
          "hover:-translate-y-2 hover:scale-[1.02]",
          "hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)] hover:border-sky-500/30",
          "dark:hover:shadow-[0_20px_40px_rgba(14,165,233,0.2)] dark:hover:border-sky-500/40"
        )}
      >
        {/* ── Image area ─────────────────────────────────── */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
          {coverImage ? (
            <>
              {/* Background blur for images that don't cover the full aspect ratio */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                style={{ backgroundImage: `url(${coverImage})` }}
                aria-hidden="true"
              />
              <div className="relative w-[75%] h-[85%] shadow-2xl rounded-md overflow-hidden transition-transform duration-700 ease-out group-hover:scale-[1.05] group-hover:-translate-y-1">
                <OjsImage
                  src={coverImage}
                  alt={`Cover for ${title}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </div>
            </>
          ) : (
            /* Fallback when no image */
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 transition-transform duration-700 group-hover:scale-[1.05]">
              <BookOpen
                className="h-20 w-20 text-slate-700 transition-colors duration-500 group-hover:text-sky-500/50"
                aria-hidden
              />
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            {isOpenAccess && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-md px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider">
                Open Access
              </Badge>
            )}
            {access_type && !isOpenAccess && (
              <Badge variant="outline" className="bg-black/40 text-slate-200 border-white/20 backdrop-blur-md px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider">
                {access_type}
              </Badge>
            )}
          </div>

          {/* Subtle vignette/overlay effect for depth */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
            aria-hidden
          />
        </div>

        {/* ── Content area ───────────────────────────────── */}
        <div className="flex flex-col flex-grow p-5 gap-4">

          <div className="flex flex-col gap-2">
            {/* Title */}
            <h3
              className={cn(
                "text-lg font-bold leading-tight tracking-tight",
                "line-clamp-2 w-full",
                "text-slate-100 dark:text-zinc-50",
                "transition-colors duration-300",
                "group-hover:text-sky-400"
              )}
              title={title}
            >
              {title}
            </h3>

            {/* Editor in Chief */}
            {editor_in_chief && (
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <User className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{editor_in_chief}</span>
              </div>
            )}
          </div>

          <div className="flex-grow" />

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/10">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Impact Factor</span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <BarChart2 className="h-4 w-4 text-sky-400" />
                <span>{impact_factor || "N/A"}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Articles</span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <FileText className="h-4 w-4 text-indigo-400" />
                <span>{recent_publications_count ?? "N/A"}</span>
              </div>
            </div>
          </div>

          {/* "View Details" Call to Action */}
          <div className="flex w-full items-center justify-between pt-1">
            <span className="text-sm font-medium text-sky-400 group-hover:text-sky-300 transition-colors duration-300">
              Explore Journal
            </span>
            <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-sky-500 group-hover:border-sky-400 transition-all duration-300">
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-white transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
