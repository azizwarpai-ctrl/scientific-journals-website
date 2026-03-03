"use client"

import { useEffect, useState, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Languages } from "lucide-react"

declare global {
  interface Window {
    google: any
    googleTranslateElementInit: () => void
  }
}

export function GoogleTranslate() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return

    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    const initTranslateWidget = () => {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,ar,fr,it,es",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element",
        )
        setIsLoaded(true)
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    }

    const checkScriptLoaded = () => {
      if (window.google && window.google.translate) {
        initTranslateWidget()
        return true
      }
      return false
    }

    checkScriptLoaded()

    window.googleTranslateElementInit = () => {
      initTranslateWidget()
    }

    const addScript = () => {
      const script = document.createElement("script")
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      script.onerror = () => {
        setError(true)
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
      document.body.appendChild(script)
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="translate.google.com"]')
    if (!existingScript) {
      addScript()
    } else if (window.google && window.google.translate) {
      initTranslateWidget()
    }

    // Initialize the widget if it hasn't been yet (polling fallback)
    pollingRef.current = setInterval(initTranslateWidget, 1000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  if (error) return null

  return (
    <div className="flex items-center gap-2 min-h-[40px]">
      {!isLoaded && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background/50 animate-pulse">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
      <div
        id="google_translate_element"
        className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0 absolute -z-10"}`}
      ></div>
    </div>
  )
}
