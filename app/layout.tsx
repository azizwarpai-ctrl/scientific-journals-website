import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { GlobalToaster } from "@/components/global-toaster"
import { CommandPalette } from "@/components/command-palette"
import "./globals.css"

export const metadata: Metadata = {
  title: "DigitoPub - Scientific Journals Platform",
  description: "Professional academic publishing platform showcasing scientific journals with digital innovation",
  icons: {
    icon: "/favicon.ico?v=2",
    apple: "/apple-icon.png",
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
          </QueryProvider>
          <Analytics />
          <GlobalToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

