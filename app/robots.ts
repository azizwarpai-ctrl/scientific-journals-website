import type { MetadataRoute } from "next"

import { buildCanonical } from "@/src/lib/seo/canonical"

export default function robots(): MetadataRoute.Robots {
  const appUrl = buildCanonical("/")

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/auth/", "/_next/"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  }
}
