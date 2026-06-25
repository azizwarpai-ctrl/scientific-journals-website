import { describe, it, expect } from "vitest"
import { rewriteOjsInlineImages } from "@/src/features/ojs/utils/rewrite-inline-images"
import { extractCardFields } from "@/src/features/journals/server/custom-blocks-service"
import { toProxyUrl } from "@/src/features/ojs/components/ojs-image"

const OJS_BASE = "https://journals.digitopub.com"

describe("double-wrap guard — composition test", () => {
  it("alias-host img through full pipeline is wrapped exactly once", () => {
    const blockHtml = `<p><strong>ISSN</strong></p><img src="https://submitmanager.com/public/journals/10/issn.png" alt="ISSN">`

    const rewritten = rewriteOjsInlineImages(blockHtml)
    const { image } = extractCardFields(rewritten, "test-block", OJS_BASE)
    const finalSrc = toProxyUrl(image ?? "")

    expect(finalSrc).toBe(image)

    const proxyCount = (finalSrc.match(/image-proxy/g) ?? []).length
    expect(proxyCount).toBe(1)

    const urlParam = new URL(finalSrc, "https://digitopub.com").searchParams.get("url")
    expect(urlParam).toBe("https://journals.digitopub.com/public/journals/10/issn.png")
    expect(urlParam).not.toContain("image-proxy")
  })

  it("canonical-host img through full pipeline is wrapped exactly once", () => {
    const blockHtml = `<img src="https://journals.digitopub.com/public/journals/5/cover.png">`

    const rewritten = rewriteOjsInlineImages(blockHtml)
    const { image } = extractCardFields(rewritten, "test-block", OJS_BASE)
    const finalSrc = toProxyUrl(image ?? "")

    const proxyCount = (finalSrc.match(/image-proxy/g) ?? []).length
    expect(proxyCount).toBe(1)

    const urlParam = new URL(finalSrc, "https://digitopub.com").searchParams.get("url")
    expect(urlParam).toBe("https://journals.digitopub.com/public/journals/5/cover.png")
  })

  it("dead-host img is removed — no image survives the pipeline", () => {
    const blockHtml = `<p><strong>Badge</strong></p><img src="https://jtr.cit.edu.ly/public/site/images/admin/crossref.png">`

    const rewritten = rewriteOjsInlineImages(blockHtml)
    expect(rewritten).not.toContain("<img")

    const { image } = extractCardFields(rewritten, "test-block", OJS_BASE)
    expect(image).toBeUndefined()
  })
})

describe("toProxyUrl — idempotency", () => {
  it("does not re-wrap a relative /api/image-proxy URL", () => {
    const src = "/api/image-proxy?url=https%3A%2F%2Fjournals.digitopub.com%2Fpublic%2Fimg.png"
    expect(toProxyUrl(src)).toBe(src)
  })

  it("does not re-wrap an absolute OJS-host /api/image-proxy URL", () => {
    const src = "https://journals.digitopub.com/api/image-proxy?url=https%3A%2F%2Fjournals.digitopub.com%2Fpublic%2Fimg.png"
    expect(toProxyUrl(src)).toBe(src)
  })

  it("still wraps a plain OJS-host image URL", () => {
    const src = "https://journals.digitopub.com/public/journals/10/issn.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("passes through external non-OJS URLs unchanged", () => {
    const src = "https://cdn.example.com/badge.png"
    expect(toProxyUrl(src)).toBe(src)
  })

  it("passes through data: URIs unchanged", () => {
    const src = "data:image/png;base64,iVBORw0KGgo="
    expect(toProxyUrl(src)).toBe(src)
  })
})

describe("toProxyUrl — alias host coverage", () => {
  it("proxies submitmanager.com cover URLs", () => {
    const src = "https://submitmanager.com/public/journals/2/homepageImage_en.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("proxies www.submitmanager.com cover URLs", () => {
    const src = "https://www.submitmanager.com/public/journals/5/cover.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("proxies ij-mp.com cover URLs", () => {
    const src = "https://ij-mp.com/public/journals/3/homepageImage_en.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("proxies www.ij-mp.com cover URLs", () => {
    const src = "https://www.ij-mp.com/public/journals/1/cover.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("proxies digitodontics.com cover URLs", () => {
    const src = "https://digitodontics.com/public/journals/7/homepageImage_en.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("proxies www.digitodontics.com cover URLs", () => {
    const src = "https://www.digitodontics.com/public/journals/4/cover.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })

  it("wraps alias-host URL exactly once (no double-wrap)", () => {
    const src = "https://submitmanager.com/public/journals/2/homepageImage_en.png"
    const once = toProxyUrl(src)
    const twice = toProxyUrl(once)
    expect(twice).toBe(once)
    expect((once.match(/image-proxy/g) ?? []).length).toBe(1)
  })

  it("canonical host journals.digitopub.com is still proxied", () => {
    const src = "https://journals.digitopub.com/public/journals/10/cover.png"
    const result = toProxyUrl(src)
    expect(result).toBe(`/api/image-proxy?url=${encodeURIComponent(src)}`)
  })
})

describe("extractCardFields — proxy-path preservation", () => {
  it("does not prepend OJS base to a /api/image-proxy src", () => {
    const html = `<img src="/api/image-proxy?url=https%3A%2F%2Fjournals.digitopub.com%2Fpublic%2Fissn.png">`
    const { image } = extractCardFields(html, "test", OJS_BASE)

    expect(image).toBe("/api/image-proxy?url=https%3A%2F%2Fjournals.digitopub.com%2Fpublic%2Fissn.png")
    expect(image).not.toContain("journals.digitopub.com/api/image-proxy")
  })

  it("still resolves genuine relative OJS paths against the base", () => {
    const html = `<img src="/public/journals/10/cover.png">`
    const { image } = extractCardFields(html, "test", OJS_BASE)

    expect(image).toBe("https://journals.digitopub.com/public/journals/10/cover.png")
  })
})
