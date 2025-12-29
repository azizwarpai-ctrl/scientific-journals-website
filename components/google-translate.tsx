"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    google: any
    googleTranslateElementInit: () => void
  }
}

export function GoogleTranslate() {
  useEffect(() => {
    const addScript = () => {
      const script = document.createElement("script")
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      script.async = true
      document.body.appendChild(script)
    }

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "en,ar,fr,it,es",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      )
    }

    if (!document.querySelector('script[src*="translate.google.com"]')) {
      addScript()
    }
  }, [])

  return <div id="google_translate_element" className="inline-block" style={{ minHeight: "40px" }}></div>
}
