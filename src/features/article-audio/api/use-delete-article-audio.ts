"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useDeleteArticleAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/article-audio/${id}`, { method: "DELETE" })
      const json = (await res.json()) as { success: boolean; error?: string }
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Delete failed (HTTP ${res.status})`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article-audio", "list"] })
    },
  })
}
