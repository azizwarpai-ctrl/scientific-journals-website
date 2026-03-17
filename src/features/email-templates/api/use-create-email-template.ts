"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { parseRpcResponse } from "@/src/lib/rpc-utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { EmailTemplateCreate } from "../schemas/email-template-schema"

export function useCreateEmailTemplate() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ json }: { json: EmailTemplateCreate }) => {
      const res = await client["email-templates"].$post({ json })
      return parseRpcResponse(res, "Failed to create template")
    },
    onSuccess: () => {
      toast.success("Template created successfully")
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      router.push("/admin/email-templates")
    },
    onError: (error) => {
      console.error("Error creating template:", error)
      toast.error(error.message || "Failed to create template")
    }
  })
}
