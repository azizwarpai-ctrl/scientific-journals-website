import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  DEFAULT_OJS_LANDING_BASE_URL,
  buildOjsArticleLandingUrl,
  getOjsHostnames,
} from "@/src/features/ojs/utils/ojs-config"

// Snapshot/restore the env keys we mutate so tests don't leak into the rest
// of the suite (vitest forks pool, but isolate=true happens at file level).
const ENV_KEYS = [
  "OJS_BASE_URL",
  "PUBLIC_OJS_BASE_URL",
  "NEXT_PUBLIC_OJS_BASE_URL",
] as const

let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]])) as typeof savedEnv
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
})

describe("buildOjsArticleLandingUrl", () => {
  it("uses PUBLIC_OJS_BASE_URL when set and points at the subdomain", () => {
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    const url = buildOjsArticleLandingUrl("jaodfh", 42)
    expect(new URL(url).hostname).toBe("journals.digitopub.com")
    expect(url).toBe("https://journals.digitopub.com/index.php/jaodfh/article/view/42")
  })

  it("falls back to the end-state default when no env var is set", () => {
    delete process.env.OJS_BASE_URL
    delete process.env.PUBLIC_OJS_BASE_URL
    delete process.env.NEXT_PUBLIC_OJS_BASE_URL
    const url = buildOjsArticleLandingUrl("ijbcdc", 7)
    expect(new URL(url).hostname).toBe("journals.digitopub.com")
    expect(url.startsWith(DEFAULT_OJS_LANDING_BASE_URL)).toBe(true)
  })

  it("prefers PUBLIC_OJS_BASE_URL over NEXT_PUBLIC_OJS_BASE_URL", () => {
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    process.env.NEXT_PUBLIC_OJS_BASE_URL = "https://stale.example.com"
    const url = buildOjsArticleLandingUrl("jdr", 99)
    expect(new URL(url).hostname).toBe("journals.digitopub.com")
  })

  it("strips a trailing /ojs from the base so URLs resolve to /index.php/...", () => {
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com/ojs"
    const url = buildOjsArticleLandingUrl("jcd", 3)
    expect(url).toBe("https://journals.digitopub.com/index.php/jcd/article/view/3")
  })

  it("percent-encodes the journal slug to neutralise stray characters", () => {
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    const url = buildOjsArticleLandingUrl("weird path?x", 1)
    expect(url).toContain("/index.php/weird%20path%3Fx/article/view/1")
  })

  it("accepts numeric or string submissionId", () => {
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    expect(buildOjsArticleLandingUrl("j", 12)).toContain("/article/view/12")
    expect(buildOjsArticleLandingUrl("j", "12")).toContain("/article/view/12")
  })
})

describe("getOjsHostnames", () => {
  it("includes hostnames from every configured env var", () => {
    process.env.OJS_BASE_URL = "http://internal.local"
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    process.env.NEXT_PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    const hosts = getOjsHostnames()
    expect(hosts.has("internal.local")).toBe(true)
    expect(hosts.has("journals.digitopub.com")).toBe(true)
  })

  it("always includes the end-state default hostname", () => {
    delete process.env.OJS_BASE_URL
    delete process.env.PUBLIC_OJS_BASE_URL
    delete process.env.NEXT_PUBLIC_OJS_BASE_URL
    const hosts = getOjsHostnames()
    expect(hosts.has("journals.digitopub.com")).toBe(true)
  })

  it("silently drops malformed env values rather than throwing", () => {
    process.env.OJS_BASE_URL = "::: not a url :::"
    process.env.PUBLIC_OJS_BASE_URL = "https://journals.digitopub.com"
    expect(() => getOjsHostnames()).not.toThrow()
    const hosts = getOjsHostnames()
    expect(hosts.has("journals.digitopub.com")).toBe(true)
  })
})
