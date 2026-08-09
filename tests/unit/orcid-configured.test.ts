import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { isOrcidConfigured } from "@/src/lib/env"

const VARS = [
    "ORCID_CLIENT_ID",
    "ORCID_CLIENT_SECRET",
    "ORCID_STATE_SECRET",
    "IDENTITY_COOKIE_SECRET",
] as const

const saved: Record<string, string | undefined> = {}
for (const v of VARS) saved[v] = process.env[v]

function setAll() {
    process.env.ORCID_CLIENT_ID = "cid"
    process.env.ORCID_CLIENT_SECRET = "csec"
    process.env.ORCID_STATE_SECRET = "ssec"
    process.env.IDENTITY_COOKIE_SECRET = "cookie_secret"
}

afterAll(() => {
    for (const v of VARS) {
        if (saved[v] === undefined) delete process.env[v]
        else process.env[v] = saved[v]
    }
})

describe("isOrcidConfigured", () => {
    beforeEach(() => {
        setAll()
    })

    it("returns true when all four vars are set", () => {
        expect(isOrcidConfigured()).toBe(true)
    })

    for (const missing of VARS) {
        it(`returns false when ${missing} is missing`, () => {
            delete process.env[missing]
            expect(isOrcidConfigured()).toBe(false)
        })

        it(`returns false when ${missing} is empty string`, () => {
            process.env[missing] = ""
            expect(isOrcidConfigured()).toBe(false)
        })
    }

    it("returns false when all vars are missing", () => {
        for (const v of VARS) delete process.env[v]
        expect(isOrcidConfigured()).toBe(false)
    })

    it("never throws regardless of env state", () => {
        for (const v of VARS) delete process.env[v]
        expect(() => isOrcidConfigured()).not.toThrow()
        setAll()
        expect(() => isOrcidConfigured()).not.toThrow()
    })

    it("is not cached — reflects env changes between calls", () => {
        expect(isOrcidConfigured()).toBe(true)
        delete process.env.ORCID_CLIENT_ID
        expect(isOrcidConfigured()).toBe(false)
        process.env.ORCID_CLIENT_ID = "cid"
        expect(isOrcidConfigured()).toBe(true)
    })
})
