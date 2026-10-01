import { describe, it, expect, vi, beforeEach } from "vitest"
import { sanitizeContent, sanitizeRichContent } from "@/src/features/journals/utils/sanitize-html"
import DOMPurify from "dompurify"

vi.mock("dompurify", () => {
  return {
    default: {
      sanitize: vi.fn((html: string, options: any) => {
        // Strip script tags and disallowed attributes for mock behavior
        let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        if (options?.ALLOWED_ATTR?.length === 0) {
          cleaned = cleaned.replace(/\s+class="[^"]*"/gi, "")
        }
        if (!options?.ALLOWED_TAGS?.includes("a")) {
          cleaned = cleaned.replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1")
        }
        return cleaned
      }),
    },
  }
})

describe("sanitize-html", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("sanitizeContent", () => {
    it("returns empty string for null, undefined, or empty string", () => {
      expect(sanitizeContent(null)).toBe("")
      expect(sanitizeContent(undefined)).toBe("")
      expect(sanitizeContent("")).toBe("")
    })

    it("passes strict tag whitelist and empty attribute whitelist to DOMPurify", () => {
      const input = '<p class="bad">Hello <strong>world</strong> <script>alert(1)</script><a href="#">Link</a></p>'
      const sanitized = sanitizeContent(input)

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(input, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h3', 'h4'],
        ALLOWED_ATTR: [],
      })
      expect(sanitized).not.toContain("<script>")
      expect(sanitized).not.toContain('class="bad"')
    })
  })

  describe("sanitizeRichContent", () => {
    it("returns empty string for null, undefined, or empty string", () => {
      expect(sanitizeRichContent(null)).toBe("")
      expect(sanitizeRichContent(undefined)).toBe("")
      expect(sanitizeRichContent("")).toBe("")
    })

    it("passes rich tags and attributes whitelist to DOMPurify", () => {
      const input = '<table class="fees-table"><tr><td>Fee</td><td><a href="https://example.com" target="_blank" rel="noopener">Pay</a></td></tr></table><script>evil()</script>'
      const sanitized = sanitizeRichContent(input)

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(input, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a',
          'h1', 'h2', 'h3', 'h4', 'h5', 'blockquote', 'span', 'div',
          'table', 'tbody', 'tr', 'td', 'th', 'thead', 'hr',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      })
      expect(sanitized).not.toContain("<script>")
    })
  })
})
