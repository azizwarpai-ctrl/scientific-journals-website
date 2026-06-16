/**
 * Storage factory. Selects an `ObjectStorage` implementation by env:
 *
 *   AUDIO_STORAGE_DIR set   → LocalFileStorage rooted at that path.
 *                             Used for hosts with persistent disk
 *                             (Hostinger Cloud + similar) — the path MUST
 *                             live outside the deploy/build dir so files
 *                             survive redeploys.
 *   AUDIO_STORAGE_DIR unset → S3Storage. Reads the `S3_*` env vars below.
 *
 * The local backend is the configured default for this deployment.
 *
 * Required S3 env vars when AUDIO_STORAGE_DIR is unset (set at deploy;
 * never committed):
 *   S3_ENDPOINT          — full URL, e.g. `https://<account>.r2.cloudflarestorage.com`
 *   S3_BUCKET            — bucket name
 *   S3_ACCESS_KEY_ID     — IAM key with put/get/delete on the bucket
 *   S3_SECRET_ACCESS_KEY — paired secret
 *   S3_REGION            — `auto` for R2, `us-east-1`-style for AWS S3
 *
 * Optional:
 *   S3_FORCE_PATH_STYLE  — `false` to use virtual-host style. Defaults to `true`.
 */

import { promises as fs } from "node:fs"

import { LocalFileStorage } from "./local"
import { S3Storage } from "./s3"
import type { ObjectStorage } from "./types"

export type { ObjectStorage, PutOptions } from "./types"
export { StorageError } from "./types"

let cached: ObjectStorage | null = null

function readRequired(name: string): string {
  const value = process.env[name]
  if (!value || value.length === 0) {
    throw new Error(`[storage] ${name} is required for object storage`)
  }
  return value
}

export function getStorage(): ObjectStorage {
  if (cached) return cached

  const localRoot = process.env.AUDIO_STORAGE_DIR
  if (localRoot && localRoot.length > 0) {
    // mkdir runs lazily on first `put`; doing it here would make `getStorage()`
    // asynchronous and ripple out to every caller. LocalFileStorage.put()
    // mkdir's the dirname on every write, which is idempotent.
    cached = new LocalFileStorage(localRoot)
    return cached
  }

  const config = {
    endpoint: readRequired("S3_ENDPOINT"),
    region: readRequired("S3_REGION"),
    bucket: readRequired("S3_BUCKET"),
    accessKeyId: readRequired("S3_ACCESS_KEY_ID"),
    secretAccessKey: readRequired("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  }

  cached = new S3Storage(config)
  return cached
}

/**
 * Eagerly create the local storage root, if one is configured. Safe to call
 * during server boot; no-ops when `AUDIO_STORAGE_DIR` is unset. Returns the
 * resolved root path on success, `null` when local storage is not in use.
 *
 * Idempotent (`{ recursive: true }`). Throws on permission/IO failures so the
 * boot surface fails loud rather than letting the first upload discover it.
 */
export async function ensureLocalStorageRoot(): Promise<string | null> {
  const root = process.env.AUDIO_STORAGE_DIR
  if (!root || root.length === 0) return null
  await fs.mkdir(root, { recursive: true })
  return root
}

/**
 * Test seam: replace the cached implementation with a fake. Production code
 * MUST NOT call this; route handlers always go through `getStorage()`.
 */
export function __setStorageForTests(impl: ObjectStorage | null): void {
  cached = impl
}
