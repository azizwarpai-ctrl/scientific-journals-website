import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock the @aws-sdk/client-s3 surface BEFORE importing S3Storage ──
const sendMock = vi.fn()
const putCommandSpy = vi.fn()
const deleteCommandSpy = vi.fn()
const getCommandSpy = vi.fn()

class FakeS3Client {
  send = sendMock
}
class FakePutCommand {
  constructor(input: unknown) {
    putCommandSpy(input)
  }
}
class FakeDeleteCommand {
  constructor(input: unknown) {
    deleteCommandSpy(input)
  }
}
class FakeGetCommand {
  constructor(input: unknown) {
    getCommandSpy(input)
  }
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: FakeS3Client,
  PutObjectCommand: FakePutCommand,
  DeleteObjectCommand: FakeDeleteCommand,
  GetObjectCommand: FakeGetCommand,
}))

const getSignedUrlMock = vi.fn()
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}))

const { S3Storage } = await import("@/src/lib/storage/s3")
const { StorageError } = await import("@/src/lib/storage/types")

function makeStorage() {
  return new S3Storage({
    endpoint: "https://example.r2.cloudflarestorage.com",
    region: "auto",
    bucket: "audio-bucket",
    accessKeyId: "access",
    secretAccessKey: "secret",
  })
}

describe("S3Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("puts an object with the right bucket, key, body, content-type, and length", async () => {
    sendMock.mockResolvedValueOnce({})
    const storage = makeStorage()
    const body = Buffer.from("hello")

    await storage.put("article-audio/abc/123/default/file", body, {
      contentType: "audio/mpeg",
      size: body.byteLength,
    })

    expect(putCommandSpy).toHaveBeenCalledTimes(1)
    expect(putCommandSpy.mock.calls[0][0]).toMatchObject({
      Bucket: "audio-bucket",
      Key: "article-audio/abc/123/default/file",
      Body: body,
      ContentType: "audio/mpeg",
      ContentLength: 5,
    })
  })

  it("wraps put failures in StorageError without leaking the SDK error to the message verbatim", async () => {
    sendMock.mockRejectedValueOnce(new Error("upstream 403"))
    const storage = makeStorage()

    await expect(
      storage.put("k", Buffer.from(""), { contentType: "audio/mpeg", size: 0 })
    ).rejects.toBeInstanceOf(StorageError)
  })

  it("deletes by key", async () => {
    sendMock.mockResolvedValueOnce({})
    await makeStorage().delete("article-audio/abc/123/default/file")

    expect(deleteCommandSpy).toHaveBeenCalledTimes(1)
    expect(deleteCommandSpy.mock.calls[0][0]).toEqual({
      Bucket: "audio-bucket",
      Key: "article-audio/abc/123/default/file",
    })
  })

  it("signs a read URL with the default 15-minute TTL", async () => {
    getSignedUrlMock.mockResolvedValueOnce("https://signed.example/x")
    const url = await makeStorage().signedReadUrl("k")

    expect(url).toBe("https://signed.example/x")
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1)
    expect(getSignedUrlMock.mock.calls[0][2]).toEqual({ expiresIn: 900 })
  })

  it("signs a read URL with a custom TTL", async () => {
    getSignedUrlMock.mockResolvedValueOnce("https://signed.example/y")
    await makeStorage().signedReadUrl("k", 60)
    expect(getSignedUrlMock.mock.calls[0][2]).toEqual({ expiresIn: 60 })
  })

  it("wraps presigner failures in StorageError", async () => {
    getSignedUrlMock.mockRejectedValueOnce(new Error("clock skew"))
    await expect(makeStorage().signedReadUrl("k")).rejects.toBeInstanceOf(StorageError)
  })
})

describe("getStorage factory", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("throws when a required env var is missing", async () => {
    // Clear AUDIO_STORAGE_DIR so the factory takes the S3 branch even when a
    // dev runs the suite with local storage configured at the shell level.
    vi.stubEnv("AUDIO_STORAGE_DIR", "")
    vi.stubEnv("S3_ENDPOINT", "https://example")
    vi.stubEnv("S3_REGION", "auto")
    vi.stubEnv("S3_BUCKET", "")
    vi.stubEnv("S3_ACCESS_KEY_ID", "a")
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "b")
    const { getStorage, __setStorageForTests } = await import("@/src/lib/storage")
    __setStorageForTests(null)
    expect(() => getStorage()).toThrow(/S3_BUCKET/)
  })

  it("returns the cached fake when __setStorageForTests is used", async () => {
    const { getStorage, __setStorageForTests } = await import("@/src/lib/storage")
    const fake = {
      put: vi.fn(),
      delete: vi.fn(),
      signedReadUrl: vi.fn(),
    }
    __setStorageForTests(fake)
    expect(getStorage()).toBe(fake)
    __setStorageForTests(null)
  })
})
