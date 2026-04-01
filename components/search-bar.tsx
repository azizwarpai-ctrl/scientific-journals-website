"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSearchStore } from "@/src/features/search"
import { useCallback } from "react"
import { useRouter } from "next/navigation"

interface SearchBarProps {
  /** Controlled value */
  value: string
  onChange: (val: string) => void
  onSubmit?: (val: string) => void
  placeholder?: string
  autoFocus?: boolean
  id?: string
}

/**
 * Reusable search bar for the /search results page.
 * Pressing Enter navigates to /search?q=... .
 * Clicking the ⌘K badge opens the command palette instead.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search journals, solutions, and FAQs…",
  autoFocus = false,
  id = "search-bar-input",
}: SearchBarProps) {
  const router = useRouter()
  const { open } = useSearchStore()

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const q = value.trim()
      if (q.length >= 2) {
        if (onSubmit) {
          onSubmit(q)
        } else {
          router.push(`/search?q=${encodeURIComponent(q)}`)
        }
      }
    },
    [value, onSubmit, router],
  )

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      {/* Search icon */}
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />

      {/* Input */}
      <Input
        id={id}
        type="search"
        placeholder={placeholder}
        className="h-12 rounded-full border-2 pl-12 pr-32 text-base transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {/* Right side: ⌘K badge + submit button */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {/* Command palette hint */}
        <button
          type="button"
          onClick={open}
          aria-label="Open command palette (Ctrl+K)"
          className="hidden sm:flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          ⌘K
        </button>

        {/* Submit */}
        <Button type="submit" size="sm" className="rounded-full" disabled={value.trim().length < 2}>
          Search
        </Button>
      </div>
    </form>
  )
}
