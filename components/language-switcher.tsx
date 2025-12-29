"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

const languages = [
  { code: "en" as const, name: "English", flag: "🇬🇧" },
  { code: "ar" as const, name: "العربية", flag: "🇸🇦" },
  { code: "fr" as const, name: "Français", flag: "🇫🇷" },
  { code: "it" as const, name: "Italiano", flag: "🇮🇹" },
  { code: "es" as const, name: "Español", flag: "🇪🇸" },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => setLanguage(lang.code)} className="cursor-pointer">
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
