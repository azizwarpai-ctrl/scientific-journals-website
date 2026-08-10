/**
 * Hotfix A3 — graceful degradation of the ORCID OAuth router when the
 * ORCID/identity secrets are absent (as observed in production), plus the
 * redirect-based error surface for user-facing callback failures.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

// Same fully-synthetic mock strategy as auth-orcid.test.ts — avoid pulling
// real modules that transitively load the OJS client.
const hoisted = vi.hoisted(() => {
    class BlockedAccountError extends Error {
        constructor() {
            super("ACCOUNT_DISABLED")
            this.name = "BlockedAccountError"
        }
    }
    return {
        exchangeCode: vi.fn(),
        verifyOrcidToken: vi.fn(),
        linkOjsUser: vi.fn(),
        buildAuthorizeUrl: vi.fn(
            (state: string) =>
                `https://orcid.org/oauth/authorize?response_type=code&state=${state}`
        ),
        BlockedAccountError,
    }
})

vi.mock("@/src/lib/orcid-oauth", () => ({
    exchangeCode: hoisted.exchangeCode,
    verifyOrcidToken: hoisted.verifyOrcidToken,
    buildAuthorizeUrl: hoisted.buildAuthorizeUrl,
}))

vi.mock("@/src/server/routes/auth-orcid-helpers", () => ({
    linkOjsUser: hoisted.linkOjsUser,
    BlockedAccountError: hoisted.BlockedAccountError,
    emailHash: vi.fn(() => null),
}))

process.env.IDENTITY_COOKIE_SECRET ||= "test-identity-cookie-secret"
process.env.ORCID_STATE_SECRET ||= "test-orcid-state-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-event-ip-hash-salt-seed"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-client-secret"
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000"

import { authOrcidRouter } from "@/src/server/routes/auth-orcid"

const app = new (await import("hono")).Hono().route("/", authOrcidRouter)

async function fetchApp(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(`http://test${path}`, init)
}

const ORCID_VARS = [
    "ORCID_CLIENT_ID",
    "ORCID_CLIENT_SECRET",
    "ORCID_STATE_SECRET",
    "IDENTITY_COOKIE_SECRET",
] as const

const saved: Record<string, string | undefined> = {}

function unconfigure() {
    for (const v of ORCID_VARS) {
        saved[v] = process.env[v]
        delete process.env[v]
    }
}

function reconfigure() {
    for (const v of ORCID_VARS) {
        if (saved[v] !== undefined) process.env[v] = saved[v]
    }
}

describe("/api/auth/orcid — degradation when unconfigured", () => {
    beforeEach(() => {
        unconfigure()
    })
    afterEach(() => {
        reconfigure()
    })

    it("GET /start redirects to /?signin=unavailable instead of 500", async () => {
        const res = await fetchApp("/start?return_url=/account/stats")
        expect(res.status).toBe(302)
        expect(res.headers.get("Location")).toBe("/?signin=unavailable")
    })

    it("GET /callback redirects to /?signin=unavailable instead of 500", async () => {
        const res = await fetchApp("/callback?code=abc&state=whatever")
        expect(res.status).toBe(302)
        expect(res.headers.get("Location")).toBe("/?signin=unavailable")
    })

    it("GET /whoami reports orcid_available:false without throwing", async () => {
        const res = await fetchApp("/whoami")
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.authenticated).toBe(false)
        expect(body.orcid_available).toBe(false)
    })
})

describe("/api/auth/orcid — configured error paths redirect with auth_error", () => {
    it("GET /callback without code/state redirects with INVALID_REQUEST", async () => {
        const res = await fetchApp("/callback")
        expect(res.status).toBe(302)
        expect(res.headers.get("Location")).toBe("/?auth_error=INVALID_REQUEST")
    })

    it("GET /callback with garbage state redirects with INVALID_STATE", async () => {
        const res = await fetchApp("/callback?code=abc&state=garbage")
        expect(res.status).toBe(302)
        expect(res.headers.get("Location")).toBe("/?auth_error=INVALID_STATE")
        // State-clearing cookie preserved on the redirect.
        expect(res.headers.get("Set-Cookie") || "").toContain("=;")
    })

    it("GET /whoami reports orcid_available:true", async () => {
        const res = await fetchApp("/whoami")
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.authenticated).toBe(false)
        expect(body.orcid_available).toBe(true)
    })
})
