import { describe, it, expect, beforeEach } from "vitest"

process.env.ORCID_STATE_SECRET ||= "test-orcid-state-secret"
process.env.IDENTITY_COOKIE_SECRET ||= "test-identity-cookie-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-event-ip-hash-salt-seed"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-client-secret"

import {
    mintState,
    verifyAndConsumeState,
    StateExpiredError,
    StateInvalidError,
    StateReusedError,
    STATE_TTL_SECONDS,
    buildSetStateCookieHeader,
    buildClearStateCookieHeader,
    __resetConsumedNoncesForTests,
} from "@/src/lib/orcid-state"

describe("orcid-state", () => {
    beforeEach(() => {
        __resetConsumedNoncesForTests()
    })

    it("round-trips mint -> verify", () => {
        const now = 1_700_000_000
        const { token, nonce } = mintState({ return_url: "/foo", now })
        const payload = verifyAndConsumeState(token, now)
        expect(payload.return_url).toBe("/foo")
        expect(payload.nonce).toBe(nonce)
        expect(payload.exp).toBe(now + STATE_TTL_SECONDS)
    })

    it("rejects expired state", () => {
        const now = 1_700_000_000
        const { token } = mintState({ return_url: "/foo", now })
        expect(() => verifyAndConsumeState(token, now + STATE_TTL_SECONDS + 1)).toThrow(
            StateExpiredError
        )
    })

    it("rejects reused state nonce", () => {
        const { token } = mintState({ return_url: "/foo" })
        verifyAndConsumeState(token) // first call OK
        expect(() => verifyAndConsumeState(token)).toThrow(StateReusedError)
    })

    it("rejects malformed token", () => {
        expect(() => verifyAndConsumeState("")).toThrow(StateInvalidError)
        expect(() => verifyAndConsumeState("no-dot")).toThrow(StateInvalidError)
        expect(() => verifyAndConsumeState("a.b.c")).toThrow(StateInvalidError)
    })

    it("rejects tampered signature", () => {
        const { token } = mintState({ return_url: "/foo" })
        const [p, s] = token.split(".")
        const flipped = s.slice(0, -1) + (s.slice(-1) === "A" ? "B" : "A")
        expect(() => verifyAndConsumeState(`${p}.${flipped}`)).toThrow(StateInvalidError)
    })

    it("cookie header is path-scoped to /api/auth/orcid", () => {
        const header = buildSetStateCookieHeader("abc")
        expect(header).toContain("Path=/api/auth/orcid")
        expect(header).toContain("HttpOnly")
        expect(header).toContain("Secure")
        expect(header).toContain("SameSite=Lax")
        expect(header.toLowerCase()).not.toContain("domain=")
    })

    it("clear cookie sets Max-Age=0 with same scope", () => {
        const header = buildClearStateCookieHeader()
        expect(header).toContain("Path=/api/auth/orcid")
        expect(header).toContain("Max-Age=0")
    })
})
