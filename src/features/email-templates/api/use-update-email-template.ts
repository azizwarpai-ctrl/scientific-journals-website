"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import { toast } from "sonner"

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ param, json }: { param: { id: string }, json: any }) => {
      const res = await client["email-templates"][":id"].$patch({ param, json })
      return parseRpcResponse(res, "Failed to update template")
    },
    onSuccess: (data, variables) => {
      toast.success("Template updated successfully")
      queryClient.invalidateQueries({ queryKey: ["email-template", variables.param.id] })
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
    },
    onError: (error: Error) => {
      console.error("Error updating template:", error)
      toast.error(error.message || "Failed to update template")
    },
  })
}
