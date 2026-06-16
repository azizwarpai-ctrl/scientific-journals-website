import { promises as fs } from "node:fs"
import path from "node:path"

import { StorageError, type ObjectStorage, type PutOptions } from "./types"

const PUBLIC_AUDIO_ROUTE = "/api/audio"

/**
 * Filesystem-backed `ObjectStorage`.
 *
 * Used on deployments with a persistent disk (Hostinger Cloud + similar):
 * the root MUST live outside the deploy/build directory so files survive
 * `next build` swaps. Configure via `AUDIO_STORAGE_DIR`; the factory in
 * `src/lib/storage/index.ts` selects this adapter whenever that var is set.
 *
 * Path-traversal safety: every key is sanitized and the resulting absolute
 * path is re-checked against the resolved root before any fs call. A key
 * like `../../etc/passwd`, `/abs/path`, or `foo/../../bar` cannot escape
 * the root — `put` and `delete` throw `StorageError` instead.
 *
 * `signedReadUrl` does not stream bytes — it returns a stable, app-relative
 * path that the public B3 audio route (`GET /api/audio/[…]`) will resolve
 * back to a local file. Until B3 lands, the URL is non-functional; callers
 * should treat its existence as opaque.
 */
export class LocalFileStorage implements ObjectStorage {
  private readonly root: string

  constructor(root: string) {
    if (!root || root.length === 0) {
      throw new StorageError("LocalFileStorage requires a non-empty root path")
    }
    this.root = path.resolve(root)
  }

  /**
   * Resolve a caller-supplied key into an absolute path under the root.
   * Throws `StorageError` if the resolved path escapes the root.
   */
  private resolveKeyPath(key: string): string {
    if (typeof key !== "string" || key.length === 0) {
      throw new StorageError("Storage key must be a non-empty string")
    }
    if (key.includes("\0")) {
      throw new StorageError("Storage key must not contain null bytes")
    }
    // path.resolve drops absolute prefixes when joining; we explicitly reject
    // them so an absolute key like `/etc/passwd` is a hard error rather than
    // a silently-rewritten relative one.
    if (path.isAbsolute(key)) {
      throw new StorageError(`Storage key must not be absolute: ${key}`)
    }
    const resolved = path.resolve(this.root, key)
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep
    if (resolved !== this.root && !resolved.startsWith(rootWithSep)) {
      throw new StorageError(`Storage key escapes root: ${key}`)
    }
    return resolved
  }

  async put(key: string, body: Buffer, _opts: PutOptions): Promise<void> {
    const target = this.resolveKeyPath(key)
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, body)
    } catch (error) {
      throw new StorageError(`Failed to put ${key}`, { cause: error })
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveKeyPath(key)
    try {
      await fs.unlink(target)
    } catch (error) {
      // Missing file on delete is not a failure — the desired end state
      // (file absent) already holds. Anything else surfaces as StorageError.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return
      throw new StorageError(`Failed to delete ${key}`, { cause: error })
    }
  }

  async signedReadUrl(key: string, _ttlSeconds?: number): Promise<string> {
    // Validate the key so we never hand back a URL for a path that would
    // later 404 or 4xx in the public route. We do not check existence here
    // — that's the public route's job and B3's failure mode.
    this.resolveKeyPath(key)
    // Single-encode each segment so slashes stay path separators in the URL
    // but `?`, `#`, spaces, etc. are escaped. The public route is responsible
    // for decoding back to the same key shape.
    const encoded = key.split("/").map(encodeURIComponent).join("/")
    return `${PUBLIC_AUDIO_ROUTE}/${encoded}`
  }
}
