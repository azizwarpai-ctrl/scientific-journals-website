import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Submission Service",
  description:
    "Get help preparing and submitting your manuscript to DigitoPub journals — formatting, ethical review, and editorial guidance.",
  alternates: {
    canonical: buildCanonical("/help/submission-service"),
  },
  openGraph: {
    title: "Submission Service — DigitoPub Help",
    description:
      "Help preparing and submitting your manuscript to DigitoPub journals.",
    url: buildCanonical("/help/submission-service"),
  },
}

export default function SubmissionServiceLayout({ children }: { children: React.ReactNode }) {
  return children
}
