/**
 * Minimal in-process TTL cache for server route handlers.
 *
 * Single-instance assumption: production runs one Passenger app process and
 * there is no Redis in this stack (see src/lib/rate-limiter.ts note and
 * docs/ops/discovery-2026-08.md). If the app ever becomes multi-instance,
 * swap the Map for a shared store.
 */

interface CacheSlot {
    value: unknown
    expiresAt: number
}

const store = new Map<string, CacheSlot>()

/** HTTP caching headers matching the in-process TTL semantics. */
export const CACHE_HEADERS = {
    "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
} as const

export async function getOrSetCache<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
): Promise<T> {
    const hit = store.get(key)
    if (hit && Date.now() < hit.expiresAt) {
        return hit.value as T
    }
    const value = await fn()
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
    // Lazy eviction: drop expired entries opportunistically so the map
    // doesn't grow unbounded under many distinct keys.
    if (store.size > 500) {
        const now = Date.now()
        for (const [k, slot] of store) {
            if (now >= slot.expiresAt) store.delete(k)
        }
    }
    return value
}

/** Clears the cache (whole, or entries whose key starts with `prefix`). */
export function invalidateCache(prefix?: string): void {
    if (prefix === undefined) {
        store.clear()
        return
    }
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key)
    }
}
