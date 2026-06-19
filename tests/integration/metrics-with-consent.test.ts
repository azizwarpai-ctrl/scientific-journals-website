/**
 * US5 — Verifies that consent state in `digitopub_consent` propagates
 * through the metric route into recordEvent and is reflected in the
 * row's orcid / ip_hash / ua_hash / source columns.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const hoisted = vi.hoisted(() => {
    class FakePrismaKnownError extends Error {
        code: string
        constructor(m: string, c: string) {
            super(m)
            this.code = c
        }
    }
    return {
        userEventCreate: vi.fn(),
        userEventFindFirst: vi.fn(),
        revokedFindUnique: vi.fn(async () => null),
        FakePrismaKnownError,
    }
})

vi.mock("@/src/lib/db/config", () => ({
    prisma: {
        userEvent: {
            create: hoisted.userEventCreate,
            findFirst: hoisted.userEventFindFirst,
        },
        revokedOrcid: {
            findUnique: hoisted.revokedFindUnique,
        },
    },
}))

vi.mock("@prisma/client", () => ({
    Prisma: {
        JsonNull: null,
        PrismaClientKnownRequestError: hoisted.FakePrismaKnownError,
    },
}))

process.env.IDENTITY_COOKIE_SECRET ||= "test-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-secret"

import { Hono } from "hono"
import { metricsEventsRouter } from "@/src/server/routes/metrics-events"
import { buildSetConsentCookieHeader, CONSENT_COOKIE_NAME } from "@/src/lib/consent"

const app = new Hono().route("/", metricsEventsRouter)

function extractConsentCookieValue(setCookie: string): string {
    const m = setCookie.match(new RegExp(`^${CONSENT_COOKIE_NAME}=([^;]+)`))
    return m ? m[1] : ""
}

async function postWithCookie(body: unknown, cookie: string) {
    return app.request("http://test/view", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "1.2.3.4",
            "user-agent": "TestUA/1.0",
            cookie,
        },
        body: JSON.stringify(body),
    })
}

describe("metric writes honor consent state (US5)", () => {
    beforeEach(() => {
        hoisted.userEventCreate.mockReset()
        hoisted.userEventFindFirst.mockReset()
        hoisted.userEventCreate.mockResolvedValue({ id: 1n })
    })

    it("choice=all → ip_hash + ua_hash present", async () => {
        const setCookie = buildSetConsentCookieHeader({ choice: "all" })
        const value = extractConsentCookieValue(setCookie)
        const res = await postWithCookie(
            { article_id: "100", journal_id: "7", source: "article_page" },
            `${CONSENT_COOKIE_NAME}=${value}`
        )
        expect(res.status).toBe(200)
        const data = hoisted.userEventCreate.mock.calls[0][0].data
        expect(data.ip_hash).toMatch(/^[0-9a-f]{64}$/)
        expect(data.ua_hash).toMatch(/^[0-9a-f]{64}$/)
        expect(data.source).toBe("article_page")
    })

    it("choice=essential_only → no ip/ua hashes; orcid preserved (none here)", async () => {
        const setCookie = buildSetConsentCookieHeader({ choice: "essential_only" })
        const value = extractConsentCookieValue(setCookie)
        const res = await postWithCookie(
            { article_id: "100", journal_id: "7", source: "article_page" },
            `${CONSENT_COOKIE_NAME}=${value}`
        )
        expect(res.status).toBe(200)
        const data = hoisted.userEventCreate.mock.calls[0][0].data
        expect(data.ip_hash).toBeNull()
        expect(data.ua_hash).toBeNull()
        // view sources are preserved verbatim under essential_only.
        expect(data.source).toBe("article_page")
    })

    it("no cookie → pre_consent: orcid + hashes all NULL, source='pre_consent'", async () => {
        const res = await postWithCookie(
            { article_id: "100", journal_id: "7", source: "article_page" },
            ""
        )
        expect(res.status).toBe(200)
        const data = hoisted.userEventCreate.mock.calls[0][0].data
        expect(data.orcid).toBeNull()
        expect(data.ip_hash).toBeNull()
        expect(data.ua_hash).toBeNull()
        expect(data.source).toBe("pre_consent")
    })

    it("essential_only on citation export becomes source='essential_only'", async () => {
        const setCookie = buildSetConsentCookieHeader({ choice: "essential_only" })
        const value = extractConsentCookieValue(setCookie)
        const res = await app.request("http://test/citation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "user-agent": "TestUA/1.0",
                "x-forwarded-for": "9.9.9.9",
                cookie: `${CONSENT_COOKIE_NAME}=${value}`,
            },
            body: JSON.stringify({
                article_id: "100",
                journal_id: "7",
                format: "vancouver",
                action: "copy",
            }),
        })
        expect(res.status).toBe(200)
        const data = hoisted.userEventCreate.mock.calls[0][0].data
        expect(data.source).toBe("essential_only")
        expect(data.citation_format).toBe("vancouver")
    })
})
