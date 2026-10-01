"use client"

import { ABOUT_METADATA } from "@/src/features/journals/about-slugs"


export interface AboutNavPillsProps {
  activeAboutSlug: string | null
  onPillClick: (slug: string) => void
}

export function AboutNavPills({ activeAboutSlug, onPillClick }: AboutNavPillsProps) {
  return (
    <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 sm:mx-0 sm:px-0 sm:top-20">
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar scroll-smooth">
        {ABOUT_METADATA.map((meta) => {
          const isActive =
            activeAboutSlug === meta.slug || (!activeAboutSlug && meta.slug === "aims-scope")
          return (
            <button
              key={meta.slug}
              type="button"
              onClick={() => onPillClick(meta.slug)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {meta.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}
