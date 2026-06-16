import { describe, it, expect, beforeEach } from "vitest"
import {
    getEnv,
    getMetricsEnv,
    getIdentityEnv,
    getOrcidEnv,
    getFlagsEnv,
    getOrcidRedirectUri,
    __resetEnvCacheForTests,
} from "@/src/lib/env"

function setAllSecrets() {
    process.env.ORCID_CLIENT_ID = "client_x"
    process.env.ORCID_CLIENT_SECRET = "secret_x"
    process.env.IDENTITY_COOKIE_SECRET = "id_secret"
    process.env.ORCID_STATE_SECRET = "state_secret"
    process.env.EVENT_IP_HASH_SALT_SEED = "salt_seed"
}

describe("env loader", () => {
    beforeEach(() => {
        __resetEnvCacheForTests()
        delete process.env.NODE_ENV
        setAllSecrets()
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

describe("focused env readers — decoupled validation", () => {
    beforeEach(() => {
        __resetEnvCacheForTests()
        delete process.env.NODE_ENV
        delete process.env.ORCID_CLIENT_ID
        delete process.env.ORCID_CLIENT_SECRET
        delete process.env.ORCID_STATE_SECRET
        delete process.env.ORCID_REDIRECT_URI
        delete process.env.IDENTITY_COOKIE_SECRET
        delete process.env.EVENT_IP_HASH_SALT_SEED
    })

    it("getMetricsEnv() succeeds with only EVENT_IP_HASH_SALT_SEED set", () => {
        process.env.EVENT_IP_HASH_SALT_SEED = "my_salt"
        const env = getMetricsEnv()
        expect(env.EVENT_IP_HASH_SALT_SEED).toBe("my_salt")
    })

    it("getMetricsEnv() does NOT require ORCID vars", () => {
        process.env.EVENT_IP_HASH_SALT_SEED = "my_salt"
        expect(() => getMetricsEnv()).not.toThrow()
    })

    it("getIdentityEnv() succeeds with only IDENTITY_COOKIE_SECRET set", () => {
        process.env.IDENTITY_COOKIE_SECRET = "my_cookie_secret"
        const env = getIdentityEnv()
        expect(env.IDENTITY_COOKIE_SECRET).toBe("my_cookie_secret")
    })

    it("getIdentityEnv() does NOT require ORCID vars", () => {
        process.env.IDENTITY_COOKIE_SECRET = "my_cookie_secret"
        expect(() => getIdentityEnv()).not.toThrow()
    })

    it("getOrcidEnv() requires ORCID_CLIENT_ID, ORCID_CLIENT_SECRET, ORCID_STATE_SECRET", () => {
        process.env.ORCID_CLIENT_ID = "cid"
        process.env.ORCID_CLIENT_SECRET = "csec"
        process.env.ORCID_STATE_SECRET = "ssec"
        const env = getOrcidEnv()
        expect(env.ORCID_CLIENT_ID).toBe("cid")
        expect(env.ORCID_CLIENT_SECRET).toBe("csec")
        expect(env.ORCID_STATE_SECRET).toBe("ssec")
    })

    it("getOrcidEnv() uses dev defaults when ORCID_CLIENT_ID is missing in non-prod", () => {
        process.env.ORCID_CLIENT_SECRET = "csec"
        process.env.ORCID_STATE_SECRET = "ssec"
        __resetEnvCacheForTests()
        const env = getOrcidEnv()
        expect(env.ORCID_CLIENT_ID).toMatch(/^dev-default-ORCID_CLIENT_ID/)
    })

    it("getFlagsEnv() succeeds without any secrets set", () => {
        const env = getFlagsEnv()
        expect(env.UIET_P1_ENABLED).toBe(false)
    })

    it("focused readers cache independently", () => {
        process.env.EVENT_IP_HASH_SALT_SEED = "salt1"
        process.env.IDENTITY_COOKIE_SECRET = "cookie1"
        const m = getMetricsEnv()
        const i = getIdentityEnv()
        process.env.EVENT_IP_HASH_SALT_SEED = "changed"
        expect(getMetricsEnv()).toBe(m)
        expect(getIdentityEnv()).toBe(i)
    })
})
