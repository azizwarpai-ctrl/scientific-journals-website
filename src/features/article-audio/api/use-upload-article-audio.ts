"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ArticleAudioRecord } from "@/src/features/article-audio/types/article-audio-types"

export interface UploadArticleAudioInput {
  file: File
  ojsJournalId: string
  submissionId: string
  locale: string
}

/**
 * Posts a multipart upload to /api/article-audio. The Hono RPC client cannot
 * type multipart bodies as cleanly as JSON, so we hit fetch directly. The
 * `requireAdmin` cookie-based session is sent automatically by the browser.
 */
export function useUploadArticleAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UploadArticleAudioInput): Promise<ArticleAudioRecord> => {
      const formData = new FormData()
      formData.set("file", input.file)
      formData.set("ojs_journal_id", input.ojsJournalId)
      formData.set("submission_id", input.submissionId)
      formData.set("locale", input.locale)

      const res = await fetch("/api/article-audio", { method: "POST", body: formData })
      const json = (await res.json()) as { success: boolean; data?: ArticleAudioRecord; error?: string }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Upload failed (HTTP ${res.status})`)
      }
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-audio", "list"] })
    },
  })
}
