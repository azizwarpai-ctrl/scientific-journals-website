import { describe, it, expect, beforeEach } from "vitest"
import { getEnv, getOrcidRedirectUri, __resetEnvCacheForTests } from "@/src/lib/env"

describe("env loader", () => {
    beforeEach(() => {
        __resetEnvCacheForTests()
        delete process.env.NODE_ENV
        process.env.ORCID_CLIENT_ID = "client_x"
        process.env.ORCID_CLIENT_SECRET = "secret_x"
        process.env.IDENTITY_COOKIE_SECRET = "id_secret"
        process.env.ORCID_STATE_SECRET = "state_secret"
        process.env.EVENT_IP_HASH_SALT_SEED = "salt_seed"
    })

    it("reads required secrets from process.env", () => {
        const env = getEnv()
        expect(env.ORCID_CLIENT_ID).toBe("client_x")
        expect(env.ORCID_CLIENT_SECRET).toBe("secret_x")
        expect(env.IDENTITY_COOKIE_SECRET).toBe("id_secret")
        expect(env.ORCID_STATE_SECRET).toBe("state_secret")
        expect(env.EVENT_IP_HASH_SALT_SEED).toBe("salt_seed")
    })

    it("ENABLE_ORCID_OJS_BACKFILL parses string 'true' to boolean", () => {
        process.env.ENABLE_ORCID_OJS_BACKFILL = "true"
        __resetEnvCacheForTests()
        expect(getEnv().ENABLE_ORCID_OJS_BACKFILL).toBe(true)
    })

    it("ENABLE_ORCID_OJS_BACKFILL parses string 'false' to boolean", () => {
        process.env.ENABLE_ORCID_OJS_BACKFILL = "false"
        __resetEnvCacheForTests()
        expect(getEnv().ENABLE_ORCID_OJS_BACKFILL).toBe(false)
    })

    it("UIET_P1_ENABLED defaults to false", () => {
        delete process.env.UIET_P1_ENABLED
        __resetEnvCacheForTests()
        expect(getEnv().UIET_P1_ENABLED).toBe(false)
    })

    it("falls back to dev defaults when secret is missing in dev", () => {
        delete process.env.ORCID_CLIENT_ID
        __resetEnvCacheForTests()
        const env = getEnv()
        expect(env.ORCID_CLIENT_ID).toMatch(/^dev-default-ORCID_CLIENT_ID/)
    })

    it("getOrcidRedirectUri derives from NEXT_PUBLIC_APP_URL when unset", () => {
        delete process.env.ORCID_REDIRECT_URI
        process.env.NEXT_PUBLIC_APP_URL = "https://example.org"
        __resetEnvCacheForTests()
        expect(getOrcidRedirectUri()).toBe("https://example.org/api/auth/orcid/callback")
    })

    it("getOrcidRedirectUri honors explicit value", () => {
        process.env.ORCID_REDIRECT_URI = "https://custom.example/x"
        __resetEnvCacheForTests()
        expect(getOrcidRedirectUri()).toBe("https://custom.example/x")
    })

    it("caches result across calls", () => {
        __resetEnvCacheForTests()
        const a = getEnv()
        process.env.ORCID_CLIENT_ID = "changed"
        const b = getEnv()
        expect(a).toBe(b)
        expect(b.ORCID_CLIENT_ID).toBe("client_x")
    })
})
