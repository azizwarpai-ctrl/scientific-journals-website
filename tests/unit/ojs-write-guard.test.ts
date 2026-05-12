import { describe, it, expect, beforeEach, vi } from "vitest"

const hoisted = vi.hoisted(() => ({
    auditCreate: vi.fn(),
    auditUpdate: vi.fn(),
    ojsRelease: vi.fn(),
    ojsQueryFn: vi.fn(),
    getOjsConnectionFn: vi.fn(),
}))
const { auditCreate, auditUpdate, ojsRelease, ojsQueryFn, getOjsConnectionFn } = hoisted

vi.mock("@/src/lib/db/config", () => ({
    prisma: {
        auditOjsWrite: {
            create: hoisted.auditCreate,
            update: hoisted.auditUpdate,
        },
    },
}))

vi.mock("@/src/features/ojs/server/ojs-client", () => ({
    getOjsConnection: hoisted.getOjsConnectionFn,
}))

process.env.ENABLE_ORCID_OJS_BACKFILL = "true"
process.env.IDENTITY_COOKIE_SECRET ||= "test-identity-cookie-secret"
process.env.ORCID_STATE_SECRET ||= "test-orcid-state-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-event-ip-hash-salt-seed"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-client-secret"

import {
    writeOrcidToOjsWithAudit,
    isBackfillEnabled,
} from "@/src/lib/ojs-write-guard"
import { __resetEnvCacheForTests } from "@/src/lib/env"

describe("ojs-write-guard", () => {
    beforeEach(() => {
        process.env.ENABLE_ORCID_OJS_BACKFILL = "true"
        __resetEnvCacheForTests()
        auditCreate.mockReset()
        auditUpdate.mockReset()
        ojsRelease.mockReset()
        ojsQueryFn.mockReset()
        getOjsConnectionFn.mockReset()

        auditCreate.mockResolvedValue({ id: 100n })
        getOjsConnectionFn.mockResolvedValue({
            query: ojsQueryFn,
            release: ojsRelease,
        })
    })

    it("isBackfillEnabled honors env", () => {
        expect(isBackfillEnabled()).toBe(true)
    })

    it("performs audit-then-write happy path", async () => {
        ojsQueryFn
            .mockResolvedValueOnce([[], undefined]) // pre-check: no existing row
            .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // insert
        const result = await writeOrcidToOjsWithAudit({
            orcid: "0000-0001-2345-6789",
            ojsUserId: 42,
            requestId: "req-1",
        })
        expect(result.success).toBe(true)
        expect(result.attempted).toBe(true)
        // Audit row was planned first then resolved.
        expect(auditCreate).toHaveBeenCalledOnce()
        expect(auditUpdate).toHaveBeenCalledOnce()
        const update = auditUpdate.mock.calls[0][0]
        expect(update.data.success).toBe(true)
    })

    it("skips OJS write when row already exists, audit marked success+row_exists_skipped", async () => {
        ojsQueryFn.mockResolvedValueOnce([[{ user_id: 42 }], undefined])
        const result = await writeOrcidToOjsWithAudit({
            orcid: "0000-0001-2345-6789",
            ojsUserId: 42,
        })
        expect(result.success).toBe(true)
        expect(result.attempted).toBe(false)
        const update = auditUpdate.mock.calls[0][0]
        expect(update.data.success).toBe(true)
        expect(update.data.error).toBe("row_exists_skipped")
    })

    it("on OJS failure, audit marked success=false; function returns success=false", async () => {
        ojsQueryFn
            .mockResolvedValueOnce([[], undefined])
            .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        const result = await writeOrcidToOjsWithAudit({
            orcid: "0000-0001-2345-6789",
            ojsUserId: 42,
        })
        expect(result.success).toBe(false)
        expect(result.attempted).toBe(true)
        const update = auditUpdate.mock.calls[0][0]
        expect(update.data.success).toBe(false)
        expect(update.data.error).toContain("ECONNREFUSED")
    })

    it("returns attempted=false when flag is OFF", async () => {
        process.env.ENABLE_ORCID_OJS_BACKFILL = "false"
        __resetEnvCacheForTests()
        const result = await writeOrcidToOjsWithAudit({
            orcid: "0000-0001-2345-6789",
            ojsUserId: 42,
        })
        expect(result.success).toBe(false)
        expect(result.attempted).toBe(false)
        expect(auditCreate).not.toHaveBeenCalled()
        expect(getOjsConnectionFn).not.toHaveBeenCalled()
    })

    it("always releases the OJS connection", async () => {
        ojsQueryFn
            .mockResolvedValueOnce([[], undefined])
            .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
        await writeOrcidToOjsWithAudit({ orcid: "0000-0001-2345-6789", ojsUserId: 1 })
        expect(ojsRelease).toHaveBeenCalledOnce()
    })
})
