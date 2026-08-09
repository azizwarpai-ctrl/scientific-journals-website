import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getOrSetCache, invalidateCache } from '@/src/lib/server-cache'

describe('server-cache', () => {
    beforeEach(() => {
        invalidateCache()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('computes once within TTL and serves the cached value', async () => {
        const fn = vi.fn().mockResolvedValue(42)
        expect(await getOrSetCache('k', 1000, fn)).toBe(42)
        expect(await getOrSetCache('k', 1000, fn)).toBe(42)
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('recomputes after TTL expiry', async () => {
        const fn = vi.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b')
        expect(await getOrSetCache('k', 1000, fn)).toBe('a')
        vi.advanceTimersByTime(1001)
        expect(await getOrSetCache('k', 1000, fn)).toBe('b')
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it('isolates keys', async () => {
        expect(await getOrSetCache('a', 1000, async () => 1)).toBe(1)
        expect(await getOrSetCache('b', 1000, async () => 2)).toBe(2)
    })

    it('invalidates by prefix', async () => {
        const fn = vi.fn().mockResolvedValue('v')
        await getOrSetCache('admin:x', 1000, fn)
        await getOrSetCache('other:y', 1000, fn)
        invalidateCache('admin:')
        await getOrSetCache('admin:x', 1000, fn) // recomputed
        await getOrSetCache('other:y', 1000, fn) // still cached
        expect(fn).toHaveBeenCalledTimes(3)
    })
})
