import { describe, it, expect } from "vitest"

/**
 * Tests for the bridge URL-building logic used in `app/api/pdf-proxy/route.ts`.
 *
 * The GET handler resolves the bridge URL with this priority:
 *   1. `OJS_BRIDGE_URL`
 *   2. `OJS_PDF_BRIDGE_URL`  (legacy alias)
 *   3. `${OJS_BASE_URL}/ojs-pdf-bridge.php`  (derived fallback)
 *
 * These tests verify the URL construction and query-param logic in isolation
 * without importing the Next.js route (which requires the Next.js runtime).
 */

// ── Helpers that mirror the inline logic in route.ts ────────────────────────

/**
 * Resolves the bridge base URL exactly as the GET handler does.
 */
function resolveBridgeBase(env: {
  OJS_BRIDGE_URL?: string
  OJS_PDF_BRIDGE_URL?: string
  OJS_BASE_URL?: string
}): string | null {
  return (
    env.OJS_BRIDGE_URL ??
    env.OJS_PDF_BRIDGE_URL ??
    (env.OJS_BASE_URL
      ? `${env.OJS_BASE_URL.replace(/\/$/, "")}/ojs-pdf-bridge.php`
      : null)
  )
}

/**
 * Builds the full bridge URL with query params, matching the handler's
 * `URL` + `searchParams.set` approach.
 */
function buildBridgeUrl(
  base: string,
  params: {
    journal: string
    submissionId: string
    galleyId: string
    fileId?: string | null
  }
): string {
  const url = new URL(base)
  url.searchParams.set("journal", params.journal)
  url.searchParams.set("submissionId", params.submissionId)
  url.searchParams.set("galleyId", params.galleyId)
  if (params.fileId) url.searchParams.set("fileId", params.fileId)
  return url.toString()
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("pdf-proxy bridge URL resolution", () => {
  describe("resolveBridgeBase", () => {
    it("prefers OJS_BRIDGE_URL when all three vars are set", () => {
      expect(
        resolveBridgeBase({
          OJS_BRIDGE_URL: "https://a.example/bridge.php",
          OJS_PDF_BRIDGE_URL: "https://b.example/bridge.php",
          OJS_BASE_URL: "https://c.example/ojs",
        })
      ).toBe("https://a.example/bridge.php")
    })

    it("falls back to OJS_PDF_BRIDGE_URL when OJS_BRIDGE_URL is unset", () => {
      expect(
        resolveBridgeBase({
          OJS_PDF_BRIDGE_URL: "https://b.example/bridge.php",
          OJS_BASE_URL: "https://c.example/ojs",
        })
      ).toBe("https://b.example/bridge.php")
    })

    it("derives from OJS_BASE_URL when neither bridge var is set", () => {
      expect(
        resolveBridgeBase({ OJS_BASE_URL: "https://c.example/ojs" })
      ).toBe("https://c.example/ojs/ojs-pdf-bridge.php")
    })

    it("strips trailing slash from OJS_BASE_URL before appending", () => {
      expect(
        resolveBridgeBase({ OJS_BASE_URL: "https://c.example/ojs/" })
      ).toBe("https://c.example/ojs/ojs-pdf-bridge.php")
    })

    it("returns null when no vars are set at all", () => {
      expect(resolveBridgeBase({})).toBeNull()
    })
  })

  describe("buildBridgeUrl", () => {
    const base = "https://submitmanager.com/ojs/ojs-pdf-bridge.php"

    it("includes all four params when fileId is provided", () => {
      const url = buildBridgeUrl(base, {
        journal: "ijmp",
        submissionId: "200013",
        galleyId: "42",
        fileId: "99",
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.get("journal")).toBe("ijmp")
      expect(parsed.searchParams.get("submissionId")).toBe("200013")
      expect(parsed.searchParams.get("galleyId")).toBe("42")
      expect(parsed.searchParams.get("fileId")).toBe("99")
    })

    it("omits fileId when not provided", () => {
      const url = buildBridgeUrl(base, {
        journal: "ijmp",
        submissionId: "200013",
        galleyId: "42",
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.has("fileId")).toBe(false)
    })

    it("omits fileId when it is null", () => {
      const url = buildBridgeUrl(base, {
        journal: "ijmp",
        submissionId: "200013",
        galleyId: "42",
        fileId: null,
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.has("fileId")).toBe(false)
    })

    it("preserves existing query params on the base URL", () => {
      const customBase = "https://example.com/bridge.php?token=abc"
      const url = buildBridgeUrl(customBase, {
        journal: "test",
        submissionId: "1",
        galleyId: "2",
        fileId: "3",
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.get("token")).toBe("abc")
      expect(parsed.searchParams.get("journal")).toBe("test")
    })

    it("properly URL-encodes journal names with special characters", () => {
      const url = buildBridgeUrl(base, {
        journal: "my-journal.v2",
        submissionId: "100",
        galleyId: "5",
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.get("journal")).toBe("my-journal.v2")
    })

    it("uses searchParams (not string concat) — no double-encoding", () => {
      const url = buildBridgeUrl(base, {
        journal: "abc",
        submissionId: "1",
        galleyId: "2",
        fileId: "3",
      })
      // The base path must remain intact
      expect(url).toContain("/ojs/ojs-pdf-bridge.php")
      // Params are after the ?
      expect(url).toMatch(/\?.*journal=abc/)
    })
  })
})
