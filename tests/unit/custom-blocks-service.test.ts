import { describe, it, expect } from "vitest"
import {
  splitBlockIntoCards,
  stripBlockTitleHeading,
  extractCardFields,
} from "@/src/features/journals/server/custom-blocks-service"

describe("stripBlockTitleHeading", () => {
  it("strips a known label heading ('Journal Information') from the top", () => {
    const html = `<h3>Journal Information</h3><p>body text</p>`
    const out = stripBlockTitleHeading(html)
    expect(out).not.toMatch(/Journal Information/)
    expect(out).toMatch(/body text/)
  })

  it("strips the only top-level heading when cards follow", () => {
    const html = `<h3>Sidebar</h3><div><strong>A</strong></div><div><strong>B</strong></div>`
    const out = stripBlockTitleHeading(html)
    expect(out).not.toMatch(/Sidebar/)
    expect(out).toMatch(/<strong>A<\/strong>/)
  })

  it("leaves content without a root heading unchanged in shape", () => {
    const html = `<p>just text</p>`
    const out = stripBlockTitleHeading(html)
    expect(out).toMatch(/just text/)
  })
})

describe("splitBlockIntoCards", () => {
  it("splits a block with nested wrapper divs around each card", () => {
    const html = `
      <h3>Journal Information</h3>
      <div>
        <div><strong>Crossref Metadata Search</strong></div>
        <img src="/img/crossref.png" alt="Crossref" />
        <div>Crossref Metadata Search description.</div>
      </div>
      <div>
        <div><strong>ORCID</strong></div>
        <img src="/img/orcid.png" alt="ORCID" />
        <div>ORCID description.</div>
      </div>
      <div>
        <div><strong>Plagiarism Checker</strong></div>
        <img src="/img/iThenticate.png" alt="iThenticate" />
        <div>Plagiarism description.</div>
      </div>
      <div>
        <div><strong>Google Scholar</strong></div>
        <img src="/img/gs.png" alt="GS" />
        <div>Google Scholar description.</div>
      </div>
    `
    const segments = splitBlockIntoCards(html)
    expect(segments.length).toBe(4)
    expect(segments[0]).toMatch(/Crossref Metadata Search/)
    expect(segments[1]).toMatch(/ORCID/)
    expect(segments[2]).toMatch(/Plagiarism Checker/)
    expect(segments[3]).toMatch(/Google Scholar/)
    // Outer block-title must NOT leak into the first card
    expect(segments[0]).not.toMatch(/Journal Information/)
  })

  it("splits flat paragraph-based cards using strong anchors", () => {
    const html = `
      <h3>Journal Information</h3>
      <p><strong>Crossref Metadata Search</strong></p>
      <p><img src="/img/c.png" alt="c" /></p>
      <p>Crossref description.</p>
      <p><strong>ORCID</strong></p>
      <p><img src="/img/o.png" alt="o" /></p>
      <p>ORCID description.</p>
    `
    const segments = splitBlockIntoCards(html)
    expect(segments.length).toBe(2)
    expect(segments[0]).toMatch(/Crossref/)
    expect(segments[1]).toMatch(/ORCID/)
  })

  it("splits on <hr> boundaries", () => {
    const html = `
      <p><strong>One</strong></p><p>body 1</p>
      <hr/>
      <p><strong>Two</strong></p><p>body 2</p>
      <hr/>
      <p><strong>Three</strong></p><p>body 3</p>
    `
    const segments = splitBlockIntoCards(html)
    expect(segments.length).toBe(3)
  })

  it("returns [] when no repeating pattern exists", () => {
    const html = `<p>Just a single paragraph with no structure.</p>`
    const segments = splitBlockIntoCards(html)
    expect(segments).toEqual([])
  })

  it("ignores <hr> nested inside another element (does not root-level split)", () => {
    const html = `
      <div>
        <p><strong>Card One</strong></p>
        <p>Body 1</p>
        <hr/>
        <p><strong>Card Two</strong></p>
        <p>Body 2</p>
      </div>
    `
    const segments = splitBlockIntoCards(html)
    // HR is nested, so no root-level split. Fallback strategies may or may not
    // find a pattern depending on DOM structure; what matters is we don't
    // incorrectly split on the nested <hr> via regex.
    // Either 0 (no pattern) or 1-2 (found via other strategy), but NOT from <hr> split.
    expect(segments.length).not.toBeGreaterThanOrEqual(2)
  })

  it("produces 4 cards matching the expected JSON shape when run through extractCardFields", () => {
    const html = `
      <h3>Journal Information</h3>
      <div>
        <div><strong>Crossref Metadata Search</strong></div>
        <a href="https://search.crossref.org"><img src="/img/crossref.png" alt="Crossref" /></a>
        <div>A popular search tool for authors.</div>
      </div>
      <div>
        <div><strong>ORCID</strong></div>
        <a href="https://orcid.org"><img src="/img/orcid.png" alt="ORCID" /></a>
        <div>A unique digital identifier.</div>
      </div>
      <div>
        <div><strong>Plagiarism Checker</strong></div>
        <img src="/img/iThenticate.png" alt="iThenticate" />
        <div>Plagiarism screening service.</div>
      </div>
      <div>
        <div><strong>Google Scholar</strong></div>
        <a href="https://scholar.google.com"><img src="/img/gs.png" alt="GS" /></a>
        <div>Indexed in Google Scholar.</div>
      </div>
    `
    const segments = splitBlockIntoCards(html)
    const cards = segments.map((seg, i) => extractCardFields(seg, `side-menu-${i}`))
    expect(cards).toHaveLength(4)
    expect(cards[0].title).toBe("Crossref Metadata Search")
    expect(cards[1].title).toBe("ORCID")
    expect(cards[2].title).toBe("Plagiarism Checker")
    expect(cards[3].title).toBe("Google Scholar")
    expect(cards[0].image).toMatch(/crossref/)
    expect(cards[0].link).toMatch(/crossref\.org/)
  })
})
