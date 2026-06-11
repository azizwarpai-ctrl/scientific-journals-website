/**
 * Storage factory. Reads `S3_*` env vars and returns the configured
 * `ObjectStorage` implementation. Throws in production when any required
 * variable is missing — never silently fall back to a no-op stub that would
 * eat upload bytes.
 *
 * Required env vars (set at deploy; never committed):
 *   S3_ENDPOINT          — full URL, e.g. `https://<account>.r2.cloudflarestorage.com`
 *   S3_BUCKET            — bucket name
 *   S3_ACCESS_KEY_ID     — IAM key with put/get/delete on the bucket
 *   S3_SECRET_ACCESS_KEY — paired secret
 *   S3_REGION            — `auto` for R2, `us-east-1`-style for AWS S3
 *
 * Optional:
 *   S3_FORCE_PATH_STYLE  — `false` to use virtual-host style. Defaults to `true`.
 */

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
 * Test seam: replace the cached implementation with a fake. Production code
 * MUST NOT call this; route handlers always go through `getStorage()`.
 */
export function __setStorageForTests(impl: ObjectStorage | null): void {
  cached = impl
}
