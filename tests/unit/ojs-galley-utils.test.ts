import { describe, it, expect } from "vitest"
import {
  buildArticlePdfUrl,
  buildGalleyDownloadUrl,
  isOpenAccessStatus,
  ISSUE_ACCESS_OPEN,
} from "@/src/features/journals/server/ojs-galley-utils"

describe("ojs-galley-utils", () => {
  describe("buildArticlePdfUrl", () => {
    it("builds the clean public PDF URL with journal slug and publicationId", () => {
      const url = buildArticlePdfUrl("ijmp", 200048)
      expect(url).toBe("/journals/ijmp/articles/200048/pdf")
    })

    it("handles string publicationId and encodes special characters", () => {
      const url = buildArticlePdfUrl("bio-tech", "12345")
      expect(url).toBe("/journals/bio-tech/articles/12345/pdf")
    })

    it("never contains /api/", () => {
      const url = buildArticlePdfUrl("ijmp", 100)
      expect(url).not.toContain("/api/")
    })
  })

  describe("buildGalleyDownloadUrl", () => {
    it("returns remoteUrl when present", () => {
      const url = buildGalleyDownloadUrl("https://example.com/paper.pdf", "ijmp", 100, 200, 300)
      expect(url).toBe("https://example.com/paper.pdf")
    })

    it("returns null when journalUrlPath is missing", () => {
      const url = buildGalleyDownloadUrl(null, null, 100, 200, 300)
      expect(url).toBeNull()
    })

    it("returns null when submissionFileId is missing", () => {
      const url = buildGalleyDownloadUrl(null, "ijmp", 100, 200, null)
      expect(url).toBeNull()
    })

    it("constructs the legacy /api/pdf-proxy URL with query params", () => {
      const url = buildGalleyDownloadUrl(null, "ijmp", 100, 200, 300)
      expect(url).toBe("/api/pdf-proxy?journal=ijmp&submissionId=100&galleyId=200&fileId=300")
    })
  })

  describe("isOpenAccessStatus", () => {
    it("returns true for ISSUE_ACCESS_OPEN", () => {
      expect(isOpenAccessStatus(ISSUE_ACCESS_OPEN)).toBe(true)
      expect(isOpenAccessStatus(1)).toBe(true)
    })

    it("returns false for subscription or null", () => {
      expect(isOpenAccessStatus(2)).toBe(false)
      expect(isOpenAccessStatus(null)).toBe(false)
      expect(isOpenAccessStatus(undefined)).toBe(false)
      expect(isOpenAccessStatus(0)).toBe(false)
    })
  })
})
