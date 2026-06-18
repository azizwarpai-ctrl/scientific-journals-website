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
      className="group block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-3xl h-full"
      aria-label={`View details for ${title}`}
    >
      <article
        className={cn(
          "relative flex flex-col h-full rounded-3xl cursor-pointer overflow-hidden",
          "bg-white dark:bg-slate-900/60 dark:backdrop-blur-md",
          "border border-slate-100 dark:border-slate-800",
          "shadow-md shadow-slate-200/50 dark:shadow-none",
          "transition-all duration-[600ms] ease-out",
          "hover:-translate-y-1.5 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
          "hover:border-blue-500/40 dark:hover:border-blue-500/50"
        )}
      >
        {/* Cover Image */}
        <div className="relative w-full aspect-[3/4] overflow-hidden bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
          {coverImage ? (
            <OjsImage
              src={coverImage}
              alt={`Cover for ${title}`}
              fill
              className="object-cover transition-transform duration-[600ms] group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-16 w-16 text-slate-300 dark:text-slate-600" aria-hidden />
                </div>
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center transition-transform duration-[600ms] group-hover:scale-105">
              <BookOpen className="h-16 w-16 text-slate-300 dark:text-slate-600 transition-colors duration-500 group-hover:text-blue-500/40" aria-hidden />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-grow justify-between p-5">
          <h3
            className="text-base font-semibold leading-tight text-center text-slate-900 dark:text-white line-clamp-2 w-full mb-5 transition-colors duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            title={title}
          >
            {title}
          </h3>

          <span
            className={cn(
              "flex items-center justify-center gap-1.5 w-full mt-auto",
              "bg-blue-600 text-white",
              "py-2.5 px-5 rounded-xl font-semibold text-sm",
              "transition-all duration-300 ease-out",
              "group-hover:bg-blue-500 group-hover:shadow-md group-hover:shadow-blue-500/20"
            )}
            aria-hidden
          >
            View Details
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </article>
    </Link>
  )
}
