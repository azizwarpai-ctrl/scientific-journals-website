import { describe, it, expect } from "vitest"
import {
  isValidAboutSlug,
  getAboutTitleBySlug,
  ABOUT_METADATA,
} from "@/src/features/journals/about-slugs"

describe("about-slugs", () => {
  describe("isValidAboutSlug", () => {
    it("returns true for valid slugs", () => {
      expect(isValidAboutSlug("aims-scope")).toBe(true)
      expect(isValidAboutSlug("editorial-board")).toBe(true)
      expect(isValidAboutSlug("advisory-board")).toBe(true)
      expect(isValidAboutSlug("journal-details")).toBe(true)
    })

    it("returns false for invalid or empty slugs", () => {
      expect(isValidAboutSlug("bogus-slug")).toBe(false)
      expect(isValidAboutSlug("aims-and-scope")).toBe(false) // must be exact
      expect(isValidAboutSlug("AIMS-SCOPE")).toBe(false) // case-sensitive
      expect(isValidAboutSlug("")).toBe(false)
      expect(isValidAboutSlug(null)).toBe(false)
      expect(isValidAboutSlug(undefined)).toBe(false)
    })
  })

  describe("getAboutTitleBySlug", () => {
    it("returns the correct title for a valid slug", () => {
      expect(getAboutTitleBySlug("aims-scope")).toBe("Aims & Scope")
      expect(getAboutTitleBySlug("editorial-board")).toBe("Editorial Board")
    })

    it("returns null for an invalid slug", () => {
      expect(getAboutTitleBySlug("bogus")).toBeNull()
    })
  })

  describe("ABOUT_METADATA consistency", () => {
    it("contains no duplicate slugs", () => {
      const slugs = ABOUT_METADATA.map((m) => m.slug)
      const uniqueSlugs = new Set(slugs)
      expect(slugs.length).toBe(uniqueSlugs.size)
    })
  })
})
