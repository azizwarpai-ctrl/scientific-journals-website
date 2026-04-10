import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { HelpContent } from "../schemas/help-schema"

export const useUpdateHelpContent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: HelpContent) => {
      const response = await client.help.$put({ json: data })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update help content")
      }
      
      return await response.json()
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success(data.message || "Help content updated")
        queryClient.invalidateQueries({ queryKey: ["help-content"] })
      } else {
        toast.error("Failed to update help content")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

