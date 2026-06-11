/**
 * Object-storage abstraction.
 *
 * The codebase touches storage through this small interface so the provider
 * (R2 by default, S3 in production, MinIO in dev) can change without
 * rippling out to every caller. See `src/lib/storage/index.ts` for the
 * factory that returns the configured implementation.
 *
 * Keys are caller-chosen, opaque strings (no leading slash). Treat them as
 * the canonical handle stored in the DB.
 */

export interface PutOptions {
  contentType: string
  /** Size in bytes — required so the underlying SDK can stream without buffering twice. */
  size: number
}

export interface ObjectStorage {
  put(key: string, body: Buffer, opts: PutOptions): Promise<void>
  delete(key: string): Promise<void>
  /**
   * Time-limited read URL. Implementations that wrap a public bucket may
   * return a long-lived URL; signed implementations return a short TTL.
   * Default TTL is 15 minutes — short enough that audio links can't be
   * scraped and replayed indefinitely.
   */
  signedReadUrl(key: string, ttlSeconds?: number): Promise<string>
}

/**
 * Thrown for any storage-layer failure (network, auth, bucket missing).
 * Keep this class wire-compatible with `Error` so JSON responses stay simple.
 */
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "StorageError"
    if (options?.cause) {
      // Surface upstream cause for logging; not stringified into client responses.
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}
