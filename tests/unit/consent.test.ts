import { describe, it, expect } from "vitest"

import {
    CONSENT_COOKIE_NAME,
    FORCE_CHOICE_DISMISS_THRESHOLD,
    buildRecordDismissCookieHeader,
    buildSetConsentCookieHeader,
    effectiveConsentMode,
    getConsent,
    shouldForceChoice,
} from "@/src/lib/consent"

function buildCookieHeader(name: string, value: string): string {
    return `${name}=${encodeURIComponent(value)}`
}

function extractEncodedValue(setCookieHeader: string): string {
    const m = setCookieHeader.match(new RegExp(`^${CONSENT_COOKIE_NAME}=([^;]+)`))
    if (!m) throw new Error("no cookie value")
    return m[1]
}

describe("consent cookie", () => {
    it("returns null when cookie absent", () => {
        const req = new Request("https://x.com")
        expect(getConsent(req)).toBeNull()
    })

    it("returns null for malformed cookie", () => {
        const req = new Request("https://x.com", {
            headers: { cookie: `${CONSENT_COOKIE_NAME}=not-base64-json` },
        })
        expect(getConsent(req)).toBeNull()
    })

    it("set -> read round trips choice=all", () => {
        const setHeader = buildSetConsentCookieHeader({ choice: "all", now: 1_700_000_000 })
        const value = extractEncodedValue(setHeader)
        const req = new Request("https://x.com", {
            headers: { cookie: buildCookieHeader(CONSENT_COOKIE_NAME, decodeURIComponent(value)) },
        })
        const payload = getConsent(req)!
        expect(payload.choice).toBe("all")
        expect(payload.decided_at).toBe(1_700_000_000)
        expect(payload.dismiss_count).toBe(0)
    })

    it("set -> read round trips choice=customize with granular", () => {
        const setHeader = buildSetConsentCookieHeader({
            choice: "customize",
            granular: { analytics: true, personalization: false },
        })
        const value = extractEncodedValue(setHeader)
        const req = new Request("https://x.com", {
            headers: { cookie: `${CONSENT_COOKIE_NAME}=${value}` },
        })
        const payload = getConsent(req)!
        expect(payload.choice).toBe("customize")
        expect(payload.granular).toEqual({ analytics: true, personalization: false })
    })

    it("dismiss bumps count and sets first_dismiss_at", () => {
        const first = buildRecordDismissCookieHeader({ prev: null, now: 1_700_000_000 })
        const value1 = decodeURIComponent(extractEncodedValue(first))
        const payload1 = getConsent(
            new Request("https://x.com", {
                headers: { cookie: `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value1)}` },
            })
        )!
        expect(payload1.dismiss_count).toBe(1)
        expect(payload1.first_dismiss_at).toBe(1_700_000_000)

        const second = buildRecordDismissCookieHeader({ prev: payload1, now: 1_700_010_000 })
        const value2 = decodeURIComponent(extractEncodedValue(second))
        const payload2 = getConsent(
            new Request("https://x.com", {
                headers: { cookie: `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value2)}` },
            })
        )!
        expect(payload2.dismiss_count).toBe(2)
        // first_dismiss_at preserved across dismissals
        expect(payload2.first_dismiss_at).toBe(1_700_000_000)
    })

    it("shouldForceChoice is false until threshold", () => {
        expect(shouldForceChoice(null)).toBe(false)
        expect(
            shouldForceChoice({
                choice: null,
                granular: null,
                dismiss_count: FORCE_CHOICE_DISMISS_THRESHOLD - 1,
                first_dismiss_at: 1,
                decided_at: null,
                version: 1,
            })
        ).toBe(false)
        expect(
            shouldForceChoice({
                choice: null,
                granular: null,
                dismiss_count: FORCE_CHOICE_DISMISS_THRESHOLD,
                first_dismiss_at: 1,
                decided_at: null,
                version: 1,
            })
        ).toBe(true)
    })

    it("shouldForceChoice is false when a choice exists, regardless of dismiss count", () => {
        expect(
            shouldForceChoice({
                choice: "essential_only",
                granular: null,
                dismiss_count: 100,
                first_dismiss_at: 1,
                decided_at: 2,
                version: 1,
            })
        ).toBe(false)
    })

    it("effectiveConsentMode maps states correctly", () => {
        expect(effectiveConsentMode(null)).toBe("pre_consent")
        expect(
            effectiveConsentMode({
                choice: "all",
                granular: null,
                dismiss_count: 0,
                first_dismiss_at: null,
                decided_at: 1,
                version: 1,
            })
        ).toBe("all")
        expect(
            effectiveConsentMode({
                choice: "essential_only",
                granular: null,
                dismiss_count: 0,
                first_dismiss_at: null,
                decided_at: 1,
                version: 1,
            })
        ).toBe("essential_only")
        expect(
            effectiveConsentMode({
                choice: "customize",
                granular: { analytics: true, personalization: false },
                dismiss_count: 0,
                first_dismiss_at: null,
                decided_at: 1,
                version: 1,
            })
        ).toBe("all")
        expect(
            effectiveConsentMode({
                choice: "customize",
                granular: { analytics: false, personalization: false },
                dismiss_count: 0,
                first_dismiss_at: null,
                decided_at: 1,
                version: 1,
            })
        ).toBe("essential_only")
    })
})
