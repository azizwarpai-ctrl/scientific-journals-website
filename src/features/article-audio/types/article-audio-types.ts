/**
 * Serialized `ArticleAudio` shape returned by the admin upload route and
 * any listing endpoint. BigInts are stringified by `serializeRecord` so
 * the wire format is JSON-safe.
 */
export interface ArticleAudioRecord {
  id: string
  ojs_journal_id: string
  submission_id: string
  locale: string
  storage_key: string
  mime_type: string
  size_bytes: string
  original_filename: string
  duration_seconds: number | null
  uploaded_by: string
  created_at: string
  updated_at: string
}
