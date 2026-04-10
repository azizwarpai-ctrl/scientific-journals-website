import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

interface TopicPayload {
  categoryId: string
  title: string
  content: string
  order: number
  isActive: boolean
}

export const useCreateHelpTopic = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: TopicPayload) => {
      const res = await client["help-topics"].$post({ json: values })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to create help topic")
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
      toast.success("Help topic created")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create help topic")
    },
  })
}

export const useUpdateHelpTopic = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TopicPayload }) => {
      const res = await client["help-topics"][":id"].$put({ 
        param: { id },
        json: values 
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to update help topic")
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
      toast.success("Help topic updated")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update help topic")
    },
  })
}

export const useDeleteHelpTopic = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client["help-topics"][":id"].$delete({ param: { id } })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to delete help topic")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
      toast.success("Help topic deleted")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete help topic")
    },
  })
}

export const useReorderHelpTopics = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ categoryId, topicIds }: { categoryId: string; topicIds: string[] }) => {
      const res = await client["help-topics"]["reorder"][":categoryId"].$put({
        param: { categoryId },
        json: { topicIds }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to reorder help topics")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reorder help topics")
    },
  })
}

