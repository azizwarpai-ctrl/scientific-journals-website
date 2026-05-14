import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "Contact DigitoPub",
  description:
    "Get in touch with the DigitoPub team for editorial inquiries, technical support, partnership opportunities, and submission assistance.",
  alternates: {
    canonical: buildCanonical("/contact"),
  },
  openGraph: {
    title: "Contact DigitoPub",
    description: "Get in touch with the DigitoPub team.",
    url: buildCanonical("/contact"),
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
