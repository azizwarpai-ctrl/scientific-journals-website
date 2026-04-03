"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Search, BookOpen, Zap, HelpCircle, Loader2, X, ArrowUpRight, FileText } from "lucide-react"
import { useSearch, useSearchStore } from "@/src/features/search"
import type { SearchResult } from "@/src/features/search"

// ─── Type configuration ──────────────────────────────────────────────────────
const TYPE_CONFIG = {
  journal: {
    icon: BookOpen,
    label: "Journal",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-400/10",
  },
  solution: {
    icon: Zap,
    label: "Solution",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
  },
  faq: {
    icon: HelpCircle,
    label: "FAQ",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
  },
  page: {
    icon: FileText,
    label: "Page",
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-500/10 dark:bg-purple-400/10",
  },
} as const

type ResultType = keyof typeof TYPE_CONFIG

// ─── Component ───────────────────────────────────────────────────────────────
export function CommandPalette() {
  const router = useRouter()
  const { isOpen, open, close } = useSearchStore()

  const [inputValue, setInputValue] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Global keyboard shortcut: Ctrl+K / Cmd+K and Escape ──────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        if (isOpen) {
          close()
        } else {
          open()
        }
      }
      if (e.key === "Escape" && isOpen) {
        close()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, open, close])

  // ── Debounce input → query (300 ms) ──────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue.trim()), 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  // ── Focus on open; clear on close ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Small delay lets the DOM mount before we focus
      const t = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          // Ensure cursor is at the end if there is text
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length)
        }
      }, 50)
      return () => clearTimeout(t)
    } else {
      setInputValue("")
      setDebouncedQuery("")
    }
  }, [isOpen])

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data, isFetching } = useSearch(debouncedQuery)
  const results = data?.data?.results ?? []

  // Group results by content type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (url: string) => {
      close()
      router.push(url)
    },
    [close, router],
  )

  const handleViewAll = useCallback(() => {
    if (debouncedQuery.length >= 2) {
      close()
      router.push(`/search?q=${encodeURIComponent(debouncedQuery)}`)
    }
  }, [close, router, debouncedQuery])

  // ── Loading state delay to prevent flicker ────────────────────────────────
  const [showLoadingState, setShowLoadingState] = useState(false)
  useEffect(() => {
    let t: NodeJS.Timeout
    if (isFetching && debouncedQuery.length >= 2) {
      t = setTimeout(() => setShowLoadingState(true), 200) // 200ms delay
    } else {
      setShowLoadingState(false)
    }
    return () => clearTimeout(t)
  }, [isFetching, debouncedQuery])

  // ── Guard: nothing to render when closed ─────────────────────────────────
  if (!isOpen) return null

  const isIdle = !debouncedQuery || debouncedQuery.length < 2
  const showLoading = !isIdle && showLoadingState
  const showNoResults = !isIdle && !isFetching && results.length === 0
  const showResults = !isIdle && results.length > 0

  return (
    // ── Overlay ─────────────────────────────────────────────────────────────
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search DigitoPub"
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[10vh] sm:pt-[12vh]"
      onMouseDown={close}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* ── Modal panel ───────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ animation: "cmdPaletteIn 180ms cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <Command shouldFilter={false} loop className="flex flex-col">
          {/* ── Input row ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {showLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            <Command.Input
              ref={inputRef}
              autoFocus
              value={inputValue}
              onValueChange={setInputValue}
              placeholder="Search journals, solutions, FAQs…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 caret-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // If no item is selected by cmdk, trigger a programmatic search
                  const activeItem = document.querySelector('[cmdk-item][data-selected="true"]')
                  if (!activeItem && inputValue.trim()) {
                    e.preventDefault()
                    close()
                    router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)
                  }
                }
              }}
            />

            {inputValue && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setInputValue("")
                  inputRef.current?.focus()
                }}
                className="rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <kbd
              onClick={close}
              className="hidden cursor-pointer select-none items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted/80 sm:inline-flex"
            >
              ESC
            </kbd>
          </div>

          {/* ── Results list ──────────────────────────────────────────────── */}
          <Command.List className="max-h-[55vh] scroll-smooth overflow-y-auto overscroll-contain">
            {/* Idle / empty query */}
            {isIdle && (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Search DigitoPub</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Find journals, solutions, and FAQs
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[9px]">
                      ↑
                    </kbd>
                    <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[9px]">
                      ↓
                    </kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[9px]">
                      ↵
                    </kbd>
                    open
                  </span>
                </div>
              </div>
            )}

            {/* Loading spinner */}
            {showLoading && (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No results */}
            {showNoResults && (
              <Command.Empty className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                  No results for &ldquo;{debouncedQuery}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground">
                  Try different keywords or browse our pages
                </p>
              </Command.Empty>
            )}

            {/* Results grouped by type */}
            {showResults && (
              <div className="py-2">
                {Object.entries(grouped).map(([type, items]) => {
                  const config = TYPE_CONFIG[type as ResultType]
                  if (!config) return null
                  const { icon: Icon, label, color, bg } = config

                  return (
                    <Command.Group
                      key={type}
                      heading={`${label}s`}
                      className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60"
                    >
                      {items.map((result) => (
                        <Command.Item
                          key={`${result.type}-${result.id}`}
                          value={`${result.type}-${result.id}-${result.title}`}
                          onSelect={() => handleNavigate(result.url)}
                          className="group mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors aria-selected:bg-accent aria-selected:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                        >
                          {/* Type icon */}
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Title + description */}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium leading-tight">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="line-clamp-1 text-xs text-muted-foreground mt-0.5">
                                {result.description}
                              </p>
                            )}
                          </div>

                          {/* Type badge + arrow */}
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              {label}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-aria-selected:opacity-100 group-data-[selected=true]:opacity-100" />
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )
                })}

                {/* View all results */}
                {results.length >= 5 && (
                  <div className="mx-2 mt-2 border-t border-border pt-2">
                    <Command.Item
                      value="__view-all__"
                      onSelect={handleViewAll}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-primary outline-none transition-colors aria-selected:bg-primary/10 data-[selected=true]:bg-primary/10"
                    >
                      <Search className="h-3.5 w-3.5" />
                      View all results for &ldquo;{debouncedQuery}&rdquo;
                    </Command.Item>
                  </div>
                )}
              </div>
            )}
          </Command.List>

          {/* ── Footer keyboard hints ─────────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">
                  ↵
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">
                  ↑
                </kbd>
                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">
                  ↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">
                  ESC
                </kbd>
                close
              </span>
            </div>
            <span className="hidden font-medium opacity-50 sm:block">DigitoPub</span>
          </div>
        </Command>
      </div>

      {/* Keyframe animation injected inline for zero-dependency entry */}
      <style>{`
        @keyframes cmdPaletteIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  )
}
