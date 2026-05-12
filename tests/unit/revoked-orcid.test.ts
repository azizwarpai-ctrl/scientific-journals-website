/**
 * US3-specific: revoked_orcids lookup blocks pre-revocation cookies.
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
    getIdentity,
    isRevoked,
    invalidateRevocationCache,
    __resetRevocationCacheForTests,
    IDENTITY_COOKIE_NAME,
} from "@/src/lib/identity-cookie"
import { prisma } from "@/src/lib/db/config"

const ORCID = "0000-0001-2345-6789"

describe("revoked_orcids (US3)", () => {
    beforeEach(() => {
        __resetRevocationCacheForTests()
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue(null)
    })

    it("isRevoked returns false when no row in revoked_orcids", async () => {
        const iat = Math.floor(Date.now() / 1000)
        expect(await isRevoked(ORCID, iat)).toBe(false)
    })

    it("isRevoked returns true when iat < cookie_iat_min", async () => {
        const iat = Math.floor(Date.now() / 1000)
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue({
            orcid: ORCID,
            revoked_at: new Date(),
            cookie_iat_min: iat + 100,
        } as never)
        expect(await isRevoked(ORCID, iat)).toBe(true)
    })

    it("isRevoked returns false when iat >= cookie_iat_min (fresh cookie after revoke)", async () => {
        const cookieIatMin = Math.floor(Date.now() / 1000)
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue({
            orcid: ORCID,
            revoked_at: new Date(),
            cookie_iat_min: cookieIatMin,
        } as never)
        expect(await isRevoked(ORCID, cookieIatMin + 1)).toBe(false)
    })

    it("invalidateRevocationCache forces re-read", async () => {
        const iat = Math.floor(Date.now() / 1000)
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue({
            orcid: ORCID,
            revoked_at: new Date(),
            cookie_iat_min: iat + 100,
        } as never)
        expect(await isRevoked(ORCID, iat)).toBe(true)
        // Change the mock; cache still returns true until invalidated.
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue(null as never)
        expect(await isRevoked(ORCID, iat)).toBe(true) // cached
        invalidateRevocationCache(ORCID)
        expect(await isRevoked(ORCID, iat)).toBe(false) // refetched
    })

    it("getIdentity returns null when cookie is revoked", async () => {
        const iat = Math.floor(Date.now() / 1000)
        vi.mocked(prisma.revokedOrcid.findUnique).mockResolvedValue({
            orcid: ORCID,
            revoked_at: new Date(),
            cookie_iat_min: iat + 100,
        } as never)
        const cookie = mintCookie({
            orcid: ORCID,
            ojs_user_id: null,
            email_hash: null,
            now: iat,
        })
        const req = new Request("https://digitopub.com/x", {
            headers: { cookie: `${IDENTITY_COOKIE_NAME}=${encodeURIComponent(cookie)}` },
        })
        expect(await getIdentity(req)).toBeNull()
    })
})
