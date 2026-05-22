import { describe, it, expect } from "vitest"
import {
  resolveTabSegments,
  journalTabPath,
  TAB_SEGMENTS,
  SEGMENT_TO_TAB,
  type JournalDetailTab,
} from "@/app/journals/[id]/tab-config"

describe("resolveTabSegments", () => {
  it("resolves each non-policies tab segment", () => {
    expect(resolveTabSegments(["author-guidelines"])).toEqual({
      tab: "author",
      policySlug: null,
    })
    expect(resolveTabSegments(["current-issue"])).toEqual({
      tab: "current",
      policySlug: null,
    })
    expect(resolveTabSegments(["archive"])).toEqual({
      tab: "archive",
      policySlug: null,
    })
  })

  it("resolves the policies tab with no sub-slug", () => {
    expect(resolveTabSegments(["policies"])).toEqual({
      tab: "policies",
      policySlug: null,
    })
  })

  it("resolves the policies tab with a valid policy slug", () => {
    expect(resolveTabSegments(["policies", "privacy-statement"])).toEqual({
      tab: "policies",
      policySlug: "privacy-statement",
    })
    expect(resolveTabSegments(["policies", "editorial-workflow"])).toEqual({
      tab: "policies",
      policySlug: "editorial-workflow",
    })
  })

  it("rejects an unknown policy slug", () => {
    expect(resolveTabSegments(["policies", "bogus-policy"])).toBeNull()
    expect(resolveTabSegments(["policies", "privacy"])).toBeNull()
  })

  it("rejects an unknown top-level segment", () => {
    expect(resolveTabSegments(["bogus-tab"])).toBeNull()
    expect(resolveTabSegments(["author"])).toBeNull()
    expect(resolveTabSegments(["current"])).toBeNull()
  })

  it("rejects 'about' — it is the index route, not a [...tab] segment", () => {
    expect(resolveTabSegments(["about"])).toBeNull()
  })

  it("rejects a sub-segment on a non-policies tab", () => {
    expect(resolveTabSegments(["archive", "extra"])).toBeNull()
    expect(resolveTabSegments(["author-guidelines", "extra"])).toBeNull()
    expect(resolveTabSegments(["current-issue", "anything"])).toBeNull()
  })

  it("rejects paths deeper than two segments", () => {
    expect(resolveTabSegments(["policies", "privacy-statement", "deep"])).toBeNull()
    expect(resolveTabSegments(["archive", "a", "b"])).toBeNull()
  })

  it("rejects an empty segment list", () => {
    expect(resolveTabSegments([])).toBeNull()
  })

  it("is case-sensitive", () => {
    expect(resolveTabSegments(["Archive"])).toBeNull()
    expect(resolveTabSegments(["Policies"])).toBeNull()
    expect(resolveTabSegments(["policies", "Privacy-Statement"])).toBeNull()
  })
})

describe("journalTabPath", () => {
  it("maps About to the journal root (no segment)", () => {
    expect(journalTabPath("ojbr", "about")).toBe("/journals/ojbr")
  })

  it("maps each non-About tab to its descriptive segment", () => {
    expect(journalTabPath("ojbr", "author")).toBe("/journals/ojbr/author-guidelines")
    expect(journalTabPath("ojbr", "current")).toBe("/journals/ojbr/current-issue")
    expect(journalTabPath("ojbr", "archive")).toBe("/journals/ojbr/archive")
    expect(journalTabPath("ojbr", "policies")).toBe("/journals/ojbr/policies")
  })

  it("preserves the journal id verbatim (slug or numeric)", () => {
    expect(journalTabPath("42", "archive")).toBe("/journals/42/archive")
  })
})

describe("TAB_SEGMENTS / SEGMENT_TO_TAB consistency", () => {
  it("round-trips every non-About tab through segment and back", () => {
    const nonAboutTabs: JournalDetailTab[] = ["author", "current", "archive", "policies"]
    for (const tab of nonAboutTabs) {
      const segment = TAB_SEGMENTS[tab]
      expect(segment).not.toBe("")
      expect(SEGMENT_TO_TAB[segment]).toBe(tab)
    }
  })

  it("keeps About as the index (empty segment, absent from reverse map)", () => {
    expect(TAB_SEGMENTS.about).toBe("")
    expect(SEGMENT_TO_TAB["about"]).toBeUndefined()
  })
})
