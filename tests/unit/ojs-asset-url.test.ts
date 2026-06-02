import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { parseOjsFilename, buildOjsPublicUrl, buildOjsAssetUrl } from "@/src/features/ojs/utils/ojs-asset-url"
import { normalizeOjsAssetUrl } from "@/src/features/ojs/utils/ojs-config"

// ─── parseOjsFilename ─────────────────────────────────────────────────────────

describe("parseOjsFilename", () => {
  it("returns null for null input", () => {
    expect(parseOjsFilename(null)).toBeNull()
  })

  it("returns null for undefined input", () => {
    expect(parseOjsFilename(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseOjsFilename("")).toBeNull()
  })

  it("returns null for garbage input", () => {
    expect(parseOjsFilename("not-an-image-at-all")).toBeNull()
  })

  it("returns null for numeric-only string", () => {
    expect(parseOjsFilename("12345")).toBeNull()
  })

  // JSON format — flat
  it("parses flat JSON with uploadName", () => {
    expect(parseOjsFilename('{"uploadName":"photo.jpg"}')).toBe("photo.jpg")
  })

  // JSON format — nested locale key
  it("parses nested JSON with locale key", () => {
    const raw = JSON.stringify({ en_US: { uploadName: "cover_issue_1_en_US.png" } })
    expect(parseOjsFilename(raw)).toBe("cover_issue_1_en_US.png")
  })

  it("parses nested JSON with multiple locale keys (returns first found)", () => {
    const raw = JSON.stringify({
      en_US: { uploadName: "photo.jpg" },
      fr_FR: { uploadName: "photo_fr.jpg" },
    })
    expect(parseOjsFilename(raw)).toBe("photo.jpg")
  })

  it("returns null for JSON without name or uploadName", () => {
    // Both `name` (preferred, the on-disk filename in OJS 3.x) and `uploadName`
    // (the original uploaded name) are recognized keys. A JSON object that
    // carries neither — and no nested object that does — has nothing to extract.
    expect(parseOjsFilename('{"label":"something","value":42}')).toBeNull()
  })

  it("returns null for JSON with empty uploadName", () => {
    expect(parseOjsFilename('{"uploadName":""}')).toBeNull()
  })

  // PHP-serialized format
  it("parses PHP-serialized array with uploadName", () => {
    const raw = 'a:2:{s:10:"uploadName";s:9:"photo.jpg";s:4:"type";s:9:"image/jpg";}'
    expect(parseOjsFilename(raw)).toBe("photo.jpg")
  })

  it("parses PHP-serialized with longer filename", () => {
    const raw = 'a:1:{s:10:"uploadName";s:23:"cover_issue_1_en_US.png";}'
    expect(parseOjsFilename(raw)).toBe("cover_issue_1_en_US.png")
  })

  // Plain string — OJS prefix patterns
  it("returns plain string with cover_issue_ prefix", () => {
    expect(parseOjsFilename("cover_issue_1_en_US.png")).toBe("cover_issue_1_en_US.png")
  })

  it("returns plain string with article_ prefix", () => {
    expect(parseOjsFilename("article_123.png")).toBe("article_123.png")
  })

  it("returns plain string with cover_ prefix", () => {
    expect(parseOjsFilename("cover_journal.png")).toBe("cover_journal.png")
  })

  // Plain string — image extension
  it("returns plain .jpg string", () => {
    expect(parseOjsFilename("photo.jpg")).toBe("photo.jpg")
  })

  it("returns plain .jpeg string", () => {
    expect(parseOjsFilename("photo.jpeg")).toBe("photo.jpeg")
  })

  it("returns plain .webp string", () => {
    expect(parseOjsFilename("image.webp")).toBe("image.webp")
  })

  it("returns plain .gif string", () => {
    expect(parseOjsFilename("anim.gif")).toBe("anim.gif")
  })

  it("returns plain .PNG string (case-insensitive extension)", () => {
    expect(parseOjsFilename("photo.PNG")).toBe("photo.PNG")
  })

  it("trims surrounding whitespace from plain string", () => {
    expect(parseOjsFilename("  photo.jpg  ")).toBe("photo.jpg")
  })
})

// ─── buildOjsPublicUrl ────────────────────────────────────────────────────────

describe("buildOjsPublicUrl", () => {
  it("builds a simple URL", () => {
    expect(buildOjsPublicUrl("https://example.com", "public/journals/10", "cover.png")).toBe(
      "https://example.com/public/journals/10/cover.png"
    )
  })

  it("strips leading slash from subpath", () => {
    expect(buildOjsPublicUrl("https://example.com", "/public/journals/10", "cover.png")).toBe(
      "https://example.com/public/journals/10/cover.png"
    )
  })

  it("strips trailing slash from subpath", () => {
    expect(buildOjsPublicUrl("https://example.com", "public/journals/10/", "cover.png")).toBe(
      "https://example.com/public/journals/10/cover.png"
    )
  })

  it("percent-encodes the filename", () => {
    expect(
      buildOjsPublicUrl("https://example.com", "public/site/profileImages", "my photo.jpg")
    ).toBe("https://example.com/public/site/profileImages/my%20photo.jpg")
  })

  it("strips path traversal from filename (basename only)", () => {
    // path.basename("../../etc/passwd") === "passwd"
    // so the traversal is stripped and only the leaf filename survives
    const result = buildOjsPublicUrl(
      "https://example.com",
      "public/journals/10",
      "../../etc/passwd"
    )
    expect(result).toBe("https://example.com/public/journals/10/passwd")
    expect(result).not.toContain("..")
    expect(result).not.toContain("/etc/")
  })

  it("strips Windows-style backslash path traversal", () => {
    // path.basename on Linux doesn't treat '\\' as a separator, so we normalize
    // backslashes to forward slashes before basename
    const result = buildOjsPublicUrl(
      "https://example.com",
      "public/journals/10",
      "..\\..\\secret.png"
    )
    expect(result).toBe("https://example.com/public/journals/10/secret.png")
    expect(result).not.toContain("..")
    expect(result).not.toContain("%5C")
  })

  it("strips mixed forward/back slash traversal", () => {
    const result = buildOjsPublicUrl(
      "https://example.com",
      "public/site",
      "..\\..\\../etc\\passwd"
    )
    expect(result).toBe("https://example.com/public/site/passwd")
  })

  it("does not double-encode an already-clean filename", () => {
    const result = buildOjsPublicUrl("https://example.com", "public/journals/1", "cover.png")
    expect(result).toBe("https://example.com/public/journals/1/cover.png")
  })
})

// ─── buildOjsAssetUrl ─────────────────────────────────────────────────────────

describe("buildOjsAssetUrl", () => {
  const originalEnv = process.env.OJS_BASE_URL

  beforeEach(() => {
    process.env.OJS_BASE_URL = "https://submitmanager.com"
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OJS_BASE_URL
    } else {
      process.env.OJS_BASE_URL = originalEnv
    }
  })

  it("returns null for null filename", () => {
    expect(buildOjsAssetUrl("public/journals/10", null)).toBeNull()
  })

  it("returns null for undefined filename", () => {
    expect(buildOjsAssetUrl("public/journals/10", undefined)).toBeNull()
  })

  it("returns null for empty filename", () => {
    expect(buildOjsAssetUrl("public/journals/10", "")).toBeNull()
  })

  it("builds a correct cover image URL", () => {
    expect(buildOjsAssetUrl("public/journals/10", "cover.png")).toBe(
      "https://submitmanager.com/public/journals/10/cover.png"
    )
  })

  it("builds a correct profile image URL", () => {
    expect(buildOjsAssetUrl("public/site/profileImages", "photo.jpg")).toBe(
      "https://submitmanager.com/public/site/profileImages/photo.jpg"
    )
  })

  it("strips /ojs from OJS_BASE_URL that includes the subpath", () => {
    process.env.OJS_BASE_URL = "https://submitmanager.com/ojs"
    expect(buildOjsAssetUrl("public/journals/10", "cover.png")).toBe(
      "https://submitmanager.com/public/journals/10/cover.png"
    )
  })

  it("normalizes /ojs/public/ if it somehow appears in the final URL", () => {
    // Even if the env var contains /ojs, the output must not contain /ojs/public/
    process.env.OJS_BASE_URL = "https://submitmanager.com/ojs"
    const url = buildOjsAssetUrl("public/journals/5", "homepageImage_en.png")
    expect(url).not.toContain("/ojs/public/")
    expect(url).toContain("/public/journals/5/homepageImage_en.png")
  })
})

// ─── Regression guard: /ojs/public/ rewrite ──────────────────────────────────

describe("normalizeOjsAssetUrl", () => {
  it("rewrites legacy /ojs/public/ URLs to /public/", () => {
    const legacy = "https://submitmanager.com/ojs/public/journals/10/cover.png"
    expect(normalizeOjsAssetUrl(legacy)).toBe(
      "https://submitmanager.com/public/journals/10/cover.png"
    )
  })

  it("is case-insensitive for /OJS/Public/", () => {
    const mixed = "https://submitmanager.com/OJS/Public/journals/10/cover.png"
    expect(normalizeOjsAssetUrl(mixed)).toBe(
      "https://submitmanager.com/public/journals/10/cover.png"
    )
  })

  it("passes through already-correct URLs unchanged", () => {
    const correct = "https://submitmanager.com/public/journals/10/cover.png"
    expect(normalizeOjsAssetUrl(correct)).toBe(correct)
  })

  it("returns null for null input", () => {
    expect(normalizeOjsAssetUrl(null)).toBeNull()
  })

  it("returns null for undefined input", () => {
    expect(normalizeOjsAssetUrl(undefined)).toBeNull()
  })
})
