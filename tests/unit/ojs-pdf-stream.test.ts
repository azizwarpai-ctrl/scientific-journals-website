import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  startsWithPdfMagic,
  looksLikeHtml,
  jsonError,
  streamOjsPdf,
  PDF_MAGIC,
} from "@/src/features/ojs/server/ojs-pdf-stream"

describe("ojs-pdf-stream helpers", () => {
  describe("startsWithPdfMagic", () => {
    it("returns true when buffer starts with %PDF (0x25, 0x50, 0x44, 0x46)", () => {
      const valid = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
      expect(startsWithPdfMagic(valid)).toBe(true)
    })

    it("returns false when chunk is smaller than 4 bytes", () => {
      const short = new Uint8Array([0x25, 0x50])
      expect(startsWithPdfMagic(short)).toBe(false)
    })

    it("returns false for non-PDF bytes", () => {
      const nonPdf = new TextEncoder().encode("<!DOCTYPE html><html>")
      expect(startsWithPdfMagic(nonPdf)).toBe(false)
    })
  })

  describe("looksLikeHtml", () => {
    it("detects HTML doctype and tags", () => {
      expect(looksLikeHtml(new TextEncoder().encode("<!doctype html>"))).toBe(true)
      expect(looksLikeHtml(new TextEncoder().encode("<html><head></head>"))).toBe(true)
      expect(looksLikeHtml(new TextEncoder().encode("<div>user_login form</div>"))).toBe(true)
    })

    it("returns false for binary or non-HTML data", () => {
      const binary = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x01, 0x02])
      expect(looksLikeHtml(binary)).toBe(false)
    })
  })

  describe("jsonError", () => {
    it("constructs a JSON response with status and X-Proxy-Error header", async () => {
      const res = jsonError("FILE_NOT_FOUND", "PDF not found", 404)
      expect(res.status).toBe(404)
      expect(res.headers.get("X-Proxy-Error")).toBe("FILE_NOT_FOUND")
      expect(res.headers.get("Content-Type")).toContain("application/json")
      const body = await res.json()
      expect(body.error).toBe("FILE_NOT_FOUND")
      expect(body.message).toBe("PDF not found")
    })
  })
})

describe("streamOjsPdf upstream execution", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.OJS_BASE_URL = "https://journals.example.com"
    delete process.env.OJS_API_KEY
    delete process.env.OJS_BRIDGE_URL
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("returns 404 when upstream web URL returns 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    )

    const res = await streamOjsPdf({
      journal: "ijmp",
      submissionId: "100",
      galleyId: "200",
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("FILE_NOT_FOUND")
  })

  it("returns 403 when upstream web URL returns HTML login page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<!DOCTYPE html><html><body>user_login</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    )

    const res = await streamOjsPdf({
      journal: "ijmp",
      submissionId: "100",
      galleyId: "200",
    })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("AUTH_REQUIRED")
  })

  it("streams PDF with valid headers when upstream returns PDF bytes", async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35])
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": String(pdfBytes.length),
        },
      })
    )

    const res = await streamOjsPdf({
      journal: "ijmp",
      submissionId: "200048",
      galleyId: "200107",
      filename: "ijmp-200048.pdf",
    })

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Content-Disposition")).toBe('inline; filename="ijmp-200048.pdf"')
    expect(res.headers.get("Cache-Control")).toContain("public")
    expect(res.headers.get("X-Proxy-Path")).toBe("web-url")
  })
})
