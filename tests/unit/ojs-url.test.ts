import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { resolveOjsUrls } from "@/src/features/journals/utils/ojs-url"

describe("ojs-url", () => {
  const originalEnv = process.env.NEXT_PUBLIC_OJS_BASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_OJS_BASE_URL = originalEnv
  })

  it("resolves direct slug from ojs_path when present", () => {
    const urls = resolveOjsUrls({
      ojs_path: "journal-of-applied-sciences",
      website_url: "https://journals.digitopub.com/index.php/other-slug",
    })
    expect(urls.slug).toBe("journal-of-applied-sciences")
    expect(urls.submissionUrl).toBe(
      "https://journals.digitopub.com/index.php/journal-of-applied-sciences/submission"
    )
    expect(urls.domain).toBe("https://journals.digitopub.com")
  })

  it("falls back to website_url pathname when ojs_path is missing", () => {
    const urls = resolveOjsUrls({
      ojs_path: null,
      website_url: "https://journals.digitopub.com/index.php/fallback-slug",
    })
    expect(urls.slug).toBe("fallback-slug")
    expect(urls.submissionUrl).toBe(
      "https://journals.digitopub.com/index.php/fallback-slug/submission"
    )
  })

  it("handles trailing slash on OJS base URL cleanly", () => {
    process.env.NEXT_PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com/"
    const urls = resolveOjsUrls({ ojs_path: "my-journal" })
    expect(urls.domain).toBe("https://journals.digitopub.com")
    expect(urls.submissionUrl).toBe(
      "https://journals.digitopub.com/index.php/my-journal/submission"
    )
  })

  it("returns null submissionUrl and slug when neither ojs_path nor website_url are provided", () => {
    const urls = resolveOjsUrls({})
    expect(urls.slug).toBeNull()
    expect(urls.submissionUrl).toBeNull()
  })
})
