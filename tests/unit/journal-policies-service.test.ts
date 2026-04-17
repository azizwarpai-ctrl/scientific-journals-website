import { describe, it, expect } from "vitest"
import {
  normalizePolicyKey,
  matchApprovedPolicy,
} from "@/src/features/journals/server/journal-policies-service"

describe("normalizePolicyKey", () => {
  it("lowercases and trims", () => {
    expect(normalizePolicyKey("  Privacy Statement  ")).toBe("privacy statement")
  })

  it("treats & as 'and'", () => {
    expect(normalizePolicyKey("Copyright & Licensing")).toBe(
      "copyright and licensing",
    )
  })

  it("collapses punctuation to single spaces", () => {
    expect(normalizePolicyKey("dois-orcid")).toBe("dois orcid")
    expect(normalizePolicyKey("DOIs/ORCID")).toBe("dois orcid")
    expect(normalizePolicyKey("ethics_policy")).toBe("ethics policy")
  })

  it("returns empty string for null/undefined/empty", () => {
    expect(normalizePolicyKey(null)).toBe("")
    expect(normalizePolicyKey(undefined)).toBe("")
    expect(normalizePolicyKey("")).toBe("")
    expect(normalizePolicyKey("   ")).toBe("")
  })

  it("resolves all three DOIs & ORCID forms to the same approved policy", () => {
    const a = matchApprovedPolicy(["dois-orcid"])
    const b = matchApprovedPolicy(["DOIs & ORCID"])
    const c = matchApprovedPolicy(["dois and orcid"])
    expect(a?.slug).toBe("dois-orcid")
    expect(b?.slug).toBe("dois-orcid")
    expect(c?.slug).toBe("dois-orcid")
  })
})

describe("matchApprovedPolicy", () => {
  it("matches Privacy Statement via canonical title", () => {
    const policy = matchApprovedPolicy(["Privacy Statement"])
    expect(policy?.slug).toBe("privacy-statement")
  })

  it("matches Privacy Statement via privacyStatement setting name", () => {
    const policy = matchApprovedPolicy([null, null, null, "privacyStatement"])
    expect(policy?.slug).toBe("privacy-statement")
  })

  it("matches Copyright & Licensing via alternative wordings", () => {
    expect(matchApprovedPolicy(["copyright and licensing"])?.slug).toBe(
      "copyright-licensing",
    )
    expect(matchApprovedPolicy(["Copyright Notice"])?.slug).toBe(
      "copyright-licensing",
    )
    expect(matchApprovedPolicy(["copyrightNotice"])?.slug).toBe(
      "copyright-licensing",
    )
  })

  it("matches Policies on Ethics via ethics alias", () => {
    expect(matchApprovedPolicy(["Publication Ethics"])?.slug).toBe(
      "policies-on-ethics",
    )
    expect(matchApprovedPolicy(["ethics"])?.slug).toBe("policies-on-ethics")
  })

  it("matches Editorial Workflow via peer review wording", () => {
    expect(matchApprovedPolicy(["Peer Review Process"])?.slug).toBe(
      "editorial-workflow",
    )
    expect(matchApprovedPolicy(["reviewPolicy"])?.slug).toBe(
      "editorial-workflow",
    )
  })

  it("matches Indexing & Archiving via archiving alias", () => {
    expect(matchApprovedPolicy(["Archiving Policy"])?.slug).toBe(
      "indexing-archiving",
    )
    expect(matchApprovedPolicy(["authorSelfArchivePolicy"])?.slug).toBe(
      "indexing-archiving",
    )
  })

  it("matches DOIs & ORCID across slug, title and text forms", () => {
    expect(matchApprovedPolicy(["dois-orcid"])?.slug).toBe("dois-orcid")
    expect(matchApprovedPolicy(["DOIs & ORCID"])?.slug).toBe("dois-orcid")
    expect(matchApprovedPolicy(["dois and orcid"])?.slug).toBe("dois-orcid")
    expect(matchApprovedPolicy(["doi"])?.slug).toBe("dois-orcid")
  })

  it("rejects unrelated OJS pages", () => {
    expect(matchApprovedPolicy(["About the Journal"])).toBeNull()
    expect(matchApprovedPolicy(["Editorial Board"])).toBeNull()
    expect(matchApprovedPolicy(["Contact"])).toBeNull()
    expect(matchApprovedPolicy(["Submissions"])).toBeNull()
    expect(matchApprovedPolicy(["Announcements"])).toBeNull()
  })

  it("returns null when all candidates are empty/nullish", () => {
    expect(matchApprovedPolicy([null, undefined, ""])).toBeNull()
  })

  it("takes the first matching candidate when multiple are provided", () => {
    // Title mismatches but setting name matches → still matches
    const policy = matchApprovedPolicy([
      "some-unrelated-thing",
      null,
      null,
      "privacyStatement",
    ])
    expect(policy?.slug).toBe("privacy-statement")
  })
})
