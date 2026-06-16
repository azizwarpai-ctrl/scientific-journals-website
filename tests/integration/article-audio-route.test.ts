import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Hono } from "hono"

// ── Mock session ────────────────────────────────────────────────────────────
let mockSession: { id: bigint; email: string; role: string } | null = null
vi.mock("@/src/lib/db/auth", () => ({
  getSession: vi.fn(() => mockSession),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

// ── Mock Prisma ─────────────────────────────────────────────────────────────
const articleAudioMock = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
}

const prismaMock = {
  articleAudio: articleAudioMock,
  $transaction: vi.fn(async (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock)),
}
vi.mock("@/src/lib/db/config", () => ({ prisma: prismaMock }))

// ── Mock storage ────────────────────────────────────────────────────────────
const storagePut = vi.fn(async () => undefined)
const storageDelete = vi.fn(async () => undefined)
const storageMock = { put: storagePut, delete: storageDelete, signedReadUrl: vi.fn() }
vi.mock("@/src/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/storage")>("@/src/lib/storage")
  return {
    ...actual,
    getStorage: () => storageMock,
  }
})

const { articleAudioRouter } = await import("@/src/features/article-audio/server")

function buildApp() {
  return new Hono().route("/article-audio", articleAudioRouter)
}

function buildUploadBody(fields: {
  file?: { name: string; type: string; size?: number; bytes?: Uint8Array }
  ojs_journal_id?: string
  submission_id?: string
  locale?: string
}): FormData {
  const fd = new FormData()
  if (fields.file !== undefined) {
    const bytes = fields.file.bytes ?? new Uint8Array(fields.file.size ?? 4)
    const blob = new Blob([bytes], { type: fields.file.type })
    fd.set("file", blob, fields.file.name)
  }
  if (fields.ojs_journal_id !== undefined) fd.set("ojs_journal_id", fields.ojs_journal_id)
  if (fields.submission_id !== undefined) fd.set("submission_id", fields.submission_id)
  if (fields.locale !== undefined) fd.set("locale", fields.locale)
  return fd
}

beforeEach(() => {
  mockSession = null
  vi.clearAllMocks()
  articleAudioMock.findUnique.mockResolvedValue(null)
})

describe("POST /article-audio — auth", () => {
  it("returns 401 with no session", async () => {
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "a.mp3", type: "audio/mpeg" },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })
    expect(res.status).toBe(401)
  })

  it("returns 403 when session is not admin", async () => {
    mockSession = { id: 1n, email: "u@x.com", role: "reviewer" }
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "a.mp3", type: "audio/mpeg" },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })
    expect(res.status).toBe(403)
  })
})

describe("POST /article-audio — validation", () => {
  beforeEach(() => {
    mockSession = { id: 7n, email: "admin@x.com", role: "admin" }
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("rejects a non-audio mime with 400", async () => {
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "evil.exe", type: "application/octet-stream" },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { success: boolean; error: string }
    expect(json.success).toBe(false)
    expect(json.error).toMatch(/Unsupported audio type/i)
  })

  it("rejects oversize files with 400", async () => {
    vi.stubEnv("MAX_FILE_SIZE_MB", "1")
    const big = new Uint8Array(2 * 1024 * 1024) // 2 MB > 1 MB cap
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "big.mp3", type: "audio/mpeg", bytes: big },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: string }
    expect(json.error).toMatch(/too large/i)
  })

  it("rejects bad submission_id (non-positive integer) with 400", async () => {
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "a.mp3", type: "audio/mpeg" },
        ojs_journal_id: "12",
        submission_id: "0",
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rejects unknown locale format with 400", async () => {
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "a.mp3", type: "audio/mpeg" },
        ojs_journal_id: "12",
        submission_id: "200",
        locale: "english",
      }),
    })
    expect(res.status).toBe(400)
  })

  it("rejects missing 'file' field with 400", async () => {
    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({ ojs_journal_id: "12", submission_id: "200" }),
    })
    expect(res.status).toBe(400)
  })
})

describe("POST /article-audio — happy path & upsert", () => {
  beforeEach(() => {
    mockSession = { id: 7n, email: "admin@x.com", role: "admin" }
  })

  it("creates a new row, puts to storage, returns serialized record", async () => {
    articleAudioMock.findUnique.mockResolvedValue(null)
    articleAudioMock.upsert.mockResolvedValue({
      id: 42n,
      ojs_journal_id: "12",
      submission_id: 200n,
      locale: "",
      storage_key: "article-audio/12/200/default/x",
      mime_type: "audio/mpeg",
      size_bytes: 4n,
      original_filename: "a.mp3",
      duration_seconds: null,
      uploaded_by: 7n,
      created_at: new Date("2026-01-01T00:00:00Z"),
      updated_at: new Date("2026-01-01T00:00:00Z"),
    })

    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "a.mp3", type: "audio/mpeg", size: 4 },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })

    expect(res.status).toBe(200)
    expect(storagePut).toHaveBeenCalledTimes(1)
    expect(storageDelete).not.toHaveBeenCalled() // no prior object
    const json = (await res.json()) as { success: boolean; data: { id: string; size_bytes: string } }
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("42") // BigInt serialized
    expect(json.data.size_bytes).toBe("4")
  })

  it("replaces the existing row and deletes the old object on re-upload", async () => {
    articleAudioMock.findUnique.mockResolvedValue({
      id: 42n,
      ojs_journal_id: "12",
      submission_id: 200n,
      locale: "",
      storage_key: "article-audio/12/200/default/old-key",
      mime_type: "audio/mpeg",
      size_bytes: 4n,
      original_filename: "old.mp3",
      duration_seconds: null,
      uploaded_by: 7n,
      created_at: new Date(),
      updated_at: new Date(),
    })
    articleAudioMock.upsert.mockResolvedValue({
      id: 42n,
      ojs_journal_id: "12",
      submission_id: 200n,
      locale: "",
      storage_key: "article-audio/12/200/default/new-key",
      mime_type: "audio/mpeg",
      size_bytes: 8n,
      original_filename: "new.mp3",
      duration_seconds: null,
      uploaded_by: 7n,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "new.mp3", type: "audio/mpeg", size: 8 },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })

    expect(res.status).toBe(200)
    expect(storagePut).toHaveBeenCalledTimes(1)
    // Old object is deleted with the exact prior key
    expect(storageDelete).toHaveBeenCalledTimes(1)
    expect(storageDelete.mock.calls[0][0]).toBe("article-audio/12/200/default/old-key")
  })

  it("cleans up the uploaded object when the DB upsert fails", async () => {
    articleAudioMock.findUnique.mockResolvedValue(null)
    articleAudioMock.upsert.mockRejectedValue(new Error("FK violation"))

    const res = await buildApp().request("/article-audio", {
      method: "POST",
      body: buildUploadBody({
        file: { name: "a.mp3", type: "audio/mpeg", size: 4 },
        ojs_journal_id: "12",
        submission_id: "200",
      }),
    })

    expect(res.status).toBe(500)
    expect(storagePut).toHaveBeenCalledTimes(1)
    // The just-uploaded object is deleted to avoid an orphan
    expect(storageDelete).toHaveBeenCalledTimes(1)
  })
})

describe("DELETE /article-audio/:id", () => {
  beforeEach(() => {
    mockSession = { id: 7n, email: "admin@x.com", role: "admin" }
  })

  it("returns 404 when the row does not exist", async () => {
    articleAudioMock.findUnique.mockResolvedValue(null)
    const res = await buildApp().request("/article-audio/42", { method: "DELETE" })
    expect(res.status).toBe(404)
  })

  it("deletes the row and the object", async () => {
    articleAudioMock.findUnique.mockResolvedValue({
      id: 42n,
      storage_key: "article-audio/12/200/default/x",
    })
    articleAudioMock.delete.mockResolvedValue({})

    const res = await buildApp().request("/article-audio/42", { method: "DELETE" })
    expect(res.status).toBe(200)
    expect(articleAudioMock.delete).toHaveBeenCalledWith({ where: { id: 42n } })
    expect(storageDelete).toHaveBeenCalledWith("article-audio/12/200/default/x")
  })

  it("returns 401 with no session", async () => {
    mockSession = null
    const res = await buildApp().request("/article-audio/42", { method: "DELETE" })
    expect(res.status).toBe(401)
  })

  it("returns 403 when session is not admin", async () => {
    mockSession = { id: 1n, email: "u@x.com", role: "editor" }
    const res = await buildApp().request("/article-audio/42", { method: "DELETE" })
    expect(res.status).toBe(403)
  })
})
