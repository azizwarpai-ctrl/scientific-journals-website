import { describe, it, expect, beforeEach, vi } from "vitest"

// Vitest hoists vi.mock calls to the top of the file, so factory bodies
// CAN'T close over module-scope locals. Use vi.hoisted to hoist them too.
const hoisted = vi.hoisted(() => {
    class FakePrismaKnownError extends Error {
        code: string
        clientVersion = "test"
        meta: Record<string, unknown> = {}
        constructor(message: string, code: string) {
            super(message)
            this.code = code
            this.name = "PrismaClientKnownRequestError"
        }
    }
    return {
        userEventCreate: vi.fn(),
        userEventFindFirst: vi.fn(),
        FakePrismaKnownError,
    }
})
const { userEventCreate, userEventFindFirst, FakePrismaKnownError } = hoisted

vi.mock("@/src/lib/db/config", () => ({
    prisma: {
        userEvent: {
            create: hoisted.userEventCreate,
            findFirst: hoisted.userEventFindFirst,
        },
    },
}))

vi.mock("@prisma/client", () => ({
    Prisma: {
        JsonNull: null,
        PrismaClientKnownRequestError: hoisted.FakePrismaKnownError,
    },
}))

process.env.EVENT_IP_HASH_SALT_SEED ||= "test-event-ip-hash-salt-seed"
process.env.IDENTITY_COOKIE_SECRET ||= "test-identity-cookie-secret"
process.env.ORCID_STATE_SECRET ||= "test-orcid-state-secret"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-client-secret"

import { recordEvent } from "@/src/lib/event-recorder"
import type { ConsentPayload } from "@/src/lib/consent"

const CONSENT_ALL: ConsentPayload = {
    choice: "all",
    granular: null,
    dismiss_count: 0,
    first_dismiss_at: null,
    decided_at: 1,
    version: 1,
}

const CONSENT_ESS: ConsentPayload = {
    choice: "essential_only",
    granular: null,
    dismiss_count: 0,
    first_dismiss_at: null,
    decided_at: 1,
    version: 1,
}

const BASE = {
    orcid: "0000-0001-2345-6789",
    ip: "1.2.3.4",
    ua: "Mozilla/5.0",
    ipHash: "a".repeat(64),
    uaHash: "b".repeat(64),
    articleId: 100n,
    journalId: 7n,
    consent: CONSENT_ALL,
    now: new Date("2026-05-12T10:00:00Z"),
}

describe("event-recorder", () => {
    beforeEach(() => {
        userEventCreate.mockReset()
        userEventFindFirst.mockReset()
        userEventCreate.mockResolvedValue({ id: 1n })
    })

    describe("view", () => {
        it("writes a row with view_day set", async () => {
            const res = await recordEvent({ ...BASE, eventType: "view", source: "article_page" })
            expect(res).toEqual({ recorded: true, deduped: false })
            expect(userEventCreate).toHaveBeenCalledOnce()
            const call = userEventCreate.mock.calls[0][0].data
            expect(call.event_type).toBe("view")
            expect(call.view_day).toBe("2026-05-12")
            expect(call.orcid).toBe(BASE.orcid)
            expect(call.ip_hash).toBe(BASE.ipHash)
            expect(call.ua_hash).toBe(BASE.uaHash)
        })

        it("catches UNIQUE violation as deduped", async () => {
            userEventCreate.mockRejectedValueOnce(
                new FakePrismaKnownError("dupe", "P2002")
            )
            const res = await recordEvent({ ...BASE, eventType: "view", source: "article_page" })
            expect(res).toEqual({ recorded: true, deduped: true })
        })
    })

    describe("download", () => {
        it("writes a fresh download row", async () => {
            userEventFindFirst.mockResolvedValueOnce(null)
            const res = await recordEvent({
                ...BASE,
                eventType: "download",
                galleyId: 42n,
                source: "pdf_view",
            })
            expect(res).toEqual({ recorded: true, deduped: false })
            const call = userEventCreate.mock.calls[0][0].data
            expect(call.galley_id).toBe(42n)
            expect(call.event_type).toBe("download")
            expect(call.view_day).toBeNull()
        })

        it("deduplicates when an existing row within 30 s is found", async () => {
            userEventFindFirst.mockResolvedValueOnce({ id: 5n })
            const res = await recordEvent({
                ...BASE,
                eventType: "download",
                galleyId: 42n,
                source: "pdf_view",
            })
            expect(res).toEqual({ recorded: true, deduped: true })
            expect(userEventCreate).not.toHaveBeenCalled()
        })

        it("rejects when galleyId missing", async () => {
            const res = await recordEvent({
                ...BASE,
                eventType: "download",
                source: "pdf_view",
            })
            expect(res).toEqual({ recorded: false, deduped: false })
        })
    })

    describe("citation", () => {
        it("never deduplicates", async () => {
            await recordEvent({
                ...BASE,
                eventType: "citation_export",
                source: "copy",
                citationFormat: "vancouver",
            })
            await recordEvent({
                ...BASE,
                eventType: "citation_export",
                source: "copy",
                citationFormat: "vancouver",
            })
            expect(userEventCreate).toHaveBeenCalledTimes(2)
            const data = userEventCreate.mock.calls[0][0].data
            expect(data.citation_format).toBe("vancouver")
        })
    })

    describe("consent rules", () => {
        it("essential_only strips ip/ua hashes but keeps orcid", async () => {
            await recordEvent({
                ...BASE,
                eventType: "view",
                source: "article_page",
                consent: CONSENT_ESS,
            })
            const data = userEventCreate.mock.calls[0][0].data
            expect(data.ip_hash).toBeNull()
            expect(data.ua_hash).toBeNull()
            expect(data.orcid).toBe(BASE.orcid)
            expect(data.source).toBe("article_page") // recorder preserves caller's source for view types
        })

        it("pre_consent strips orcid and hashes; source becomes pre_consent", async () => {
            await recordEvent({
                ...BASE,
                eventType: "view",
                source: "article_page",
                consent: null,
            })
            const data = userEventCreate.mock.calls[0][0].data
            expect(data.orcid).toBeNull()
            expect(data.ip_hash).toBeNull()
            expect(data.ua_hash).toBeNull()
            expect(data.source).toBe("pre_consent")
        })

        it("essential_only on a non-view source becomes 'essential_only'", async () => {
            await recordEvent({
                ...BASE,
                eventType: "citation_export",
                source: "copy",
                citationFormat: "vancouver",
                consent: CONSENT_ESS,
            })
            const data = userEventCreate.mock.calls[0][0].data
            expect(data.source).toBe("essential_only")
        })
    })

    describe("anonymous (no orcid, ip-hash only)", () => {
        it("uses ip_hash for dedup_key", async () => {
            await recordEvent({
                ...BASE,
                eventType: "view",
                source: "article_page",
                orcid: null,
            })
            const data = userEventCreate.mock.calls[0][0].data
            expect(data.orcid).toBeNull()
            expect(data.dedup_key).toMatch(/^[0-9a-f]{64}$/)
        })
    })
})
