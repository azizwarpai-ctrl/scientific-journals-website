import { describe, it, expect, beforeEach, vi } from "vitest"

// Stub env BEFORE importing the SUT so getEnv() reads the dev defaults.
process.env.IDENTITY_COOKIE_SECRET ||= "test-identity-cookie-secret"
process.env.ORCID_STATE_SECRET ||= "test-orcid-state-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-event-ip-hash-salt-seed"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-client-secret"

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
    getIdentity,
    SLIDING_TTL_SECONDS,
    ABSOLUTE_TTL_SECONDS,
    SKEW_TOLERANCE_SECONDS,
    SLIDING_REFRESH_WINDOW_SECONDS,
    buildSetCookieHeader,
    buildClearCookieHeader,
    refreshedCookieMaxAge,
    refreshSliding,
    __resetRevocationCacheForTests,
    IDENTITY_COOKIE_NAME,
} from "@/src/lib/identity-cookie"
import { prisma } from "@/src/lib/db/config"

const SAMPLE = {
    orcid: "0000-0001-2345-6789",
    ojs_user_id: 42,
    email_hash: "a".repeat(64),
}

describe("identity-cookie", () => {
    beforeEach(() => {
        __resetRevocationCacheForTests()
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue(null)
    })

    describe("mint + verify round-trip", () => {
        it("verifies a freshly minted cookie", () => {
            const now = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now })
            const result = verifyCookie(cookie, now)
            expect(result).not.toBeNull()
            expect(result!.payload.orcid).toBe(SAMPLE.orcid)
            expect(result!.payload.iat).toBe(now)
            expect(result!.payload.exp_sliding).toBe(now + SLIDING_TTL_SECONDS)
            expect(result!.payload.exp_absolute).toBe(now + ABSOLUTE_TTL_SECONDS)
            expect(result!.refreshNeeded).toBe(false)
        })
    })

    describe("HMAC tamper rejection", () => {
        it("rejects a cookie with a flipped signature byte", () => {
            const cookie = mintCookie({ ...SAMPLE })
            const [payload, sig] = cookie.split(".")
            const flipped = sig.slice(0, -1) + (sig.slice(-1) === "A" ? "B" : "A")
            expect(verifyCookie(`${payload}.${flipped}`)).toBeNull()
        })

        it("rejects malformed cookies", () => {
            expect(verifyCookie("")).toBeNull()
            expect(verifyCookie("nodot")).toBeNull()
            expect(verifyCookie("a.b.c")).toBeNull()
        })

        it("rejects cookies with tampered payload", () => {
            const cookie = mintCookie({ ...SAMPLE })
            const [, sig] = cookie.split(".")
            // base64url for {"orcid":"...evil...","version":1}
            const evilPayload = Buffer.from(
                JSON.stringify({
                    orcid: "0000-0002-2345-6789",
                    ojs_user_id: null,
                    email_hash: null,
                    iat: Math.floor(Date.now() / 1000),
                    exp_sliding: Math.floor(Date.now() / 1000) + 1800,
                    exp_absolute: Math.floor(Date.now() / 1000) + 28800,
                    version: 1,
                })
            )
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "")
            expect(verifyCookie(`${evilPayload}.${sig}`)).toBeNull()
        })
    })

    describe("expiry", () => {
        it("rejects when absolute expiry passed", () => {
            const iat = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const result = verifyCookie(cookie, iat + ABSOLUTE_TTL_SECONDS + SKEW_TOLERANCE_SECONDS + 1)
            expect(result).toBeNull()
        })

        it("accepts within ±2 min skew on the boundary", () => {
            // Use a token whose sliding == absolute so we can isolate the
            // absolute boundary skew test. Done by minting an "almost-absolute"
            // payload via verifyCookie's path (mint at iat, then check at
            // exactly the sliding boundary + slack - 1 — both gates use the
            // same SKEW_TOLERANCE so both should accept).
            const iat = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const result = verifyCookie(
                cookie,
                iat + SLIDING_TTL_SECONDS + SKEW_TOLERANCE_SECONDS - 1
            )
            expect(result).not.toBeNull()
        })

        it("rejects when sliding expiry passed", () => {
            const iat = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const result = verifyCookie(cookie, iat + SLIDING_TTL_SECONDS + SKEW_TOLERANCE_SECONDS + 1)
            expect(result).toBeNull()
        })

        it("flags refreshNeeded inside the sliding refresh window", () => {
            const iat = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            // now is 1 sec past the refresh window boundary -> needs refresh
            const inWindow = iat + SLIDING_TTL_SECONDS - SLIDING_REFRESH_WINDOW_SECONDS + 1
            const result = verifyCookie(cookie, inWindow)
            expect(result?.refreshNeeded).toBe(true)
        })

        it("does NOT flag refreshNeeded outside the window", () => {
            const iat = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const outsideWindow = iat + 60
            const result = verifyCookie(cookie, outsideWindow)
            expect(result?.refreshNeeded).toBe(false)
        })
    })

    describe("refreshSliding", () => {
        it("advances exp_sliding to now + TTL but does not exceed exp_absolute", () => {
            const iat = 1_700_000_000
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const result = verifyCookie(cookie, iat + 60)!
            const { newPayload } = refreshSliding(result.payload, iat + 60)
            expect(newPayload.exp_sliding).toBe(iat + 60 + SLIDING_TTL_SECONDS)
            expect(newPayload.exp_absolute).toBe(iat + ABSOLUTE_TTL_SECONDS)

            // Edge: very close to absolute expiry, sliding clamps to absolute.
            const near = iat + ABSOLUTE_TTL_SECONDS - 60
            const r2 = refreshSliding(result.payload, near)
            expect(r2.newPayload.exp_sliding).toBe(iat + ABSOLUTE_TTL_SECONDS)
        })
    })

    describe("getIdentity from cookie header", () => {
        it("parses the cookie from a Request", async () => {
            const cookie = mintCookie({ ...SAMPLE })
            const req = new Request("https://digitopub.com/x", {
                headers: { cookie: `${IDENTITY_COOKIE_NAME}=${encodeURIComponent(cookie)}; theme=dark` },
            })
            const id = await getIdentity(req)
            expect(id).not.toBeNull()
            expect(id!.orcid).toBe(SAMPLE.orcid)
        })

        it("returns null when no cookie header", async () => {
            const req = new Request("https://digitopub.com/x")
            expect(await getIdentity(req)).toBeNull()
        })

        it("returns null for unrelated cookies", async () => {
            const req = new Request("https://digitopub.com/x", {
                headers: { cookie: "theme=dark" },
            })
            expect(await getIdentity(req)).toBeNull()
        })
    })

    describe("revocation lookup", () => {
        it("returns null when cookie iat is below cookie_iat_min for ORCID", async () => {
            // Use a fresh iat so the cookie is not expired under Date.now().
            const iat = Math.floor(Date.now() / 1000)
            vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue({
                orcid: SAMPLE.orcid,
                revoked_at: new Date(),
                cookie_iat_min: iat + 100,
            } as never)
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const req = new Request("https://digitopub.com/x", {
                headers: { cookie: `${IDENTITY_COOKIE_NAME}=${encodeURIComponent(cookie)}` },
            })
            expect(await getIdentity(req)).toBeNull()
        })

        it("accepts when iat is above cookie_iat_min", async () => {
            const iat = Math.floor(Date.now() / 1000)
            vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue({
                orcid: SAMPLE.orcid,
                revoked_at: new Date(),
                cookie_iat_min: iat - 100,
            } as never)
            const cookie = mintCookie({ ...SAMPLE, now: iat })
            const req = new Request("https://digitopub.com/x", {
                headers: { cookie: `${IDENTITY_COOKIE_NAME}=${encodeURIComponent(cookie)}` },
            })
            const id = await getIdentity(req)
            expect(id).not.toBeNull()
        })
    })

    describe("cookie header helpers", () => {
        it("buildSetCookieHeader produces httpOnly Secure SameSite=Lax", () => {
            const header = buildSetCookieHeader("abc", 3600)
            expect(header).toContain("HttpOnly")
            expect(header).toContain("Secure")
            expect(header).toContain("SameSite=Lax")
            expect(header).toContain("Max-Age=3600")
            expect(header).toContain("Path=/")
            // No Domain attribute (host-only per O-5)
            expect(header.toLowerCase()).not.toContain("domain=")
        })

        it("buildClearCookieHeader sets Max-Age=0", () => {
            const header = buildClearCookieHeader()
            expect(header).toContain("Max-Age=0")
        })

        it("refreshedCookieMaxAge returns seconds until exp_absolute", () => {
            const now = 1_700_000_000
            const payload = {
                orcid: SAMPLE.orcid,
                ojs_user_id: null,
                email_hash: null,
                iat: now,
                exp_sliding: now + 1800,
                exp_absolute: now + 7200,
                version: 1 as const,
            }
            expect(refreshedCookieMaxAge(payload, now)).toBe(7200)
            expect(refreshedCookieMaxAge(payload, now + 7300)).toBe(0)
        })
    })
})
