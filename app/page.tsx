import type { Metadata } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"
import HomePageClient from "./home-page-client"

export const metadata: Metadata = {
  alternates: {
    canonical: buildCanonical("/"),
  },
}

export default function HomePage() {
  return <HomePageClient />
}
