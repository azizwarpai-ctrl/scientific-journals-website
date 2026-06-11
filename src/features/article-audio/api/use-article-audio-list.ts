"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import type { ArticleAudioRecord } from "@/src/features/article-audio/types/article-audio-types"

export function useArticleAudioList() {
  return useQuery({
    queryKey: ["article-audio", "list"],
    queryFn: async () => {
      const res = await client["article-audio"].$get()
      const body = await parseRpcResponse<{ success: boolean; data: ArticleAudioRecord[] }>(
        res,
        "Failed to load audio list"
      )
      return body.data
    },
    staleTime: 60 * 1000,
  })
}
