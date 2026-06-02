import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { shouldEmitScholarCitationMeta } from "@/src/lib/seo/scholar-citation-flag"

let saved: string | undefined

beforeEach(() => {
  saved = process.env.EMIT_SCHOLAR_CITATION_META
})

afterEach(() => {
  if (saved === undefined) delete process.env.EMIT_SCHOLAR_CITATION_META
  else process.env.EMIT_SCHOLAR_CITATION_META = saved
})

describe("shouldEmitScholarCitationMeta", () => {
  it("defaults to false when the env var is unset", () => {
    delete process.env.EMIT_SCHOLAR_CITATION_META
    expect(shouldEmitScholarCitationMeta()).toBe(false)
  })

  it("returns true only when set to exact string 'true'", () => {
    process.env.EMIT_SCHOLAR_CITATION_META = "true"
    expect(shouldEmitScholarCitationMeta()).toBe(true)
  })

  it("rejects truthy-looking lookalikes ('1', 'TRUE', 'yes')", () => {
    for (const v of ["1", "TRUE", "True", "yes", "on", ""]) {
      process.env.EMIT_SCHOLAR_CITATION_META = v
      expect(shouldEmitScholarCitationMeta()).toBe(false)
    }
  })

  it("returns false when explicitly set to 'false'", () => {
    process.env.EMIT_SCHOLAR_CITATION_META = "false"
    expect(shouldEmitScholarCitationMeta()).toBe(false)
  })
})
