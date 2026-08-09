import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { verifyCronSecret } from '@/src/lib/cron-auth'

describe('verifyCronSecret', () => {
    beforeEach(() => {
        process.env.CRON_SECRET = 'test-secret-value'
    })

    afterEach(() => {
        delete process.env.CRON_SECRET
    })

    it('accepts the correct bearer token', () => {
        expect(verifyCronSecret('Bearer test-secret-value')).toBe(true)
    })

    it('rejects a wrong token', () => {
        expect(verifyCronSecret('Bearer wrong-value')).toBe(false)
    })

    it('rejects a token of different length (hashed compare, no throw)', () => {
        expect(verifyCronSecret('Bearer x')).toBe(false)
        expect(verifyCronSecret(`Bearer ${'x'.repeat(500)}`)).toBe(false)
    })

    it('rejects a missing or malformed header', () => {
        expect(verifyCronSecret(undefined)).toBe(false)
        expect(verifyCronSecret('')).toBe(false)
        expect(verifyCronSecret('test-secret-value')).toBe(false)
        expect(verifyCronSecret('Basic test-secret-value')).toBe(false)
        expect(verifyCronSecret('bearer test-secret-value')).toBe(false)
    })

    it('fails closed when CRON_SECRET is unset', () => {
        delete process.env.CRON_SECRET
        expect(verifyCronSecret('Bearer test-secret-value')).toBe(false)
    })

    it('fails closed when CRON_SECRET is empty', () => {
        process.env.CRON_SECRET = ''
        expect(verifyCronSecret('Bearer ')).toBe(false)
    })
})
