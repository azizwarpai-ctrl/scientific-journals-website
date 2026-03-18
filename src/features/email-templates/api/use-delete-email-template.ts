"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import { toast } from "sonner"

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await client["email-templates"][":id"].$delete({ param: { id } })
      return parseRpcResponse(res, "Failed to delete template")
    },
    onSuccess: () => {
      toast.success("Template deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
    },
    onError: (error: Error) => {
      console.error("Error deleting template:", error)
      toast.error(error.message || "Failed to delete template")
    },
  })
}
