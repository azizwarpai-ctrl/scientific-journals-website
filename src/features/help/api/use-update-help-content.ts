import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { HelpContent } from "../schemas/help-schema"

type ResponseType = { success: boolean; data?: HelpContent; message?: string; error?: string }
type RequestType = { json: HelpContent }

export const useUpdateHelpContent = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.help.$put({ json })
      
      if (!response.ok) {
        const errorData = await response.json() as { error?: string }
        throw new Error(errorData.error ? errorData.error : "Failed to update help content")
      }
      
      return (await response.json()) as ResponseType
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || "Help content updated successfully")
        queryClient.invalidateQueries({ queryKey: ["helpContent"] })
      } else {
        toast.error(data.error || "Failed to update help content")
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
