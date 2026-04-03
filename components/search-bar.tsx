"use client"

import { Search } from "lucide-react"
import { useSearchStore } from "@/src/features/search"

interface SearchBarProps {
  placeholder?: string
  id?: string
  // Kept for backward compatibility with pages that might still pass them
  value?: string
  onChange?: (val: string) => void
  autoFocus?: boolean
}

/**
 * Visual trigger for the Command Palette.
 * Replaces the old functional search bar.
 */
export function SearchBar({
  placeholder = "Search journals, solutions, and FAQs…",
  id = "search-bar-trigger",
}: SearchBarProps) {
  const { open } = useSearchStore()

  return (
    <button
      type="button"
      id={id}
      onClick={open}
      className="relative flex w-full items-center gap-2 rounded-full border-2 border-border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]"
    >
      <Search className="h-5 w-5 shrink-0 opacity-50" />
      <span className="flex-1 truncate">{placeholder}</span>

      {/* Ctrl K badge */}
      <span className="hidden sm:inline-flex items-center gap-1 whitespace-nowrap">
        <kbd className="inline-flex h-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-sans text-[11px] font-semibold text-muted-foreground shadow-sm">
          Ctrl
        </kbd>
        <span className="font-sans text-[10px] font-medium text-muted-foreground">+</span>
        <kbd className="inline-flex h-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-sans text-[11px] font-semibold text-muted-foreground shadow-sm">
          K
        </kbd>
      </span>
    </button>
  )
}

