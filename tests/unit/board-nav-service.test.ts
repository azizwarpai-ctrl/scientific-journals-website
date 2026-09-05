import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { parseBoardHtml } from "@/src/features/journals/server/board-nav-service"
import { CANONICAL_OJS_HOST } from "@/src/features/ojs/utils/rewrite-inline-images"

describe("parseBoardHtml — image URL normalization", () => {
  it("normalizes submitmanager.com profile image to canonical host", () => {
    const html = `
      <p><strong>Dr. Jane Smith</strong></p>
      <p><img src="https://submitmanager.com/public/journals/10/profileImage.png"></p>
      <p>University of Example</p>
    `
    const members = parseBoardHtml(html)
    expect(members.length).toBeGreaterThanOrEqual(1)
    const member = members.find((m) => m.name === "Dr. Jane Smith")
    expect(member).toBeDefined()
    expect(member!.image).toBe(`https://${CANONICAL_OJS_HOST}/public/journals/10/profileImage.png`)
  })

  it("normalizes /ojs/public/ path on alias host", () => {
    const html = `
      <p><strong>Prof. Ahmed Ali</strong></p>
      <p><img src="https://digitodontics.com/ojs/public/journals/3/photo.png"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Prof. Ahmed Ali")
    expect(member).toBeDefined()
    expect(member!.image).toBe(`https://${CANONICAL_OJS_HOST}/public/journals/3/photo.png`)
    expect(member!.image).not.toContain("/ojs/public/")
  })

  it("discards dead-host image (returns null)", () => {
    const html = `
      <p><strong>Dr. Bob Jones</strong></p>
      <p><img src="https://jtr.cit.edu.ly/public/site/images/admin/crossref.png"></p>
      <p>Some University</p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Bob Jones")
    expect(member).toBeDefined()
    expect(member!.image).toBeNull()
  })

  it("leaves canonical-host image unchanged", () => {
    const url = `https://${CANONICAL_OJS_HOST}/public/journals/5/avatar.png`
    const html = `
      <p><strong>Dr. Carol Lee</strong></p>
      <p><img src="${url}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Carol Lee")
    expect(member).toBeDefined()
    expect(member!.image).toBe(url)
  })

  it("leaves data: URI images unchanged", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo="
    const html = `
      <p><strong>Dr. Dave Kim</strong></p>
      <p><img src="${dataUri}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Dave Kim")
    expect(member).toBeDefined()
    expect(member!.image).toBe(dataUri)
  })

  it("leaves unknown external host unchanged", () => {
    const url = "https://cdn.example.com/photo.jpg"
    const html = `
      <p><strong>Dr. Eve Park</strong></p>
      <p><img src="${url}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Eve Park")
    expect(member).toBeDefined()
    expect(member!.image).toBe(url)
  })

  it("normalizes ij-mp.com alias", () => {
    const html = `
      <p><strong>Dr. Frank Wu</strong></p>
      <p><img src="https://ij-mp.com/public/journals/1/badge.png"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Frank Wu")
    expect(member).toBeDefined()
    expect(member!.image).toBe(`https://${CANONICAL_OJS_HOST}/public/journals/1/badge.png`)
  })
})

describe("parseBoardHtml — image attachment across members", () => {
  const imgA = `https://${CANONICAL_OJS_HOST}/public/site/images/submit_admin/photo-a.png`
  const imgB = `https://${CANONICAL_OJS_HOST}/public/site/images/submit_admin/photo-b.png`

  it("attaches an image-only paragraph to the NEXT member when the pending member is complete", () => {
    // Production shape (journal 'jaid', verified 2026-09-05): a member block
    // that already has name + image, followed by an image-only <p>, then the
    // next member's name. Previously the second image was silently dropped
    // and "Dr. Member B" rendered with no photo.
    const html = `
      <p><strong>Dr. Member A</strong></p>
      <p><img src="${imgA}"></p>
      <p>University of A</p>
      <p><a href="https://orcid.org/0000-0001-2345-6789">ORCID</a></p>
      <p>&nbsp;</p>
      <p><img src="${imgB}"></p>
      <p><strong>Dr. Member B</strong></p>
      <p>University of B</p>
    `
    const members = parseBoardHtml(html)
    const a = members.find((m) => m.name === "Dr. Member A")
    const b = members.find((m) => m.name === "Dr. Member B")
    expect(a?.image).toBe(imgA)
    expect(b?.image).toBe(imgB)
  })

  it("applies the same rule to images wrapped in non-<p> containers", () => {
    const html = `
      <p><strong>Dr. Member A</strong></p>
      <p><img src="${imgA}"></p>
      <div><img src="${imgB}"></div>
      <p><strong>Dr. Member B</strong></p>
    `
    const members = parseBoardHtml(html)
    const a = members.find((m) => m.name === "Dr. Member A")
    const b = members.find((m) => m.name === "Dr. Member B")
    expect(a?.image).toBe(imgA)
    expect(b?.image).toBe(imgB)
  })

  it("still attaches a photo that follows the member's name to that same member", () => {
    // Guard against over-eager flushing: name-then-photo order (the common
    // layout) must keep the photo on the SAME member.
    const html = `
      <p><strong>Dr. Member A</strong></p>
      <p><img src="${imgA}"></p>
    `
    const members = parseBoardHtml(html)
    const a = members.find((m) => m.name === "Dr. Member A")
    expect(a?.image).toBe(imgA)
    expect(members.length).toBe(1)
  })
})

describe("parseBoardHtml — link icons are never portraits", () => {
  const ORCID_ICON =
    "https://demo.openjournaltheme.com/public/site/images/demo_ojs_red_modern/id.png"

  it("skips ORCID icons wrapped in profile-link anchors (ojbr production shape)", () => {
    // Production shape (journal 'ojbr', 2026-09-05): members with no real
    // photo had the ORCID "iD" glyph attached as their portrait.
    const html = `
      <div class="col-md-2"><img src="https://journals.zu.edu.ly/public/site/images/azaet/blobid7.png" alt=""></div>
      <div class="profile_info">
      <p><strong>Dr. Icon Member</strong></p>
      <p>Some University</p>
      <div class="orcid_logo"><a href="https://orcid.org/0000-0002-1649-8574"><img src="${ORCID_ICON}" alt="" width="16" height="16"> ORCID</a></div>
      </div>
    `
    const members = parseBoardHtml(html)
    const m = members.find((x) => x.name === "Dr. Icon Member")
    expect(m).toBeDefined()
    // The real photo (revived zu.edu.ly host) wins; the ORCID glyph is ignored.
    expect(m!.image).toBe(
      "https://journals.zu.edu.ly/public/site/images/azaet/blobid7.png"
    )
    expect(m!.orcid).toBe("0000-0002-1649-8574")
  })

  it("leaves the member photoless when the only image is an ORCID icon", () => {
    const html = `
      <p><strong>Dr. No Photo</strong></p>
      <p>Some University</p>
      <p><a href="https://orcid.org/0000-0002-1649-8574"><img src="${ORCID_ICON}" width="16" height="16"> ORCID</a></p>
    `
    const members = parseBoardHtml(html)
    const m = members.find((x) => x.name === "Dr. No Photo")
    expect(m).toBeDefined()
    expect(m!.image).toBeNull()
    expect(m!.orcid).toBe("0000-0002-1649-8574")
  })

  it("skips icon-sized images (width and height ≤ 32px) even outside anchors", () => {
    const html = `
      <p><strong>Dr. Tiny Icon</strong></p>
      <p><img src="https://example.com/icon.png" width="16" height="16"></p>
    `
    const members = parseBoardHtml(html)
    const m = members.find((x) => x.name === "Dr. Tiny Icon")
    expect(m).toBeDefined()
    expect(m!.image).toBeNull()
  })
})

describe("parseBoardHtml — dropped photo src logging", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  it("logs a warning when a relative URL is dropped", () => {
    const html = `
      <p><strong>Dr. Jane Smith</strong></p>
      <p><img src="/public/site/images/foo.jpg"></p>
      <p>University of Example</p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Jane Smith")
    expect(member).toBeDefined()
    expect(member!.image).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[NavPage] Dropping photo src with relative/unsupported scheme")
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("/public/site/images/foo.jpg")
    )
  })

  it("logs a warning when an oversized data URI is dropped", () => {
    // Create a data URI that exceeds MAX_DATA_URI_BYTES (400,000 bytes)
    const largeBase64 = "A".repeat(400_001)
    const oversizedDataUri = `data:image/png;base64,${largeBase64}`
    const html = `
      <p><strong>Dr. Bob Jones</strong></p>
      <p><img src="${oversizedDataUri}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Bob Jones")
    expect(member).toBeDefined()
    expect(member!.image).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[NavPage] Dropping oversized data URI")
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("400000")
    )
  })

  it("logs a warning when a malformed data URI is dropped", () => {
    const malformedDataUri = "data:image/png;base64,NOT_VALID_BASE64!@#$"
    const html = `
      <p><strong>Dr. Carol Lee</strong></p>
      <p><img src="${malformedDataUri}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Carol Lee")
    expect(member).toBeDefined()
    expect(member!.image).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[NavPage] Dropping malformed data URI")
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining(malformedDataUri)
    )
  })

  it("logs a warning when a file:// scheme is dropped", () => {
    const html = `
      <p><strong>Dr. Dave Kim</strong></p>
      <p><img src="file:///etc/passwd"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Dave Kim")
    expect(member).toBeDefined()
    expect(member!.image).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[NavPage] Dropping photo src with relative/unsupported scheme")
    )
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("file:///etc/passwd")
    )
  })

  it("does not log a warning for valid absolute URLs", () => {
    const url = `https://${CANONICAL_OJS_HOST}/public/journals/5/avatar.png`
    const html = `
      <p><strong>Dr. Eve Park</strong></p>
      <p><img src="${url}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Eve Park")
    expect(member).toBeDefined()
    expect(member!.image).toBe(url)
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it("does not log a warning for valid data URIs", () => {
    const validDataUri = "data:image/png;base64,iVBORw0KGgo="
    const html = `
      <p><strong>Dr. Frank Wu</strong></p>
      <p><img src="${validDataUri}"></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Frank Wu")
    expect(member).toBeDefined()
    expect(member!.image).toBe(validDataUri)
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it("does not log a warning for empty src attributes", () => {
    const html = `
      <p><strong>Dr. Grace Chen</strong></p>
      <p><img src=""></p>
    `
    const members = parseBoardHtml(html)
    const member = members.find((m) => m.name === "Dr. Grace Chen")
    expect(member).toBeDefined()
    expect(member!.image).toBeNull()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })
})
