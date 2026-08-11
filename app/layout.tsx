import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { GlobalToaster } from "@/components/global-toaster"
import { CommandPalette } from "@/components/command-palette"
import { ConsentBannerHost } from "@/components/consent-banner-host"
import { AuthErrorBanner } from "@/components/auth/auth-error-banner"
import { OrganizationJsonLd } from "@/components/seo/organization-jsonld"
import "./globals.css"

// The design tokens in globals.css have always named Geist as --font-sans,
// but no font was actually loaded until now — browsers silently fell back to
// the system stack. next/font self-hosts the files at build time (no runtime
// Google request) and exposes them via CSS variables consumed in @theme.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

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
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "DigitoPub",
    url: "/",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "DigitoPub Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/android-chrome-512x512.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
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
            {/* Hotfix A3: surfaces ?auth_error= / ?signin=unavailable as toasts */}
            <AuthErrorBanner />
          </QueryProvider>
          <GlobalToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

