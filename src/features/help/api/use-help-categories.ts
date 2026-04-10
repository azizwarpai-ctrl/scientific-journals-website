import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import type { HelpCategoryFormValues } from "../schemas/help-category-schema"

export const useGetHelpCategories = () => {
  return useQuery({
    queryKey: ["help-categories"],
    queryFn: async () => {
      const res = await client["help-categories"].$get()
      if (!res.ok) throw new Error("Failed to fetch help categories")
      const json = await res.json()
      return json.data ?? []
    },
  })
}

export const useCreateHelpCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: HelpCategoryFormValues) => {
      const res = await client["help-categories"].$post({ json: values })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to create help category")
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
      toast.success("Help category created")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create help category")
    },
  })
}

export const useUpdateHelpCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: HelpCategoryFormValues }) => {
      const res = await client["help-categories"][":id"].$put({ 
        param: { id },
        json: values 
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to update help category")
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
      toast.success("Help category updated")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update help category")
    },
  })
}

export const useDeleteHelpCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await client["help-categories"][":id"].$delete({ param: { id } })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to delete help category")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["help-categories"] })
      toast.success("Help category deleted")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete help category")
    },
  })
}
