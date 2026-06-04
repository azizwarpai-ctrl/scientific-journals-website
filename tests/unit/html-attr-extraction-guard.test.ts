import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Repository hygiene guard for HTML attribute extraction.
 *
 * The original iJMP Highlights bug — `&amp;` surviving in href URLs and
 * breaking multi-param links like Google Scholar's
 * `?hl=en&user=jQuDgSkAAAAJ` — came from extracting `href`/`src` with a raw
 * regex literal whose capture group inherited the encoded attribute text.
 *
 * The fix is structural: extract via cheerio `.attr()` (which decodes
 * entities), or pre-decode the entire HTML via `decodeHtmlEntities()`
 * before any regex pass. Both halves of the codebase (custom-blocks
 * cards via cheerio, biography links via pre-decode) are on this pattern;
 * this guard fails the suite if anyone reintroduces the raw form.
 *
 * Forbidden shape: a regex literal that captures the value of an
 * `href=`/`src=` attribute, recognizable as the byte sequence
 * `(?:href|src)=["']?(` in any non-comment line of `app/**` or `src/**`.
 */

const REPO_ROOTS = ["app", "src"] as const
const FILE_EXTENSIONS = [".ts", ".tsx"] as const

const ALLOWED_FILES = new Set<string>([
  // No file currently captures href/src via regex; allowlist is empty and
  // stays empty. Adding entries here defeats the guard — fix the offending
  // code instead.
])

/**
 * Matches a regex literal that captures the value of an `href`/`src`
 * attribute. Anchored to the literal's opening `/` so plain variable
 * assignments like `const href = (...)` and method calls like
 * `cheerio(a).attr("href")` are NOT flagged.
 *
 *   /href="([^"]+)"/         → match (regex literal containing href="(  )
 *   /src=([^>]+)/            → match
 *   const href = (value)     → no match (no leading `/`)
 *   $(a).attr("href")        → no match (no leading `/`, no `=` after href)
 *   <a href="…">             → no match (no `(` after the value start)
 */
const RAW_ATTR_REGEX_CAPTURE =
  /\/[^\n/]*(?:href|src)\s*=\s*["']?\(/

function walkSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...walkSourceFiles(full))
    } else if (FILE_EXTENSIONS.some((ext) => full.endsWith(ext))) {
      out.push(full)
    }
  }
  return out
}

function collectSourceFiles(): string[] {
  return REPO_ROOTS.flatMap((root) => walkSourceFiles(root))
}

/** Strip `// …` line comments and skip whole-line comment lines. */
function stripCommentNoise(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart()
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        return ""
      }
      return line.replace(/\/\/.*$/, "")
    })
    .join("\n")
}

describe("HTML attribute extraction — repository guards", () => {
  it("does not capture href/src via a raw regex literal anywhere in app/ or src/", () => {
    const offenders: { file: string; line: number; text: string }[] = []
    for (const file of collectSourceFiles()) {
      if (ALLOWED_FILES.has(file)) continue
      const cleaned = stripCommentNoise(readFileSync(file, "utf8"))
      const lines = cleaned.split("\n")
      for (const [idx, line] of lines.entries()) {
        if (RAW_ATTR_REGEX_CAPTURE.test(line)) {
          offenders.push({ file, line: idx + 1, text: line.trim() })
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe("RAW_ATTR_REGEX_CAPTURE — self-test", () => {
  it("flags the bug class: /href=\"([^\"]+)\"/", () => {
    const sample = `const m = html.match(/href="([^"]+)"/)`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(true)
  })

  it("flags unquoted attribute capture: /href=([^>]+)/", () => {
    const sample = `html.match(/href=([^>]+)/)`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(true)
  })

  it("flags /src=\"(.*?)\"/", () => {
    const sample = `html.match(/src="(.*?)"/)`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(true)
  })

  it("does NOT flag variable assignment `const href = (foo)`", () => {
    const sample = `const href = (value ?? "").trim()`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(false)
  })

  it("does NOT flag cheerio `attr(\"href\")` calls", () => {
    const sample = `const href = $(a).attr("href") ?? ""`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(false)
  })

  it("does NOT flag plain JSX `<a href=\"…\">`", () => {
    const sample = `<a href="https://example.com">link</a>`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(false)
  })

  it("does NOT flag attribute-stripping regex `/<a[^>]*>.*?<\\/a>/`", () => {
    const sample = `html.replace(/<a[^>]*>.*?<\\/a>/gi, '')`
    expect(RAW_ATTR_REGEX_CAPTURE.test(sample)).toBe(false)
  })
})
