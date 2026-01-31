import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/lib/client/providers/query-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DigitoPub - Scientific Journals Platform",
  description: "Professional academic publishing platform showcasing scientific journals with digital innovation",
  icons: {
    icon: "/images/logodigitopub.png",
    apple: "/images/logodigitopub.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            storageKey="digitopub-theme"
          >
            {children}
            <Analytics />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
