import { describe, it, expect } from "vitest"

process.env.EVENT_IP_HASH_SALT_SEED ||= "test-event-ip-hash-salt-seed"
process.env.IDENTITY_COOKIE_SECRET ||= "test-identity-cookie-secret"
process.env.ORCID_STATE_SECRET ||= "test-orcid-state-secret"
process.env.ORCID_CLIENT_ID ||= "test-orcid-client"
process.env.ORCID_CLIENT_SECRET ||= "test-orcid-client-secret"

import {
    hashIp,
    hashUa,
    hashWithDailySalt,
    dayKey,
    clientIpFromHeaders,
} from "@/src/lib/ip-hash"

describe("ip-hash", () => {
    it("dayKey returns YYYY-MM-DD UTC", () => {
        const d = new Date(Date.UTC(2026, 4, 12, 23, 59, 59))
        expect(dayKey(d)).toBe("2026-05-12")
    })

    it("produces deterministic hash for same (ip, day)", () => {
        const h1 = hashIp("192.0.2.1", "2026-05-12")
        const h2 = hashIp("192.0.2.1", "2026-05-12")
        expect(h1).toBe(h2)
        expect(h1).toMatch(/^[0-9a-f]{64}$/)
    })

    it("different day produces different hash", () => {
        const a = hashIp("192.0.2.1", "2026-05-12")
        const b = hashIp("192.0.2.1", "2026-05-13")
        expect(a).not.toBe(b)
    })

    it("different IP produces different hash on same day", () => {
        const a = hashIp("192.0.2.1", "2026-05-12")
        const b = hashIp("203.0.113.7", "2026-05-12")
        expect(a).not.toBe(b)
    })

    it("hashUa works the same way", () => {
        const a = hashUa("Mozilla/5.0", "2026-05-12")
        const b = hashUa("Mozilla/5.0", "2026-05-12")
        const c = hashUa("Chrome/127", "2026-05-12")
        expect(a).toBe(b)
        expect(a).not.toBe(c)
    })

    it("empty input returns empty string (not a hash)", () => {
        expect(hashWithDailySalt("", "2026-05-12")).toBe("")
    })

    describe("clientIpFromHeaders", () => {
        it("prefers x-forwarded-for first entry", () => {
            const h = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })
            expect(clientIpFromHeaders(h)).toBe("1.2.3.4")
        })
        it("falls back to x-real-ip", () => {
            const h = new Headers({ "x-real-ip": "5.6.7.8" })
            expect(clientIpFromHeaders(h)).toBe("5.6.7.8")
        })
        it("falls back to cf-connecting-ip", () => {
            const h = new Headers({ "cf-connecting-ip": "9.9.9.9" })
            expect(clientIpFromHeaders(h)).toBe("9.9.9.9")
        })
        it("returns 0.0.0.0 when nothing is set", () => {
            const h = new Headers()
            expect(clientIpFromHeaders(h)).toBe("0.0.0.0")
        })
    })
})
