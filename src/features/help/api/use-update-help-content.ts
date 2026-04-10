import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { HelpContent } from "../schemas/help-schema"
<<<<<<< HEAD

type ResponseType = { success: boolean; data?: HelpContent; message?: string; error?: string }
type RequestType = { json: HelpContent }
=======
>>>>>>> hel

export const useUpdateHelpContent = () => {
  const queryClient = useQueryClient()

<<<<<<< HEAD
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
        } catch (e) {
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch (e2) {
            // Unlikely, but fallback is already set
          }
        }
        throw new Error(errorMessage)
=======
  return useMutation({
    mutationFn: async (data: HelpContent) => {
      const response = await client.help.$put({ json: data })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update help content")
>>>>>>> hel
      }
      
      return (await response.json()) as ResponseType
    },
    onSuccess: (data: any) => {
      if (data.success) {
<<<<<<< HEAD
        toast.success(data.message || "Help content updated successfully")
        queryClient.invalidateQueries({ queryKey: ["helpContent"] })
=======
        toast.success(data.message || "Help content updated")
        queryClient.invalidateQueries({ queryKey: ["help-content"] })
>>>>>>> hel
      } else {
        toast.error(data.error || "Failed to update help content")
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

