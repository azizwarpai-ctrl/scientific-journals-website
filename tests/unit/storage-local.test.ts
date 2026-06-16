import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { LocalFileStorage } from "@/src/lib/storage/local"
import { StorageError } from "@/src/lib/storage/types"

async function makeTempRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "digitopub-storage-"))
}

async function rmRecursive(p: string): Promise<void> {
  await fs.rm(p, { recursive: true, force: true })
}

describe("LocalFileStorage — put/delete/signedReadUrl", () => {
  let root: string
  let storage: LocalFileStorage

  beforeEach(async () => {
    root = await makeTempRoot()
    storage = new LocalFileStorage(root)
  })

  afterEach(async () => {
    await rmRecursive(root)
  })

  it("writes a file at root/<key>, creating intermediate dirs", async () => {
    await storage.put("article-audio/12/200/default/file.mp3", Buffer.from("hello"), {
      contentType: "audio/mpeg",
      size: 5,
    })
    const target = path.join(root, "article-audio/12/200/default/file.mp3")
    const stat = await fs.stat(target)
    expect(stat.isFile()).toBe(true)
    expect(await fs.readFile(target, "utf8")).toBe("hello")
  })

  it("overwrites on replace", async () => {
    const key = "article-audio/12/200/default/x"
    await storage.put(key, Buffer.from("v1"), { contentType: "audio/mpeg", size: 2 })
    await storage.put(key, Buffer.from("v2-longer"), { contentType: "audio/mpeg", size: 9 })
    expect(await fs.readFile(path.join(root, key), "utf8")).toBe("v2-longer")
  })

  it("delete removes the file", async () => {
    const key = "article-audio/12/200/default/x"
    await storage.put(key, Buffer.from("bye"), { contentType: "audio/mpeg", size: 3 })
    await storage.delete(key)
    await expect(fs.stat(path.join(root, key))).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("delete is a no-op when the file is already gone", async () => {
    await expect(storage.delete("never-existed/x")).resolves.toBeUndefined()
  })

  it("signedReadUrl returns the /api/audio path for the key with each segment URI-encoded", async () => {
    const url = await storage.signedReadUrl("article-audio/12/200/default/file name.mp3")
    expect(url).toBe("/api/audio/article-audio/12/200/default/file%20name.mp3")
  })

  it("signedReadUrl preserves single forward slashes as path separators", async () => {
    const url = await storage.signedReadUrl("a/b/c.mp3")
    expect(url).toBe("/api/audio/a/b/c.mp3")
  })
})

describe("LocalFileStorage — path-traversal guards", () => {
  let root: string
  let outside: string
  let storage: LocalFileStorage

  beforeEach(async () => {
    root = await makeTempRoot()
    outside = await makeTempRoot()
    storage = new LocalFileStorage(root)
  })

  afterEach(async () => {
    await rmRecursive(root)
    await rmRecursive(outside)
  })

  it("rejects a key that climbs out of the root with ../", async () => {
    await expect(
      storage.put("../../etc/passwd", Buffer.from("nope"), { contentType: "audio/mpeg", size: 4 })
    ).rejects.toBeInstanceOf(StorageError)
  })

  it("rejects a key that climbs out via a mixed segment", async () => {
    await expect(
      storage.put("article-audio/../../escape.mp3", Buffer.from(""), {
        contentType: "audio/mpeg",
        size: 0,
      })
    ).rejects.toBeInstanceOf(StorageError)
  })

  it("rejects an absolute key outright (no silent rewrite)", async () => {
    await expect(
      storage.put("/etc/passwd", Buffer.from(""), { contentType: "audio/mpeg", size: 0 })
    ).rejects.toBeInstanceOf(StorageError)
    await expect(
      storage.put(path.join(outside, "x"), Buffer.from(""), { contentType: "audio/mpeg", size: 0 })
    ).rejects.toBeInstanceOf(StorageError)
  })

  it("rejects keys containing null bytes", async () => {
    await expect(
      storage.put("ok\0bad", Buffer.from(""), { contentType: "audio/mpeg", size: 0 })
    ).rejects.toBeInstanceOf(StorageError)
  })

  it("rejects an empty key", async () => {
    await expect(
      storage.put("", Buffer.from(""), { contentType: "audio/mpeg", size: 0 })
    ).rejects.toBeInstanceOf(StorageError)
  })

  it("does not produce any file outside the root after a rejected traversal", async () => {
    await expect(
      storage.put("../escape.mp3", Buffer.from("x"), { contentType: "audio/mpeg", size: 1 })
    ).rejects.toBeInstanceOf(StorageError)
    // The would-be escape target sits next to root; assert it never appeared.
    const wouldBe = path.resolve(root, "../escape.mp3")
    await expect(fs.stat(wouldBe)).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("delete and signedReadUrl apply the same guards as put", async () => {
    await expect(storage.delete("../../etc/passwd")).rejects.toBeInstanceOf(StorageError)
    await expect(storage.signedReadUrl("../../etc/passwd")).rejects.toBeInstanceOf(StorageError)
  })
})

describe("LocalFileStorage — construction", () => {
  it("throws when root is empty", () => {
    expect(() => new LocalFileStorage("")).toThrow(StorageError)
  })
})

describe("getStorage factory — backend selection", () => {
  beforeEach(async () => {
    // Reset module so the cached storage instance is rebuilt.
    const mod = await import("@/src/lib/storage")
    mod.__setStorageForTests(null)
  })

  afterEach(() => {
    // Always clear stubs + cached impl so other suites are unaffected.
  })

  it("returns LocalFileStorage when AUDIO_STORAGE_DIR is set", async () => {
    const tmp = await makeTempRoot()
    try {
      const { getStorage, __setStorageForTests } = await import("@/src/lib/storage")
      __setStorageForTests(null)
      const orig = process.env.AUDIO_STORAGE_DIR
      process.env.AUDIO_STORAGE_DIR = tmp
      try {
        const impl = getStorage()
        expect(impl).toBeInstanceOf(LocalFileStorage)
      } finally {
        if (orig === undefined) delete process.env.AUDIO_STORAGE_DIR
        else process.env.AUDIO_STORAGE_DIR = orig
        __setStorageForTests(null)
      }
    } finally {
      await rmRecursive(tmp)
    }
  })

  it("ensureLocalStorageRoot creates the directory and returns its path", async () => {
    const tmp = await makeTempRoot()
    try {
      const orig = process.env.AUDIO_STORAGE_DIR
      const nested = path.join(tmp, "audio")
      process.env.AUDIO_STORAGE_DIR = nested
      try {
        const { ensureLocalStorageRoot } = await import("@/src/lib/storage")
        const result = await ensureLocalStorageRoot()
        expect(result).toBe(nested)
        const stat = await fs.stat(nested)
        expect(stat.isDirectory()).toBe(true)
      } finally {
        if (orig === undefined) delete process.env.AUDIO_STORAGE_DIR
        else process.env.AUDIO_STORAGE_DIR = orig
      }
    } finally {
      await rmRecursive(tmp)
    }
  })

  it("ensureLocalStorageRoot returns null when AUDIO_STORAGE_DIR is unset", async () => {
    const orig = process.env.AUDIO_STORAGE_DIR
    delete process.env.AUDIO_STORAGE_DIR
    try {
      const { ensureLocalStorageRoot } = await import("@/src/lib/storage")
      expect(await ensureLocalStorageRoot()).toBeNull()
    } finally {
      if (orig !== undefined) process.env.AUDIO_STORAGE_DIR = orig
    }
  })
})
