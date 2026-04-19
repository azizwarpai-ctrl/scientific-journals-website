import { describe, it, expect } from "vitest"
import {
  splitBlockIntoCards,
  stripBlockTitleHeading,
  extractCardFields,
  subSplitSegmentByTitleAnchors,
  extractImgAlt,
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

describe("subSplitSegmentByTitleAnchors", () => {
  it("returns the segment unchanged when it contains a single title", () => {
    const seg = `
      <div>
        <div><strong>ORCID</strong></div>
        <img src="/img/orcid.png" alt="ORCID" />
        <div>ORCID description.</div>
      </div>
    `
    expect(subSplitSegmentByTitleAnchors(seg)).toEqual([seg])
  })

  it("splits a wrapper div that merges multiple logical card titles", () => {
    // Mirrors the OJBR 5th top-level div: one wrapper holding 3 logical
    // items (National Library of France / Google Scholar / IMEMR) each
    // marked by a standalone <strong>.
    const merged = `
      <div>
        <div><strong>The National Library of France</strong></div>
        <div><a href="https://bnf.fr"><img src="/img/bnf.png" alt="BnF"/></a></div>
        <div>BnF archival description.</div>
        <div><strong>Google Scholar</strong></div>
        <a href="https://scholar.google.com"><img src="/img/gs.png" alt="GS"/></a>
        <div>Indexed in Google Scholar.</div>
        <div><strong>IMEMR Index Medicus</strong></div>
        <div><a href="https://emro.who.int"><img src="/img/imemr.png" alt="IMEMR"/></a></div>
        <div>IMEMR profile.</div>
      </div>
    `
    const subs = subSplitSegmentByTitleAnchors(merged)
    expect(subs.length).toBe(3)
    expect(subs[0]).toMatch(/National Library of France/)
    expect(subs[1]).toMatch(/Google Scholar/)
    expect(subs[2]).toMatch(/IMEMR/)
    // Each sub-segment must contain the expected image marker
    expect(subs[0]).toMatch(/bnf\.png/)
    expect(subs[1]).toMatch(/gs\.png/)
    expect(subs[2]).toMatch(/imemr\.png/)
  })

  it("does NOT treat an inline <strong> value (like 'Online ISSN: 2966-6864') as an anchor", () => {
    // Only one qualifying anchor here → segment stays whole.
    const seg = `
      <div>
        <div><strong>ISSN</strong></div>
        <img src="/img/issn.png" alt="ISSN"/>
        <div>Online ISSN: <strong>2966-6864</strong></div>
      </div>
    `
    const subs = subSplitSegmentByTitleAnchors(seg)
    expect(subs).toEqual([seg])
  })
})

describe("extractImgAlt (title fallback)", () => {
  it("returns the alt of the first <img>", () => {
    expect(extractImgAlt(`<div><img src="/x.png" alt="My Label"/></div>`)).toBe(
      "My Label",
    )
  })

  it("returns undefined when no img exists", () => {
    expect(extractImgAlt(`<p>nothing here</p>`)).toBeUndefined()
  })

  it("returns undefined when alt is empty", () => {
    expect(extractImgAlt(`<img src="/x.png" alt=""/>`)).toBeUndefined()
  })

  it("decodes HTML entities in alt text", () => {
    expect(extractImgAlt(`<img src="/x.png" alt="A &amp; B"/>`)).toBe("A & B")
  })
})

describe("OJBR-style blockContent: 10 logical items across 8 top-level divs", () => {
  it("yields 10 card segments after sub-split pass", () => {
    // Structure mirroring journal_id=2 (ojbr) source-truth dump: the 5th
    // top-level div merges 3 logical items (BnF, Google Scholar, IMEMR).
    const html = `
      <h3>Journal Information</h3>
      <div>
        <div>
          <div><strong>International Standard Serial Number (ISSN)</strong></div>
          <a href="https://portal.issn.org/resource/ISSN/2966-6864"><img src="/img/issn.png" alt="ISSN"/></a>
          <div>Online ISSN: <strong>2966-6864</strong></div>
        </div>
        <div>
          <div><strong>Crossref Metadata Search</strong></div>
          <a href="https://search.crossref.org/"><img src="/img/crossref.png" alt="Crossref"/></a>
          <div>Search Crossref metadata.</div>
        </div>
        <div>
          <div><strong>ORCID</strong></div>
          <img src="/img/orcid.png" alt="ORCID iD icon"/>
          <div>The journal uses ORCID.</div>
        </div>
        <div>
          <div><strong>Plagiarism Checker</strong></div>
          <img src="/img/plag.png" alt="Plagiarism checker"/>
          <div>Manuscripts screened for originality.</div>
        </div>
        <div>
          <div><strong>The National Library of France</strong></div>
          <div><a href="https://bnf.fr"><img src="/img/bnf.png" alt="BnF"/></a></div>
          <div>Archived by BnF.</div>
          <div><strong>Google Scholar</strong></div>
          <a href="https://scholar.google.com"><img src="/img/gs.png" alt="Google Scholar"/></a>
          <div>Indexed in Google Scholar.</div>
          <div><strong>IMEMR Index Medicus</strong></div>
          <div><a href="https://emro.who.int"><img src="/img/imemr.png" alt="IMEMR"/></a></div>
          <div>IMEMR profile.</div>
        </div>
        <div>
          <div><strong>Index Copernicus (CIC)</strong></div>
          <a href="https://journals.indexcopernicus.com"><img src="/img/ici.png" alt="Index Copernicus (CIC)"/></a>
          <div>Journal profile on Index Copernicus.</div>
        </div>
        <div>
          <div><strong>Scilit Index</strong></div>
          <a href="https://www.scilit.com/sources/129253"><img src="/img/scilit.png" alt="Scilit Index"/></a>
          <div>Journal profile on Scilit Index.</div>
        </div>
        <div>
          <div><strong>Euro Pub</strong></div>
          <a href="https://europub.co.uk/journals/29744"><img src="/img/europub.png" alt="Euro Pub"/></a>
          <div>Journal entry on Euro Pub.</div>
        </div>
      </div>
    `

    const topSegments = splitBlockIntoCards(html)
    expect(topSegments.length).toBe(8) // 8 direct wrapper divs

    const refined = topSegments.flatMap(subSplitSegmentByTitleAnchors)
    expect(refined.length).toBe(10) // 10 logical items after sub-split

    const titles = refined.map((seg, i) => extractCardFields(seg, `ojbr-${i}`).title)
    expect(titles).toEqual([
      "International Standard Serial Number (ISSN)",
      "Crossref Metadata Search",
      "ORCID",
      "Plagiarism Checker",
      "The National Library of France",
      "Google Scholar",
      "IMEMR Index Medicus",
      "Index Copernicus (CIC)",
      "Scilit Index",
      "Euro Pub",
    ])
  })
})
