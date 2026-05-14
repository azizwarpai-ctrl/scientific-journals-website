import { describe, it, expect, beforeEach, vi } from "vitest"

const hoisted = vi.hoisted(() => ({
    ojsQuery: vi.fn(),
    isOjsConfigured: vi.fn(),
}))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
    ojsQuery: hoisted.ojsQuery,
    isOjsConfigured: hoisted.isOjsConfigured,
}))

process.env.IDENTITY_COOKIE_SECRET ||= "test-secret"
process.env.ORCID_STATE_SECRET ||= "test-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-secret"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-secret"

import {
    isGalleyOpenAccess,
    __resetPdfAccessCacheForTests,
} from "@/src/lib/pdf-access"

describe("pdf-access.isGalleyOpenAccess", () => {
    beforeEach(() => {
        __resetPdfAccessCacheForTests()
        hoisted.ojsQuery.mockReset()
        hoisted.isOjsConfigured.mockReset()
        hoisted.isOjsConfigured.mockReturnValue(true)
    })

    it("returns true for OA issue (access_status=1)", async () => {
        hoisted.ojsQuery.mockResolvedValueOnce([{ access_status: 1 }])
        const isOpen = await isGalleyOpenAccess("100", "200")
        expect(isOpen).toBe(true)
    })

    it("returns false for subscription issue (access_status=2)", async () => {
        hoisted.ojsQuery.mockResolvedValueOnce([{ access_status: 2 }])
        const isOpen = await isGalleyOpenAccess("100", "200")
        expect(isOpen).toBe(false)
    })

    it("returns false when access_status is null (untracked issue)", async () => {
        hoisted.ojsQuery.mockResolvedValueOnce([{ access_status: null }])
        const isOpen = await isGalleyOpenAccess("100", "200")
        expect(isOpen).toBe(false)
    })

    it("caches the result for 5 min", async () => {
        hoisted.ojsQuery.mockResolvedValueOnce([{ access_status: 1 }])
        await isGalleyOpenAccess("100", "200")
        await isGalleyOpenAccess("100", "200")
        await isGalleyOpenAccess("100", "200")
        expect(hoisted.ojsQuery).toHaveBeenCalledOnce()
    })

    it("treats OJS lookup errors as gated", async () => {
        hoisted.ojsQuery.mockRejectedValueOnce(new Error("DB down"))
        const isOpen = await isGalleyOpenAccess("100", "200")
        expect(isOpen).toBe(false)
    })

    it("treats unconfigured OJS as gated", async () => {
        hoisted.isOjsConfigured.mockReturnValue(false)
        const isOpen = await isGalleyOpenAccess("100", "200")
        expect(isOpen).toBe(false)
        expect(hoisted.ojsQuery).not.toHaveBeenCalled()
    })
})
