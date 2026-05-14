import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

// Layout metadata only applies to the listing route /journals. Per-journal
// metadata for /journals/[id] is defined in app/journals/[id]/layout.tsx
// and takes precedence for that segment.
export const metadata: Metadata = {
  title: "Scientific Journals",
  description:
    "Browse the full catalogue of peer-reviewed scientific journals published on DigitoPub — current issues, archives, and open-access articles.",
  alternates: {
    canonical: buildCanonical("/journals"),
  },
  openGraph: {
    title: "Scientific Journals on DigitoPub",
    description:
      "Browse the full catalogue of peer-reviewed scientific journals on DigitoPub.",
    url: buildCanonical("/journals"),
  },
}

export default function JournalsListLayout({ children }: { children: React.ReactNode }) {
  return children
}
