import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Guides for authors and reviewers, publication ethics, and answers to frequently asked questions about publishing on DigitoPub.",
  alternates: {
    canonical: buildCanonical("/help"),
  },
  openGraph: {
    title: "DigitoPub Help Centre",
    description:
      "Guides, policies, and FAQs for authors and reviewers publishing on DigitoPub.",
    url: buildCanonical("/help"),
  },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
