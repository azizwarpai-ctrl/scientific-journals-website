import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { HelpContent } from "../schemas/help-schema"

type ResponseType = { success: boolean; data?: HelpContent; message?: string; error?: string }
type RequestType = { json: HelpContent }

export const useUpdateHelpContent = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }: RequestType): Promise<ResponseType> => {
      const response = await client.api.help.$put({ json })
      
      if (!response.ok) {
        let errorMessage = "Failed to update help content"
        try {
          const errorData = await response.json() as { error?: string }
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch {
            // Unlikely, but fallback is already set
          }
        }
        throw new Error(errorMessage)
      }
      
      return (await response.json()) as ResponseType
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success(data.message || "Help content updated successfully")
        queryClient.invalidateQueries({ queryKey: ["helpContent"] })
      } else {
        toast.error(data.error || "Failed to update help content")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
