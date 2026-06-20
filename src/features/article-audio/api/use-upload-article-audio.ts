"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ArticleAudioRecord } from "@/src/features/article-audio/types/article-audio-types"

export interface UploadArticleAudioInput {
  file: File
  ojsJournalId: string
  submissionId: string
  locale: string
}

function xhrUpload(
  input: UploadArticleAudioInput,
  onProgress: (pct: number) => void
): Promise<ArticleAudioRecord> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.set("file", input.file)
    formData.set("ojs_journal_id", input.ojsJournalId)
    formData.set("submission_id", input.submissionId)
    formData.set("locale", input.locale)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/article-audio")
    xhr.withCredentials = true

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as {
          success: boolean
          data?: ArticleAudioRecord
          error?: string
        }
        if (xhr.status >= 200 && xhr.status < 300 && json.success && json.data) {
          onProgress(100)
          resolve(json.data)
        } else {
          reject(new Error(json.error || `Upload failed (HTTP ${xhr.status})`))
        }
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.onabort = () => reject(new Error("Upload aborted"))

    xhr.send(formData)
  })
}

export function useUploadArticleAudio() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: (input: UploadArticleAudioInput) => xhrUpload(input, setProgress),
    onMutate: () => setProgress(0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-audio", "list"] })
    },
    onError: () => setProgress(0),
  })

  return { ...mutation, progress }
}
