import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Publishing Packages & Pricing | DigitoPub",
  description: "Explore our flexible scientific journal publishing packages, indexing options, and manuscript workflow tools.",
  openGraph: {
    title: "Publishing Packages & Pricing | DigitoPub",
    description: "Explore our flexible scientific journal publishing packages, indexing options, and manuscript workflow tools.",
    type: "website",
  },
}

export default function PackagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-background">{children}</div>
}
