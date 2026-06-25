import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Repository hygiene guard for the OJS image pipeline.
 *
 * The pipeline has exactly one render path — `<OjsImage>` — and exactly one
 * URL-construction surface — `parseOjsFilename` + `buildOjsAssetUrl` /
 * `buildOjsPublicUrl` in `src/features/ojs/utils/ojs-asset-url.ts`.
 *
 * A bare `<img src={ojs…}>` in a feature component would bypass
 * `/api/image-proxy` and the OJS host's hotlink/WAF would block the request.
 * A hand-built `${ojsBase}/public/...` URL would bypass the basename
 * sanitization in `buildOjsPublicUrl` and reintroduce the host-literal drift
 * T1 cleaned up.
 *
 * These tests fail loudly the next time either pattern reappears.
 */

const REPO_ROOTS = ["app", "src"] as const
const FILE_EXTENSIONS = [".ts", ".tsx"] as const

const ALLOWED_RAW_IMG_FILES = new Set([
  // The canonical render component — this is the only blessed <img> JSX in
  // the repo and is exempt from the guard.
  "src/features/ojs/components/ojs-image.tsx",
  // Server-side HTML string rewriter for inline OJS images — manipulates <img>
  // in sanitized HTML strings, not JSX.
  "src/features/ojs/utils/rewrite-inline-images.ts",
])

const ALLOWED_URL_BUILDERS = new Set([
  // The shared resolver — the only file allowed to assemble OJS public URLs
  // from primitives.
  "src/features/ojs/utils/ojs-asset-url.ts",
])

/** Matches a JSX `<img>` tag specifically — at least one attribute name=value. */
const JSX_IMG_TAG = /<img\s+[a-zA-Z][a-zA-Z0-9-]*\s*=/

/**
 * Matches a hand-built OJS public URL — `${X}/public/(journals|site)/...` or
 * an absolute `https://host/public/(journals|site)/...`. Does NOT match the
 * legitimate `"public/journals/<id>"` subpath argument shape that callers
 * pass to `buildOjsAssetUrl` / `buildOjsPublicUrl` (no leading slash, no
 * template-close before the segment).
 */
const HAND_BUILT_OJS_URL =
  /(\$\{[^}]+\}|https?:\/\/[^\s'"`]+)\/public\/(journals|site)\//

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

describe("OJS image pipeline — repository guards", () => {
  it("has no bare <img> JSX outside <OjsImage>", () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles()) {
      if (ALLOWED_RAW_IMG_FILES.has(file)) continue
      const source = readFileSync(file, "utf8")
      if (JSX_IMG_TAG.test(source)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it("does not hand-build OJS /public/{journals,site}/ URLs outside the shared resolver", () => {
    const offenders: string[] = []
    for (const file of collectSourceFiles()) {
      if (ALLOWED_URL_BUILDERS.has(file)) continue
      const source = readFileSync(file, "utf8")
      if (HAND_BUILT_OJS_URL.test(source)) {
        offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
