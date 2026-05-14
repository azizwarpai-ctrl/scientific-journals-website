import type React from "react"
import type { Metadata, Viewport } from "next"

import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { GlobalToaster } from "@/components/global-toaster"
import { CommandPalette } from "@/components/command-palette"
import { ConsentBannerHost } from "@/components/consent-banner-host"
import { LoginModal } from "@/components/auth/login-modal"
import { OrganizationJsonLd } from "@/components/seo/organization-jsonld"
import "./globals.css"

// metadataBase resolves relative OG / Twitter / canonical URLs against the
// production origin. Without it, those tags emit hostnames like localhost
// in production HTML.
const RAW_APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://digitopub.com").replace(/\/+$/, "")
// Guard against a misconfigured env var that lacks a scheme (e.g. "example.com")
// which would make `new URL()` throw at module-evaluation time.
const APP_URL = RAW_APP_URL.startsWith("http://") || RAW_APP_URL.startsWith("https://")
  ? RAW_APP_URL
  : `https://${RAW_APP_URL}`

function safeMetadataBase(): URL {
  try {
    return new URL(APP_URL)
  } catch {
    return new URL("https://digitopub.com")
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: safeMetadataBase(),
  title: {
    default: "DigitoPub - Scientific Journals Platform",
    template: "%s | DigitoPub",
  },
  description:
    "DigitoPub is an open-access scientific journal publishing platform — discover peer-reviewed articles, browse journal archives, and follow current research across multiple disciplines.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "DigitoPub",
    url: "/",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "DigitoPub Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/icon.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        {/* Sitewide Organization schema for search engines (server-rendered). */}
        <OrganizationJsonLd appUrl={APP_URL} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="digitopub-theme"
        >
          <QueryProvider>
            {/* Global command palette — Ctrl+K from anywhere */}
            <CommandPalette />
            {children}
            {/* UIET-P1: global consent banner; renders null when flag is off */}
            <ConsentBannerHost />
            {/* UIET-P1: imperative login modal; lazily mounted on first open */}
            <LoginModal />
          </QueryProvider>
          <Analytics />
          <GlobalToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

