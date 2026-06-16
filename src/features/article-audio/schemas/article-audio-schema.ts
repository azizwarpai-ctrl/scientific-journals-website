import { z } from "zod"

/**
 * Allowed audio MIME types for upload. Five entries for four formats: WAV
 * appears twice (`audio/wav` + `audio/x-wav`) for browser compatibility.
 * Restricted to formats every modern browser plays natively through `<audio>`,
 * matching the player B3 will ship without transcoding.
 */
export const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/mpeg", // .mp3
  "audio/mp4",  // .m4a / .mp4 audio
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
] as const

export type AllowedAudioMimeType = (typeof ALLOWED_AUDIO_MIME_TYPES)[number]

/**
 * Locale shape. Either OJS-style `en_US` / `ar_SA`, or the empty-string
 * sentinel for the unilingual case. We do NOT accept arbitrary strings —
 * the column is part of the unique index and must stay clean.
 */
export const localeSchema = z
  .string()
  .max(14)
  .regex(/^$|^[a-z]{2}(_[A-Z]{2})?$/, "Locale must be OJS-style like 'en_US' or empty for default")

/**
 * Multipart fields the upload route expects. These are the *form-field*
 * shapes; the file itself is handled separately by `c.req.parseBody()`.
 */
export const articleAudioUploadFieldsSchema = z.object({
  ojs_journal_id: z.string().min(1).max(50),
  submission_id: z
    .string()
    .regex(/^[1-9]\d*$/, "submission_id must be a positive integer")
    .transform((v) => BigInt(v)),
  locale: localeSchema.default(""),
})

export type ArticleAudioUploadFields = z.infer<typeof articleAudioUploadFieldsSchema>

export const articleAudioDeleteParamSchema = z.object({
  id: z.string().regex(/^[1-9]\d*$/),
})
