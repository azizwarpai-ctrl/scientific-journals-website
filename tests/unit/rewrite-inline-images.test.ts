import { describe, it, expect } from "vitest"
import {
  rewriteOjsInlineImages,
  CANONICAL_OJS_HOST,
  OJS_ALIAS_HOSTS,
  DEAD_EXTERNAL_HOSTS,
} from "@/src/features/ojs/utils/rewrite-inline-images"

describe("rewriteOjsInlineImages", () => {
  it("rewrites OJS alias host to canonical proxy URL", () => {
    const html = `<p>Hello</p><img src="https://submitmanager.com/public/journals/10/homepageImage_en.png" alt="cover">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toContain("/api/image-proxy?url=")
    expect(result).toContain(encodeURIComponent(`https://${CANONICAL_OJS_HOST}/public/journals/10/homepageImage_en.png`))
    expect(result).not.toContain("submitmanager.com")
    expect(result).toContain("<p>Hello</p>")
    expect(result).toContain('alt="cover"')
  })

  it("normalizes /ojs/public/ to /public/ before proxying", () => {
    const html = `<img src="https://submitmanager.com/ojs/public/journals/5/image.png">`
    const result = rewriteOjsInlineImages(html)

    const decoded = decodeURIComponent(result)
    expect(decoded).toContain(`${CANONICAL_OJS_HOST}/public/journals/5/image.png`)
    expect(decoded).not.toContain("/ojs/public/")
  })

  it("handles escaped \\/ slashes from JSON blockContent", () => {
    const html = `<img src="https:\\/\\/submitmanager.com\\/public\\/journals\\/10\\/image.png">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toContain("\\/api\\/image-proxy?url=")
    expect(result).not.toContain("submitmanager.com")
  })

  it("removes <img> tags pointing to dead external hosts", () => {
    const html = `<p>Indexing:</p><img src="https://jtr.cit.edu.ly/public/site/images/admin/crossref.png" alt="crossref"><p>End</p>`
    const result = rewriteOjsInlineImages(html)

    expect(result).not.toContain("<img")
    expect(result).not.toContain("cit.edu.ly")
    expect(result).toContain("<p>Indexing:</p>")
    expect(result).toContain("<p>End</p>")
  })

  it("removes <img> for journals.zu.edu.ly (dead host)", () => {
    const html = `<img src="https://journals.zu.edu.ly/public/site/images/admin/orcid.png">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toBe("")
  })

  it("leaves data: URIs untouched", () => {
    const html = `<img src="data:image/png;base64,iVBORw0KGgo=" alt="inline">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toBe(html)
  })

  it("proxies already-canonical journals.digitopub.com URLs", () => {
    const html = `<img src="https://journals.digitopub.com/public/journals/5/cover.png">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toContain("/api/image-proxy?url=")
    expect(result).toContain(encodeURIComponent("https://journals.digitopub.com/public/journals/5/cover.png"))
  })

  it("does not double-wrap URLs already using /api/image-proxy", () => {
    const html = `<img src="/api/image-proxy?url=https%3A%2F%2Fjournals.digitopub.com%2Fpublic%2Fcover.png">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toBe(html)
  })

  it("handles multiple <img> tags in one string", () => {
    const html = [
      `<img src="https://submitmanager.com/public/a.png">`,
      `<img src="https://jtr.cit.edu.ly/public/b.png">`,
      `<img src="data:image/gif;base64,R0lGOD=" alt="gif">`,
      `<img src="https://journals.digitopub.com/public/c.png">`,
    ].join("")

    const result = rewriteOjsInlineImages(html)

    // submitmanager.com -> proxied
    expect(result).toContain("/api/image-proxy?url=" + encodeURIComponent(`https://${CANONICAL_OJS_HOST}/public/a.png`))
    // dead host -> removed
    expect(result).not.toContain("cit.edu.ly")
    // data: -> untouched
    expect(result).toContain("data:image/gif")
    // canonical -> proxied
    expect(result).toContain("/api/image-proxy?url=" + encodeURIComponent("https://journals.digitopub.com/public/c.png"))
  })

  it("leaves srcless <img> tags untouched", () => {
    const html = `<img alt="no-src" width="100">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toBe(html)
  })

  it("leaves unknown external host untouched", () => {
    const html = `<img src="https://cdn.example.com/badge.png" alt="badge">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toBe(html)
  })

  it("returns empty string for empty input", () => {
    expect(rewriteOjsInlineImages("")).toBe("")
  })

  it("returns html without img tags unchanged", () => {
    const html = `<p>No images here</p>`
    expect(rewriteOjsInlineImages(html)).toBe(html)
  })

  it("handles all known OJS alias hosts", () => {
    for (const host of OJS_ALIAS_HOSTS) {
      const html = `<img src="https://${host}/public/test.png">`
      const result = rewriteOjsInlineImages(html)
      expect(result).toContain("/api/image-proxy?url=")
      expect(result).not.toContain(host)
    }
  })

  it("handles all known dead external hosts", () => {
    for (const host of DEAD_EXTERNAL_HOSTS) {
      const html = `<img src="https://${host}/image.png">`
      const result = rewriteOjsInlineImages(html)
      expect(result).toBe("")
    }
  })

  it("preserves other attributes (alt, width, height) on rewritten <img>", () => {
    const html = `<img src="https://submitmanager.com/public/img.png" alt="test" width="200" height="100">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toContain('alt="test"')
    expect(result).toContain('width="200"')
    expect(result).toContain('height="100"')
    expect(result).toContain("/api/image-proxy?url=")
  })

  it("handles single-quoted src attributes", () => {
    const html = `<img src='https://submitmanager.com/public/img.png' alt='test'>`
    const result = rewriteOjsInlineImages(html)

    expect(result).toContain("/api/image-proxy?url=")
    expect(result).not.toContain("submitmanager.com")
  })

  it("handles ij-mp.com alias", () => {
    const html = `<img src="https://ij-mp.com/public/journals/1/badge.png">`
    const result = rewriteOjsInlineImages(html)

    expect(result).toContain("/api/image-proxy?url=")
    expect(result).toContain(encodeURIComponent(`https://${CANONICAL_OJS_HOST}/public/journals/1/badge.png`))
  })

  it("handles digitodontics.com alias", () => {
    const html = `<img src="https://digitodontics.com/ojs/public/journals/3/cover.png">`
    const result = rewriteOjsInlineImages(html)

    const decoded = decodeURIComponent(result)
    expect(decoded).toContain(`${CANONICAL_OJS_HOST}/public/journals/3/cover.png`)
    expect(decoded).not.toContain("/ojs/public/")
  })

  it("exports host constants for external use", () => {
    expect(CANONICAL_OJS_HOST).toBe("journals.digitopub.com")
    expect(OJS_ALIAS_HOSTS.size).toBeGreaterThan(0)
    expect(DEAD_EXTERNAL_HOSTS.size).toBeGreaterThan(0)
  })
})
