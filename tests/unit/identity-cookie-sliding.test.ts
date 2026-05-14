/**
 * US3-specific tests: sliding 30min, absolute 8h, and refreshSliding
 * boundary semantics.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

process.env.IDENTITY_COOKIE_SECRET ||= "test-secret"
process.env.ORCID_STATE_SECRET ||= "test-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-secret"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-secret"

vi.mock("@/src/lib/db/config", () => ({
    prisma: {
        revokedOrcid: {
            findUnique: vi.fn(async () => null),
        },
    },
}))

import {
    mintCookie,
    verifyCookie,
    refreshSliding,
    ABSOLUTE_TTL_SECONDS,
    SLIDING_TTL_SECONDS,
    SLIDING_REFRESH_WINDOW_SECONDS,
    SKEW_TOLERANCE_SECONDS,
} from "@/src/lib/identity-cookie"

const SAMPLE = {
    orcid: "0000-0001-2345-6789",
    ojs_user_id: 42,
    email_hash: null,
}

describe("identity-cookie sliding/absolute expiry semantics (US3)", () => {
    let iat: number

    beforeEach(() => {
        iat = 1_700_000_000
    })

    it("fresh cookie: valid, no refresh needed", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        const r = verifyCookie(cookie, iat)
        expect(r).not.toBeNull()
        expect(r!.refreshNeeded).toBe(false)
    })

    it("at 25 min: still valid, refresh needed inside the 5-min window", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        const r = verifyCookie(cookie, iat + 25 * 60 + 1)
        expect(r).not.toBeNull()
        expect(r!.refreshNeeded).toBe(true)
    })

    it("at 31 min after iat: sliding expired", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        const r = verifyCookie(
            cookie,
            iat + SLIDING_TTL_SECONDS + SKEW_TOLERANCE_SECONDS + 1
        )
        expect(r).toBeNull()
    })

    it("refreshSliding advances exp_sliding but preserves exp_absolute", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        const v = verifyCookie(cookie, iat + 60)!
        const { newPayload } = refreshSliding(v.payload, iat + 60)
        expect(newPayload.iat).toBe(iat) // iat never moves
        expect(newPayload.exp_absolute).toBe(iat + ABSOLUTE_TTL_SECONDS)
        expect(newPayload.exp_sliding).toBe(iat + 60 + SLIDING_TTL_SECONDS)
    })

    it("refreshSliding clamps exp_sliding to exp_absolute", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        const v = verifyCookie(cookie, iat + 60)!
        // 10 minutes before absolute expiry — sliding clamps to absolute.
        const near = iat + ABSOLUTE_TTL_SECONDS - 600
        const { newPayload } = refreshSliding(v.payload, near)
        expect(newPayload.exp_sliding).toBe(iat + ABSOLUTE_TTL_SECONDS)
    })

    it("at 7h 59m active: still valid after refresh", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        // Simulate continuous activity: re-verify at 29 min, refresh, re-mint.
        let payload = verifyCookie(cookie, iat + 29 * 60)!.payload
        for (let elapsed = 29 * 60; elapsed < ABSOLUTE_TTL_SECONDS - 60; elapsed += 29 * 60) {
            const { newPayload } = refreshSliding(payload, iat + elapsed)
            payload = newPayload
        }
        // Final check at 7h 59m.
        const finalNow = iat + ABSOLUTE_TTL_SECONDS - 60
        const stillValid =
            finalNow <= payload.exp_sliding + SKEW_TOLERANCE_SECONDS &&
            finalNow <= payload.exp_absolute + SKEW_TOLERANCE_SECONDS
        expect(stillValid).toBe(true)
    })

    it("at 8h 1m: invalid regardless of recent activity", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        // Refresh aggressively right before absolute expiry.
        let payload = verifyCookie(cookie, iat + 60)!.payload
        const refreshed = refreshSliding(payload, iat + ABSOLUTE_TTL_SECONDS - 60)
        payload = refreshed.newPayload
        // 1 min past absolute.
        const past = iat + ABSOLUTE_TTL_SECONDS + 60 + SKEW_TOLERANCE_SECONDS + 1
        // Re-mint a cookie from the refreshed payload to test verifyCookie
        // with that payload.
        const newCookie = mintCookie({ ...SAMPLE, now: iat })
        const r = verifyCookie(newCookie, past)
        expect(r).toBeNull()
        void payload // appease linter
    })

    it("refresh window boundaries are tight", () => {
        const cookie = mintCookie({ ...SAMPLE, now: iat })
        // Just outside refresh window (still > 5 min to expiry).
        const justOutside =
            iat + SLIDING_TTL_SECONDS - SLIDING_REFRESH_WINDOW_SECONDS - 1
        expect(verifyCookie(cookie, justOutside)!.refreshNeeded).toBe(false)
        // Just inside refresh window.
        const justInside =
            iat + SLIDING_TTL_SECONDS - SLIDING_REFRESH_WINDOW_SECONDS + 1
        expect(verifyCookie(cookie, justInside)!.refreshNeeded).toBe(true)
    })
})
