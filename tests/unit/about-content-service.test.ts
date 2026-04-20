import { describe, it, expect } from "vitest"
import { isAimsScopeAlias } from "@/src/features/journals/server/about-content-service"

describe("isAimsScopeAlias", () => {
  describe("path matching", () => {
    it("matches the canonical OJBR slug", () => {
      expect(isAimsScopeAlias("aims-scope", null)).toBe(true)
    })

    it("matches common slug variants", () => {
      expect(isAimsScopeAlias("aims-and-scope", null)).toBe(true)
      expect(isAimsScopeAlias("aimsandscope", null)).toBe(true)
      expect(isAimsScopeAlias("aimsscope", null)).toBe(true)
      expect(isAimsScopeAlias("aim-and-scope", null)).toBe(true)
      expect(isAimsScopeAlias("scope-and-aims", null)).toBe(true)
      expect(isAimsScopeAlias("scope-aims", null)).toBe(true)
    })

    it("is case-insensitive on path", () => {
      expect(isAimsScopeAlias("AIMS-SCOPE", null)).toBe(true)
      expect(isAimsScopeAlias("  aims-scope  ", null)).toBe(true)
    })

    it("rejects unrelated paths", () => {
      expect(isAimsScopeAlias("about", null)).toBe(false)
      expect(isAimsScopeAlias("editorial-board", null)).toBe(false)
      expect(isAimsScopeAlias("journal-information", null)).toBe(false)
      expect(isAimsScopeAlias("policies", null)).toBe(false)
    })
  })

  describe("title matching", () => {
    it("matches the common 'Aims & Scope' title verbatim", () => {
      expect(isAimsScopeAlias(null, "Aims & Scope")).toBe(true)
    })

    it("matches title variants via normalizeKey", () => {
      expect(isAimsScopeAlias(null, "aims and scope")).toBe(true)
      expect(isAimsScopeAlias(null, "AIMS AND SCOPE")).toBe(true)
      expect(isAimsScopeAlias(null, "Aim and Scope")).toBe(true)
      expect(isAimsScopeAlias(null, "Aims Scope")).toBe(true)
      expect(isAimsScopeAlias(null, "Scope and Aims")).toBe(true)
    })

    it("rejects about-style titles", () => {
      expect(isAimsScopeAlias(null, "About the Journal")).toBe(false)
      expect(isAimsScopeAlias(null, "About")).toBe(false)
      expect(isAimsScopeAlias(null, "Journal Information")).toBe(false)
    })

    it("rejects partial/unrelated titles", () => {
      expect(isAimsScopeAlias(null, "Editorial Board")).toBe(false)
      expect(isAimsScopeAlias(null, "Policies")).toBe(false)
    })
  })

  describe("null/empty handling", () => {
    it("returns false when both inputs are null/empty", () => {
      expect(isAimsScopeAlias(null, null)).toBe(false)
      expect(isAimsScopeAlias(undefined, undefined)).toBe(false)
      expect(isAimsScopeAlias("", "")).toBe(false)
      expect(isAimsScopeAlias("  ", "  ")).toBe(false)
    })

    it("matches when either path OR title qualifies", () => {
      expect(isAimsScopeAlias("aims-scope", "Random Title")).toBe(true)
      expect(isAimsScopeAlias("random-path", "Aims & Scope")).toBe(true)
    })
  })

  describe("OJBR source-truth scenario", () => {
    it("matches the exact row OJS returned: path='aims-scope', title='Aims & Scope'", () => {
      expect(isAimsScopeAlias("aims-scope", "Aims & Scope")).toBe(true)
    })

    it("does NOT match neighbouring OJBR nav items", () => {
      expect(isAimsScopeAlias("editorial-board", null)).toBe(false)
      expect(isAimsScopeAlias("advisory-board", null)).toBe(false)
      expect(isAimsScopeAlias("copyright-licensing-policies", null)).toBe(false)
      expect(isAimsScopeAlias("editorial-workflow", null)).toBe(false)
      expect(isAimsScopeAlias("indexing-archiving", null)).toBe(false)
      expect(isAimsScopeAlias("journal-information", null)).toBe(false)
      expect(isAimsScopeAlias("browse", null)).toBe(false)
      expect(isAimsScopeAlias("policies", null)).toBe(false)
    })
  })
})
