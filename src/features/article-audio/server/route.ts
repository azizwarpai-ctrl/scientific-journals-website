import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"

import { requireAdmin } from "@/src/lib/auth-middleware"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { getStorage, StorageError } from "@/src/lib/storage"

import {
  ALLOWED_AUDIO_MIME_TYPES,
  articleAudioUploadFieldsSchema,
  articleAudioDeleteParamSchema,
} from "@/src/features/article-audio/schemas/article-audio-schema"

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_AUDIO_MIME_TYPES)

function getMaxBytes(): number {
  const raw = process.env.MAX_FILE_SIZE_MB
  const mb = raw ? Number.parseInt(raw, 10) : 50
  if (!Number.isFinite(mb) || mb <= 0) return 50 * 1024 * 1024
  return mb * 1024 * 1024
}

function buildStorageKey(ojsJournalId: string, submissionId: bigint, locale: string): string {
  const localeSegment = locale.length > 0 ? locale : "default"
  // Random suffix prevents key collisions on rapid replace and makes the
  // old object trivial to identify when a re-upload supersedes it.
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `article-audio/${ojsJournalId}/${submissionId.toString()}/${localeSegment}/${suffix}`
}

const app = new Hono()

// ─── GET /article-audio — Admin list (latest 100) ───────────────────────────
app.get("/", requireAdmin, async (c) => {
  const rows = await prisma.articleAudio.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
  })
  return c.json({ success: true, data: serializeMany(rows) })
})

// ─── POST /article-audio — Admin upload (multipart) ─────────────────────────
app.post("/", requireAdmin, async (c) => {
  // requireAdmin guarantees a session exists before reaching here.
  const session = c.get("session" as never) as { id: string }

  let body: Record<string, unknown>
  try {
    body = await c.req.parseBody()
  } catch {
    return c.json({ success: false, error: "Invalid multipart body" }, 400)
  }

  const file = body.file
  if (!(file instanceof File)) {
    return c.json({ success: false, error: "Missing 'file' field (multipart upload required)" }, 400)
  }

  const parsedFields = articleAudioUploadFieldsSchema.safeParse({
    ojs_journal_id: body.ojs_journal_id,
    submission_id: body.submission_id,
    locale: body.locale,
  })
  if (!parsedFields.success) {
    return c.json(
      {
        success: false,
        error: "Invalid form fields",
        details: parsedFields.error.flatten(),
      },
      400
    )
  }
  const { ojs_journal_id, submission_id, locale } = parsedFields.data

  if (!ALLOWED_MIME_SET.has(file.type)) {
    return c.json(
      {
        success: false,
        error: `Unsupported audio type '${file.type || "unknown"}'. Allowed: ${ALLOWED_AUDIO_MIME_TYPES.join(", ")}`,
      },
      400
    )
  }

  const maxBytes = getMaxBytes()
  if (file.size > maxBytes) {
    return c.json(
      {
        success: false,
        error: `File too large (${file.size} bytes). Maximum is ${maxBytes} bytes (MAX_FILE_SIZE_MB).`,
      },
      400
    )
  }

  const buffer = Buffer.from(await file.bytes())
  const storage = getStorage()
  const storageKey = buildStorageKey(ojs_journal_id, submission_id, locale)

  try {
    await storage.put(storageKey, buffer, { contentType: file.type, size: file.size })
  } catch (error) {
    const message = error instanceof StorageError ? error.message : "Storage put failed"
    console.error("[article-audio] storage put failed:", error)
    return c.json({ success: false, error: message }, 503)
  }

  // Upsert the row, deleting the previous object on replace. The DB write
  // happens AFTER the put so a failed upload never leaves a stale row.
  let previousStorageKey: string | null = null
  let saved
  try {
    saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.articleAudio.findUnique({
        where: {
          ojs_journal_id_submission_id_locale: { ojs_journal_id, submission_id, locale },
        },
      })
      previousStorageKey = existing?.storage_key ?? null

      return tx.articleAudio.upsert({
        where: {
          ojs_journal_id_submission_id_locale: { ojs_journal_id, submission_id, locale },
        },
        create: {
          ojs_journal_id,
          submission_id,
          locale,
          storage_key: storageKey,
          mime_type: file.type,
          size_bytes: BigInt(file.size),
          original_filename: file.name || "audio",
          uploaded_by: BigInt(session.id),
        },
        update: {
          storage_key: storageKey,
          mime_type: file.type,
          size_bytes: BigInt(file.size),
          original_filename: file.name || "audio",
          uploaded_by: BigInt(session.id),
        },
      })
    })
  } catch (dbError) {
    // DB upsert failed AFTER object was put — best-effort cleanup so we don't
    // leak the orphan object. Failure here is logged, not surfaced; the
    // primary failure the client sees is the DB error.
    console.error("[article-audio] upsert failed; cleaning up uploaded object:", dbError)
    try {
      await storage.delete(storageKey)
    } catch (cleanupError) {
      console.error("[article-audio] orphan cleanup also failed:", cleanupError)
    }
    return c.json({ success: false, error: "Failed to persist audio metadata" }, 500)
  }

  if (previousStorageKey && previousStorageKey !== storageKey) {
    // Fire-and-forget: do not block the response on superseded-object cleanup.
    void storage.delete(previousStorageKey).catch((cleanupError) => {
      console.warn("[article-audio] failed to delete superseded object", previousStorageKey, cleanupError)
    })
  }

  return c.json({ success: true, data: serializeRecord(saved) }, 200)
})

// ─── DELETE /article-audio/:id — Admin delete ───────────────────────────────
app.delete(
  "/:id",
  requireAdmin,
  zValidator("param", articleAudioDeleteParamSchema),
  async (c) => {
    const { id } = c.req.valid("param")
    const row = await prisma.articleAudio.findUnique({ where: { id: BigInt(id) } })
    if (!row) {
      return c.json({ success: false, error: "Not found" }, 404)
    }

    await prisma.articleAudio.delete({ where: { id: row.id } })

    try {
      await getStorage().delete(row.storage_key)
    } catch (cleanupError) {
      console.warn("[article-audio] failed to delete object on row delete", row.storage_key, cleanupError)
    }

    return c.json({ success: true })
  }
)

export { app as articleAudioRouter }
