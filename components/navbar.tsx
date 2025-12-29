"use client"

import Link from "next/link"
import Image from "next/image"
import { Search, Menu, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { GoogleTranslate } from "@/components/google-translate"
import { useState } from "react"
import { useLanguage } from "@/hooks/use-language"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logodigitopub.jpeg" alt="DigitoPub" width={120} height={40} className="h-10 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            {t("home")}
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
            {t("about")}
          </Link>
          <Link href="/journals" className="text-sm font-medium transition-colors hover:text-primary">
            {t("journals")}
          </Link>
          <Link href="/solutions" className="text-sm font-medium transition-colors hover:text-primary">
            {t("solutions")}
          </Link>
          <Link href="/submit-manager" className="text-sm font-medium transition-colors hover:text-primary">
            {t("submitManager")}
          </Link>
          <Link href="/help" className="text-sm font-medium transition-colors hover:text-primary">
            {t("help")}
          </Link>
          <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
            {t("contact")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden lg:block">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search journals..."
              className="w-64 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="hidden lg:block">
            <GoogleTranslate />
          </div>
          <ThemeToggle />
          <LanguageSwitcher />
          <Button variant="outline" size="sm" asChild className="hidden md:flex bg-transparent">
            <Link href="/login">
              <User className="mr-2 h-4 w-4" />
              {t("login")}
            </Link>
          </Button>
          <Button size="sm" asChild className="hidden md:flex">
            <Link href="/register">{t("register")}</Link>
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
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search journals..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              {t("home")}
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
              {t("about")}
            </Link>
            <Link href="/journals" className="text-sm font-medium transition-colors hover:text-primary">
              {t("journals")}
            </Link>
            <Link href="/solutions" className="text-sm font-medium transition-colors hover:text-primary">
              {t("solutions")}
            </Link>
            <Link href="/submit-manager" className="text-sm font-medium transition-colors hover:text-primary">
              {t("submitManager")}
            </Link>
            <Link href="/help" className="text-sm font-medium transition-colors hover:text-primary">
              {t("help")}
            </Link>
            <Link href="/contact" className="text-sm font-medium transition-colors hover:text-primary">
              {t("contact")}
            </Link>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link href="/register">{t("register")}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
