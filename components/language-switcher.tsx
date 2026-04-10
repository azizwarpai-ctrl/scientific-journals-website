"use client"

import { useState, useEffect, useCallback } from "react"
import { Languages, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const LANGUAGES = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "es", label: "Español", flag: "🇪🇸" },
] as const

type LangCode = (typeof LANGUAGES)[number]["code"]

/**
 * Reads the current language from Google Translate's cookie.
 * The cookie format is: /en/xx where xx is the target language.
 */
function getCurrentLanguage(): LangCode {
    if (typeof document === "undefined") return "en"
    const match = document.cookie.match(/googtrans=\/en\/(\w+)/)
    return (match?.[1] as LangCode) || "en"
}

/**
 * Sets the Google Translate cookie and reloads to apply the translation.
 * Google Translate uses this cookie to determine the target language.
 */
function setLanguage(lang: LangCode) {
    if (lang === "en") {
        // Clear the translation cookie to revert to original
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + window.location.hostname
    } else {
        const value = `/en/${lang}`
        document.cookie = `googtrans=${value}; path=/`
        document.cookie = `googtrans=${value}; path=/; domain=.${window.location.hostname}`
    }
    window.location.reload()
}

export function LanguageSwitcher() {
    const [currentLang, setCurrentLang] = useState<LangCode>("en")

    useEffect(() => {
        setCurrentLang(getCurrentLanguage())

        // Load the Google Translate script once (hidden — we only use the translation engine)
        const existingScript = document.querySelector('script[src*="translate.google.com"]')
        if (existingScript) {
            return
        }

        // Define the callback before loading
        window.googleTranslateElementInit = () => {
            // Create a hidden container for the translate widget
            let container = document.getElementById("google_translate_element")
            if (!container) {
                container = document.createElement("div")
                container.id = "google_translate_element"
                container.style.display = "none"
                document.body.appendChild(container)
            }

            if (window.google?.translate?.TranslateElement) {
                new window.google.translate.TranslateElement(
                    {
                        pageLanguage: "en",
                        includedLanguages: "en,ar,fr,it,es",
                        autoDisplay: false,
                    },
                    "google_translate_element"
                )
            }
        }

        const script = document.createElement("script")
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        script.async = true
        script.onerror = () => {} // Still allow UI to show even if script fails
        document.body.appendChild(script)
    }, [])

    const handleSelect = useCallback((code: LangCode) => {
        if (code === currentLang) return
        setLanguage(code)
    }, [currentLang])

    const currentLanguage = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sm font-normal">
                    <Languages className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.label}</span>
                    <span className="sm:hidden">{currentLanguage.flag}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleSelect(lang.code)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                        </span>
                        {currentLang === lang.code && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
