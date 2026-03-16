"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"

export function useGetEmailTemplate(id: string) {
  return useQuery({
    queryKey: ["email-template", id],
    queryFn: async () => {
      const res = await client["email-templates"][":id"].$get({ param: { id } })
      return parseRpcResponse<{ data: any, success: boolean }>(res, "Failed to fetch email template")
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
