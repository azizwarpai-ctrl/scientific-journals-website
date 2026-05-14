import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Technical Support",
  description:
    "Contact DigitoPub technical support for help with your account, journal portal, or platform issues.",
  alternates: {
    canonical: buildCanonical("/help/technical-support"),
  },
  openGraph: {
    title: "Technical Support — DigitoPub Help",
    description:
      "Technical support for DigitoPub accounts, journal portals, and platform issues.",
    url: buildCanonical("/help/technical-support"),
  },
}

export default function TechnicalSupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
