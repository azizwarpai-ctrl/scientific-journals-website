import { describe, it, expect } from "vitest"
import { extractLinksFromBiography } from "@/src/features/journals/server/editorial-board-service"

describe("extractLinksFromBiography — HTML entity decoding", () => {
  it("returns nulls for null input", () => {
    expect(extractLinksFromBiography(null)).toEqual({
      orcid: null,
      googleScholar: null,
      scopus: null,
    })
  })

  it("extracts a clean (no entities) Google Scholar URL", () => {
    const bio = `<p>See my profile: <a href="https://scholar.google.com/citations?user=ABC123">Scholar</a></p>`
    const { googleScholar } = extractLinksFromBiography(bio)
    expect(googleScholar).toBe("https://scholar.google.com/citations?user=ABC123")
  })

  it("decodes &amp; in multi-param Google Scholar URL (the reported bug class)", () => {
    const bio = `<p><a href="https://scholar.google.com/citations?hl=en&amp;user=jQuDgSkAAAAJ">Scholar</a></p>`
    const { googleScholar } = extractLinksFromBiography(bio)
    expect(googleScholar).toBe("https://scholar.google.com/citations?hl=en&user=jQuDgSkAAAAJ")
  })

  it("decodes &#38; (decimal) in Google Scholar URL", () => {
    const bio = `<p><a href="https://scholar.google.com/citations?hl=en&#38;user=XYZ">Scholar</a></p>`
    const { googleScholar } = extractLinksFromBiography(bio)
    expect(googleScholar).toBe("https://scholar.google.com/citations?hl=en&user=XYZ")
  })

  it("decodes &#x26; (hex) in Google Scholar URL", () => {
    const bio = `<p><a href="https://scholar.google.com/citations?hl=en&#x26;user=XYZ">Scholar</a></p>`
    const { googleScholar } = extractLinksFromBiography(bio)
    expect(googleScholar).toBe("https://scholar.google.com/citations?hl=en&user=XYZ")
  })

  it("decodes &amp; in Scopus URL", () => {
    const bio = `<p><a href="https://www.scopus.com/authid/detail.uri?authorId=123&amp;origin=ResultsList">Scopus</a></p>`
    const { scopus } = extractLinksFromBiography(bio)
    expect(scopus).toBe("https://www.scopus.com/authid/detail.uri?authorId=123&origin=ResultsList")
  })

  it("extracts ORCID ID correctly — not affected by entity encoding (digits only)", () => {
    const bio = `<p><a href="https://orcid.org/0000-0002-1825-0097">ORCID</a></p>`
    const { orcid } = extractLinksFromBiography(bio)
    expect(orcid).toBe("0000-0002-1825-0097")
  })

  it("returns null googleScholar when no scholar link is present", () => {
    const bio = `<p>No links here.</p>`
    const { googleScholar } = extractLinksFromBiography(bio)
    expect(googleScholar).toBeNull()
  })

  it("extracts all three links from a single biography", () => {
    const bio = [
      `<p><a href="https://orcid.org/0000-0002-1825-0097">ORCID</a></p>`,
      `<p><a href="https://scholar.google.com/citations?hl=en&amp;user=ABC">Scholar</a></p>`,
      `<p><a href="https://www.scopus.com/authid/detail.uri?authorId=999">Scopus</a></p>`,
    ].join("")
    const result = extractLinksFromBiography(bio)
    expect(result.orcid).toBe("0000-0002-1825-0097")
    expect(result.googleScholar).toBe("https://scholar.google.com/citations?hl=en&user=ABC")
    expect(result.scopus).toBe("https://www.scopus.com/authid/detail.uri?authorId=999")
  })
})
