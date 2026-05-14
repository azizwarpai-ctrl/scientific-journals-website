import { describe, it, expect, beforeEach, vi } from "vitest"

// Fully synthetic mocks — no vi.importActual — so this file does not pull
// real modules (which transitively load @/src/features/ojs/server/ojs-client
// and pollute the journals-self-heal test that runs after).
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
        buildAuthorizeUrl: vi.fn((state: string) =>
            `https://orcid.org/oauth/authorize?response_type=code&client_id=test-client&scope=%2Fauthenticate&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Forcid%2Fcallback&state=${state}`
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
import {
    mintState,
    STATE_COOKIE_NAME,
    __resetConsumedNoncesForTests,
} from "@/src/lib/orcid-state"
import { IDENTITY_COOKIE_NAME } from "@/src/lib/identity-cookie"
import { BlockedAccountError } from "@/src/server/routes/auth-orcid-helpers"

const app = new (await import("hono")).Hono().route("/", authOrcidRouter)

async function fetchApp(path: string, init: RequestInit = {}): Promise<Response> {
    return app.request(`http://test${path}`, init)
}

describe("/api/auth/orcid", () => {
    beforeEach(() => {
        __resetConsumedNoncesForTests()
        hoisted.exchangeCode.mockReset()
        hoisted.verifyOrcidToken.mockReset()
        hoisted.linkOjsUser.mockReset()
        hoisted.linkOjsUser.mockResolvedValue({
            ojs_user_id: 42,
            linkSource: "orcid_match",
            ojsBackfilled: false,
        })
    })

    describe("GET /start", () => {
        it("redirects to ORCID with state cookie set", async () => {
            const res = await fetchApp("/start?return_url=/journals/1/articles/100")
            expect(res.status).toBe(302)
            const location = res.headers.get("Location")
            expect(location).toContain("orcid.org/oauth/authorize")
            expect(location).toContain("response_type=code")
            expect(location).toContain("scope=%2Fauthenticate")
            const setCookie = res.headers.get("Set-Cookie") || ""
            expect(setCookie).toContain(`${STATE_COOKIE_NAME}=`)
            expect(setCookie).toContain("Path=/api/auth/orcid")
            expect(setCookie).toContain("HttpOnly")
        })

        it("normalizes external return_url to /", async () => {
            const res = await fetchApp("/start?return_url=//evil.com")
            const location = res.headers.get("Location")!
            const stateParam = new URL(location).searchParams.get("state")!
            const payload = JSON.parse(
                Buffer.from(
                    stateParam.split(".")[0].replace(/-/g, "+").replace(/_/g, "/") +
                        "=".repeat((4 - (stateParam.split(".")[0].length % 4)) % 4),
                    "base64"
                ).toString("utf8")
            )
            expect(payload.return_url).toBe("/")
        })
    })

    describe("GET /callback", () => {
        const validReturn = "/journals/1/articles/100"

        it("rejects when state is missing", async () => {
            const res = await fetchApp("/callback?code=abc")
            expect(res.status).toBe(400)
        })

        it("rejects when state is invalid", async () => {
            const res = await fetchApp("/callback?code=abc&state=garbage")
            expect(res.status).toBe(400)
            const body = await res.json()
            expect(body.error).toBe("INVALID_STATE")
        })

        it("happy path: exchanges code, mints identity cookie, redirects to return_url", async () => {
            const { token } = mintState({ return_url: validReturn })
            hoisted.exchangeCode.mockResolvedValueOnce({
                access_token: "a",
                token_type: "bearer",
                expires_in: 600,
                orcid: "0000-0001-2345-6789",
                name: "Maria",
            })
            const res = await fetchApp(`/callback?code=abc&state=${encodeURIComponent(token)}`)
            expect(res.status).toBe(302)
            expect(res.headers.get("Location")).toBe(validReturn)
            const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("Set-Cookie") || ""]
            const cookieList = Array.isArray(cookies) ? cookies : [cookies]
            const idCookie = cookieList.find((c) => c.startsWith(`${IDENTITY_COOKIE_NAME}=`))
            expect(idCookie).toBeDefined()
            expect(idCookie).toContain("HttpOnly")
            expect(idCookie).toContain("Secure")
        })

        it("treats a reused state as 400 STATE_REUSED", async () => {
            const { token } = mintState({ return_url: validReturn })
            hoisted.exchangeCode.mockResolvedValue({
                access_token: "a",
                token_type: "bearer",
                expires_in: 600,
                orcid: "0000-0001-2345-6789",
            })
            await fetchApp(`/callback?code=abc&state=${encodeURIComponent(token)}`)
            const res2 = await fetchApp(`/callback?code=abc&state=${encodeURIComponent(token)}`)
            expect(res2.status).toBe(400)
            const body = await res2.json()
            expect(body.error).toBe("STATE_REUSED")
        })

        it("returns 502 when exchangeCode throws", async () => {
            const { token } = mintState({ return_url: validReturn })
            hoisted.exchangeCode.mockRejectedValueOnce(new Error("ORCID down"))
            const res = await fetchApp(`/callback?code=abc&state=${encodeURIComponent(token)}`)
            expect(res.status).toBe(502)
            const body = await res.json()
            expect(body.error).toBe("ORCID_API_FAILURE")
        })

        it("returns 403 when linkOjsUser raises BlockedAccountError", async () => {
            const { token } = mintState({ return_url: validReturn })
            hoisted.exchangeCode.mockResolvedValueOnce({
                access_token: "a",
                token_type: "bearer",
                expires_in: 600,
                orcid: "0000-0001-2345-6789",
            })
            hoisted.linkOjsUser.mockRejectedValueOnce(new BlockedAccountError())
            const res = await fetchApp(`/callback?code=abc&state=${encodeURIComponent(token)}`)
            expect(res.status).toBe(403)
            const body = await res.json()
            expect(body.error).toBe("ACCOUNT_DISABLED")
        })
    })

    describe("GET /whoami", () => {
        it("returns authenticated:false when no cookie", async () => {
            const res = await fetchApp("/whoami")
            expect(res.status).toBe(200)
            const body = await res.json()
            expect(body.authenticated).toBe(false)
        })
    })

    describe("POST /logout", () => {
        it("clears identity + state cookies", async () => {
            const res = await fetchApp("/logout", { method: "POST" })
            expect(res.status).toBe(200)
            const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("Set-Cookie") || ""]
            const cookieList = Array.isArray(cookies) ? cookies : [cookies]
            expect(cookieList.some((c) => c.includes(`${IDENTITY_COOKIE_NAME}=;`))).toBe(true)
            expect(cookieList.some((c) => c.includes(`${STATE_COOKIE_NAME}=;`))).toBe(true)
        })
    })
})
