import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Publishing Solutions",
  description:
    "Comprehensive digital publishing solutions for journals, editors, and researchers — submission management, peer review, indexing, and long-term preservation.",
  alternates: {
    canonical: buildCanonical("/solutions"),
  },
  openGraph: {
    title: "Publishing Solutions on DigitoPub",
    description:
      "Digital publishing solutions for journals, editors, and researchers.",
    url: buildCanonical("/solutions"),
  },
}

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return children
}
