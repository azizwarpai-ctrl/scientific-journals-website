export interface OjsUrls {
  /** The resolved slug (from ojs_path or website_url fallback). */
  slug: string | null
  /** Full submission URL, or null if no slug could be resolved. */
  submissionUrl: string | null
  /** Base OJS domain with no trailing slash. */
  domain: string
}

export function resolveOjsUrls(journal: {
  ojs_path?: string | null
  website_url?: string | null
}): OjsUrls {
  const ojsBaseUrl =
    process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://journals.digitopub.com"
  const domain = ojsBaseUrl.endsWith('/') ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl

  let targetSlug = journal.ojs_path || null
  if (!targetSlug) {
    if (journal.website_url) {
      try {
        const url = new URL(journal.website_url)
        const parts = url.pathname.split('/')
        targetSlug = parts.filter(Boolean).pop() || null
      } catch {
        const urlWithoutProtocol = journal.website_url.replace(/^https?:\/\//, '')
        const parts = urlWithoutProtocol.split('/')
        targetSlug = parts.filter(Boolean).pop() || null
      }
    }
  }

  const encodedSlug = targetSlug ? encodeURIComponent(targetSlug) : null
  const submissionUrl = encodedSlug ? `${domain}/index.php/${encodedSlug}/submission` : null

  return {
    slug: targetSlug,
    submissionUrl,
    domain,
  }
}
