"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import { toast } from "sonner"

import { type EmailTemplateUpdate } from "@/src/features/email-templates/schemas/email-template-schema"

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ param, json }: { param: { id: string }, json: EmailTemplateUpdate }) => {
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
