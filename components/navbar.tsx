"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { Search, Menu, X, LogOut, User, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useState } from "react"
import { useSearchStore } from "@/src/features/search"
import { useIdentity } from "@/src/hooks/use-identity"
import { useGetAuthMe } from "@/src/features/auth/api/use-get-auth-me"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { open } = useSearchStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: adminUser } = useGetAuthMe()
  const { data: publicIdentity } = useIdentity()

  const isAuthenticated = Boolean(adminUser?.id || publicIdentity?.authenticated)
  const isPublicUser = publicIdentity?.authenticated

  const handleLogout = async () => {
    try {
      await Promise.allSettled([
        fetch("/api/auth/logout", { method: "POST" }),
        fetch("/api/auth/orcid/logout", { method: "POST" }),
      ])
      queryClient.invalidateQueries()
      router.push("/")
      router.refresh()
    } catch (e) {
      console.error("Logout failed:", e)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo width={180} height={60} className="h-14 w-auto" />
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
          <Link href="/packages" className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1">
            <Package className="h-4 w-4 text-primary" />
            Packages
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
          {/* Search trigger pill — desktop */}
          <button
            id="navbar-search-trigger"
            type="button"
            onClick={open}
            aria-label="Open search (Ctrl+K)"
            className="hidden lg:flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <span className="ml-2 hidden items-center gap-1 xl:inline-flex whitespace-nowrap">
              <kbd className="inline-flex h-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-sans text-[11px] font-semibold text-muted-foreground shadow-sm">
                Ctrl
              </kbd>
              <span className="font-sans text-[10px] font-medium text-muted-foreground">+</span>
              <kbd className="inline-flex h-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-sans text-[11px] font-semibold text-muted-foreground shadow-sm">
                K
              </kbd>
            </span>
          </button>

          {/* Search icon — compact, for md screens */}
          <button
            type="button"
            onClick={open}
            aria-label="Open search"
            className="hidden md:flex lg:hidden items-center justify-center rounded-full border border-border bg-muted/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              {adminUser ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/admin/dashboard" className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" />
                    <span>{adminUser.full_name || "Admin"}</span>
                  </Link>
                </Button>
              ) : isPublicUser ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/account/stats" className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" />
                    <span>ORCID Profile</span>
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={handleLogout} className="flex items-center gap-1 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button size="sm" variant="ghost" asChild>
                <Link href="/admin/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}

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
            {/* Mobile search trigger */}
            <button
              type="button"
              onClick={() => { open(); setIsMenuOpen(false) }}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              <span>Search journals, solutions, FAQs…</span>
            </button>

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
            <Link href="/packages" className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1" onClick={() => setIsMenuOpen(false)}>
              <Package className="h-4 w-4 text-primary" />
              Packages
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
            <div className="flex flex-col gap-2 pt-2 border-t">
              {isAuthenticated ? (
                <>
                  {adminUser ? (
                    <Button size="sm" variant="outline" asChild onClick={() => setIsMenuOpen(false)}>
                      <Link href="/admin/dashboard">Admin Dashboard ({adminUser.full_name})</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" asChild onClick={() => setIsMenuOpen(false)}>
                      <Link href="/account/stats">ORCID Profile</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => { setIsMenuOpen(false); handleLogout(); }}>
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" asChild onClick={() => setIsMenuOpen(false)}>
                    <Link href="/admin/login">Login</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild onClick={() => setIsMenuOpen(false)}>
                    <Link href="/register">Register</Link>
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

