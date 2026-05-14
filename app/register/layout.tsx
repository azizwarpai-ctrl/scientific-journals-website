import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Create your DigitoPub account",
  description:
    "Register for a DigitoPub account to submit manuscripts and access SubmitManager for editorial workflows.",
  alternates: {
    canonical: buildCanonical("/register"),
  },
  openGraph: {
    title: "Create your DigitoPub account",
    description: "Register to submit manuscripts and use SubmitManager.",
    url: buildCanonical("/register"),
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
