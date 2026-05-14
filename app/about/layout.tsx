import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export const metadata: Metadata = {
  title: "About DigitoPub",
  description:
    "DigitoPub is the official publishing platform of Digitodontics International Academy — empowering open, transparent, and high-impact scholarly communication.",
  alternates: {
    canonical: buildCanonical("/about"),
  },
  openGraph: {
    title: "About DigitoPub",
    description:
      "Empowering open, transparent, and high-impact scholarly communication through digital innovation.",
    url: buildCanonical("/about"),
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
