"use client"

import Link from "next/link"
import Image from "next/image"
import { Search, Menu, X, BookOpen, Zap, HelpCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSearch } from "@/src/features/search"
import type { SearchResult } from "@/src/features/search"
import { highlightText } from "@/src/lib/highlight-text"

const TYPE_ICONS: Record<string, React.ElementType> = {
  journal: BookOpen,
  solution: Zap,
  faq: HelpCircle,
}

const TYPE_LABELS: Record<string, string> = {
  journal: "Journal",
  solution: "Solution",
  faq: "FAQ",
}

export function Navbar() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { data: searchData, isLoading: isSearching } = useSearch(debouncedQuery)

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }, [])

  // Submit search (Enter key)
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setShowDropdown(false)
      setIsMenuOpen(false)
    }
  }, [searchQuery, router])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current && !searchRef.current.contains(event.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        const input = searchRef.current?.querySelector("input")
        input?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const results = searchData?.data?.results || []

  const renderSearchDropdown = () => {
    if (!showDropdown || debouncedQuery.length < 2) return null

    return (
      <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-xl z-[60] max-h-80 overflow-y-auto">
        {isSearching ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results found for &ldquo;{debouncedQuery}&rdquo;
          </div>
        ) : (
          <div className="py-1">
            {results.slice(0, 8).map((result: SearchResult) => {
              const Icon = TYPE_ICONS[result.type] || BookOpen
              return (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors"
                  onClick={() => {
                    setShowDropdown(false)
                    setSearchQuery("")
                    setDebouncedQuery("")
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate">{highlightText(result.title, debouncedQuery)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {highlightText(result.description, debouncedQuery)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5">
                    {TYPE_LABELS[result.type]}
                  </span>
                </Link>
              )
            })}
            {results.length > 8 && (
              <Link
                href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                className="block border-t px-4 py-3 text-center text-sm font-medium text-primary hover:bg-accent transition-colors"
                onClick={() => {
                  setShowDropdown(false)
                  setSearchQuery("")
                  setDebouncedQuery("")
                }}
              >
                View all {results.length} results →
              </Link>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logodigitopub.png" alt="DigitoPub" width={180} height={60} className="h-14 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
            About
          </Link>
          <Link href="/journals" className="text-sm font-medium transition-colors hover:text-primary">
            Journals
          </Link>
          <Link href="/solutions" className="text-sm font-medium transition-colors hover:text-primary">
            Solutions
          </Link>
          <Link href="/submit-manager" className="text-sm font-medium transition-colors hover:text-primary">
            Submit Manager
          </Link>
          <Link href="/help" className="text-sm font-medium transition-colors hover:text-primary">
            Help
          </Link>
          <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden lg:block" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="navbar-search"
                type="search"
                placeholder="Search... (Ctrl+K)"
                className="w-64 pl-8 pr-2"
                value={searchQuery}
                onChange={(e) => {
                  handleSearchChange(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => {
                  if (debouncedQuery.length >= 2) setShowDropdown(true)
                }}
              />
            </form>
            {renderSearchDropdown()}
          </div>
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />
          <Button size="sm" asChild className="hidden md:flex">
            <Link href="/register">Register</Link>
          </Button>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t md:hidden">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-4">
            <div className="relative" ref={mobileSearchRef}>
              <form onSubmit={handleSearchSubmit}>
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => {
                    handleSearchChange(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => {
                    if (debouncedQuery.length >= 2) setShowDropdown(true)
                  }}
                />
              </form>
              {renderSearchDropdown()}
            </div>
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              About
            </Link>
            <Link href="/journals" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              Journals
            </Link>
            <Link href="/solutions" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              Solutions
            </Link>
            <Link href="/submit-manager" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              Submit Manager
            </Link>
            <Link href="/help" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              Help
            </Link>
            <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary" onClick={() => setIsMenuOpen(false)}>
              Contact
            </Link>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
