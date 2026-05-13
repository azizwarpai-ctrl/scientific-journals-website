import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"

process.env.ORCID_CLIENT_ID ||= "test-client"
process.env.ORCID_CLIENT_SECRET ||= "test-secret"
process.env.IDENTITY_COOKIE_SECRET ||= "test-secret"
process.env.ORCID_STATE_SECRET ||= "test-secret"
process.env.EVENT_IP_HASH_SALT_SEED ||= "test-secret"
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000"

import {
    buildAuthorizeUrl,
    exchangeCode,
    verifyOrcidToken,
    ORCID_AUTHORIZE_URL,
    ORCID_TOKEN_URL,
    __overrideJwksForTests,
} from "@/src/lib/orcid-oauth"
import { __resetEnvCacheForTests } from "@/src/lib/env"
import { SignJWT, generateKeyPair } from "jose"

describe("orcid-oauth.buildAuthorizeUrl", () => {
    beforeEach(() => {
        __resetEnvCacheForTests()
    })

    it("constructs URL with required params", () => {
        const url = buildAuthorizeUrl("state-token-abc")
        expect(url.startsWith(ORCID_AUTHORIZE_URL)).toBe(true)
        const u = new URL(url)
        expect(u.searchParams.get("response_type")).toBe("code")
        expect(u.searchParams.get("scope")).toBe("/authenticate")
        expect(u.searchParams.get("client_id")).toBe("test-client")
        expect(u.searchParams.get("state")).toBe("state-token-abc")
        expect(u.searchParams.get("redirect_uri")).toBe(
            "http://localhost:3000/api/auth/orcid/callback"
        )
    })
})

describe("orcid-oauth.exchangeCode", () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        __resetEnvCacheForTests()
    })

    afterEach(() => {
        globalThis.fetch = originalFetch
    })

    it("POSTs to ORCID token endpoint and returns JSON", async () => {
        const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
            expect(url).toBe(ORCID_TOKEN_URL)
            const body = new URLSearchParams(init.body as string)
            expect(body.get("grant_type")).toBe("authorization_code")
            expect(body.get("code")).toBe("test-code")
            expect(body.get("client_id")).toBe("test-client")
            return new Response(
                JSON.stringify({
                    access_token: "ax",
                    token_type: "bearer",
                    expires_in: 600,
                    orcid: "0000-0001-2345-6789",
                    name: "M",
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        })
        globalThis.fetch = fetchMock as typeof fetch
        const res = await exchangeCode("test-code")
        expect(res.access_token).toBe("ax")
        expect(res.orcid).toBe("0000-0001-2345-6789")
        expect(fetchMock).toHaveBeenCalledOnce()
    })

    it("throws on non-2xx response", async () => {
        globalThis.fetch = vi.fn(async () => new Response("server error", { status: 500 })) as typeof fetch
        await expect(exchangeCode("c")).rejects.toThrow(/ORCID token exchange failed/)
    })

    it("throws when response lacks required fields", async () => {
        globalThis.fetch = vi.fn(
            async () => new Response(JSON.stringify({ access_token: "x" }), { status: 200 })
        ) as typeof fetch
        await expect(exchangeCode("c")).rejects.toThrow(/missing required fields/)
    })
})

describe("orcid-oauth.verifyOrcidToken", () => {
    beforeEach(() => {
        __resetEnvCacheForTests()
        process.env.ORCID_CLIENT_ID = "test-client"
    })

    afterEach(() => {
        __overrideJwksForTests(null)
    })

    it("verifies a properly signed ORCID-issued token", async () => {
        const { publicKey, privateKey } = await generateKeyPair("RS256")
        const orcid = "0000-0001-2345-6789"
        const token = await new SignJWT({ name: "Maria", email: "maria@example.org" })
            .setProtectedHeader({ alg: "RS256" })
            .setIssuer("https://orcid.org")
            .setAudience("test-client")
            .setSubject(orcid)
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey)

        // Stub the JWKS resolver to return our just-generated public key.
        const resolver = async () => publicKey as unknown as CryptoKey
        __overrideJwksForTests(resolver as never)

        const verified = await verifyOrcidToken(token)
        expect(verified.orcid).toBe(orcid)
        expect(verified.name).toBe("Maria")
        expect(verified.email).toBe("maria@example.org")
    })

    it("rejects tokens with wrong issuer", async () => {
        const { publicKey, privateKey } = await generateKeyPair("RS256")
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: "RS256" })
            .setIssuer("https://evil.example")
            .setAudience("test-client")
            .setSubject("0000-0001-2345-6789")
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey)
        const resolver = async () => publicKey as unknown as CryptoKey
        __overrideJwksForTests(resolver as never)
        await expect(verifyOrcidToken(token)).rejects.toThrow()
    })

    it("rejects tokens with wrong audience", async () => {
        const { publicKey, privateKey } = await generateKeyPair("RS256")
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: "RS256" })
            .setIssuer("https://orcid.org")
            .setAudience("wrong-client")
            .setSubject("0000-0001-2345-6789")
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(privateKey)
        const resolver = async () => publicKey as unknown as CryptoKey
        __overrideJwksForTests(resolver as never)
        await expect(verifyOrcidToken(token)).rejects.toThrow()
    })

    it("rejects expired tokens (beyond ±2 min skew)", async () => {
        const { publicKey, privateKey } = await generateKeyPair("RS256")
        const longAgo = Math.floor(Date.now() / 1000) - 60 * 60 // 1h ago
        const token = await new SignJWT({})
            .setProtectedHeader({ alg: "RS256" })
            .setIssuer("https://orcid.org")
            .setAudience("test-client")
            .setSubject("0000-0001-2345-6789")
            .setIssuedAt(longAgo - 60)
            .setExpirationTime(longAgo)
            .sign(privateKey)
        const resolver = async () => publicKey as unknown as CryptoKey
        __overrideJwksForTests(resolver as never)
        await expect(verifyOrcidToken(token)).rejects.toThrow()
    })
})
