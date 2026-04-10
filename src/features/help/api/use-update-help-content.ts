import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { HelpContent } from "../schemas/help-schema"
import { InferRequestType, InferResponseType } from "hono"

type ResponseType = InferResponseType<typeof client.api.help.$put>
type RequestType = InferRequestType<typeof client.api.help.$put>

export const useUpdateHelpContent = () => {
  const queryClient = useQueryClient()

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.help.$put({ json })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error("error" in errorData ? errorData.error : "Failed to update help content")
      }
      
      return await response.json()
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message)
        queryClient.invalidateQueries({ queryKey: ["helpContent"] })
      } else {
        toast.error("Failed to update help content")
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
