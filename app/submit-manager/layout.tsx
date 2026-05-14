import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "SubmitManager — Editorial Workflow Platform",
  description:
    "SubmitManager is DigitoPub's end-to-end editorial workflow platform — manage submissions, peer review, copyediting, and production for scientific journals.",
  alternates: {
    canonical: buildCanonical("/submit-manager"),
  },
  openGraph: {
    title: "SubmitManager — Editorial Workflow Platform",
    description:
      "End-to-end editorial workflow platform for scientific journals.",
    url: buildCanonical("/submit-manager"),
  },
}

export default function SubmitManagerLayout({ children }: { children: React.ReactNode }) {
  return children
}
