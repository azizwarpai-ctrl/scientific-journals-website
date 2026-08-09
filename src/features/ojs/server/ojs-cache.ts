import type { z } from "zod"
import type { ojsJournalsResponseSchema, ojsStatsResponseSchema } from "@/src/features/ojs/schemas/ojs-schema"

export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes — fresh window
// Stale-while-revalidate: when OJS is unreachable, entries may still be
// served for this long past their fresh expiry so a SiteGround IP-whitelist
// flap degrades to slightly stale data instead of request pileup on the
// 3-connection OJS pool.
export const CACHE_STALE_TTL = 30 * 60 * 1000 // 30 minutes
// Negative cache: after a fetch failure, don't retry OJS for this long.
export const CACHE_ERROR_TTL = 60 * 1000 // 60 seconds

export type CachedJournals = z.infer<typeof ojsJournalsResponseSchema> | null
export type OjsStats = z.infer<typeof ojsStatsResponseSchema>

export interface CacheEntry<T> {
    data: T | null
    expiresAt: number // fresh until
    staleUntil: number // servable-on-error until
    errorUntil: number // negative-cache: skip OJS retries until
}

export const ojsCache = {
    journals: { data: null, expiresAt: 0, staleUntil: 0, errorUntil: 0 } as CacheEntry<CachedJournals>,
    stats: { data: null, expiresAt: 0, staleUntil: 0, errorUntil: 0 } as CacheEntry<OjsStats | null>,
}

export function setCacheEntry<T>(entry: CacheEntry<T>, data: T): void {
    const now = Date.now()
    entry.data = data
    entry.expiresAt = now + CACHE_TTL
    entry.staleUntil = now + CACHE_STALE_TTL
    entry.errorUntil = 0
}

export function markCacheError<T>(entry: CacheEntry<T>): void {
    entry.errorUntil = Date.now() + CACHE_ERROR_TTL
}

/** Fresh hit — normal cache read. */
export function isFresh<T>(entry: CacheEntry<T>): boolean {
    return entry.data !== null && Date.now() < entry.expiresAt
}

/** Stale-but-servable — only used when a live fetch just failed. */
export function isServableStale<T>(entry: CacheEntry<T>): boolean {
    return entry.data !== null && Date.now() < entry.staleUntil
}

/** Negative-cache hit — a recent fetch failed; skip hammering OJS. */
export function isErrorCached<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.errorUntil
}
