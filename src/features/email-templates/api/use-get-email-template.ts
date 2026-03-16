"use client"

import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"

export function useGetEmailTemplate(id: string) {
  return useQuery({
    queryKey: ["email-template", id],
    queryFn: async () => {
      const res = await client["email-templates"][":id"].$get({ param: { id } })
      if (!res.ok) throw new Error("Failed to fetch email template")
      return res.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
