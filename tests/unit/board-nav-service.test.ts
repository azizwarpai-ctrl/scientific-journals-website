import { describe, it, expect } from "vitest"
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
