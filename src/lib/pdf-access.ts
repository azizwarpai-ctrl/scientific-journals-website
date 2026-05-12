/**
 * Lookup `(submissionId, galleyId) -> isOpenAccess` for the PDF proxy.
 *
 * - 5-min in-memory cache keyed by `submissionId:galleyId`.
 * - Falls back to "treat as gated" (false) if the OJS lookup fails — we
 *   prefer to overgate (force ORCID sign-in) than undergate (let a non-OA
 *   download leak).
 */

import { ojsQuery, isOjsConfigured } from "@/src/features/ojs/server/ojs-client"
import { isOpenAccessStatus } from "@/src/features/journals/server/ojs-galley-utils"

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  value: boolean
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(submissionId: string | number, galleyId: string | number): string {
  return `${submissionId}:${galleyId}`
}

export async function isGalleyOpenAccess(
  submissionId: string | number,
  galleyId: string | number
): Promise<boolean> {
  const key = cacheKey(submissionId, galleyId)
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  // If OJS is not configured at all, default to gated for safety.
  if (!isOjsConfigured()) {
    cache.set(key, { value: false, expiresAt: now + CACHE_TTL_MS })
    return false
  }

  try {
    const rows = await ojsQuery<{ access_status: number | null }>(
      `SELECT i.access_status
       FROM publication_galleys pg
       INNER JOIN publications p ON p.publication_id = pg.publication_id
       LEFT JOIN issues i ON i.issue_id = p.issue_id
       WHERE pg.galley_id = ?
       LIMIT 1`,
      [Number(galleyId)]
    )
    const status = rows[0]?.access_status ?? null
    const isOpen = isOpenAccessStatus(status)
    cache.set(key, { value: isOpen, expiresAt: now + CACHE_TTL_MS })
    return isOpen
  } catch (err) {
    // Treat lookup failures as gated. Logged at warn level so ops sees it.
    // eslint-disable-next-line no-console
    console.warn(
      `[pdf-access] OA lookup failed for galleyId=${galleyId}, defaulting to gated:`,
      err instanceof Error ? err.message : String(err)
    )
    cache.set(key, { value: false, expiresAt: now + CACHE_TTL_MS })
    return false
  }
}

/** TEST ONLY: drop all cached entries. */
export function __resetPdfAccessCacheForTests(): void {
  cache.clear()
}
