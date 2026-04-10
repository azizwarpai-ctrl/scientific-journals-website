import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { HelpArticle } from "@/src/features/help-articles/types/help-article-type"
import type {
  HelpArticleCreate,
  HelpArticleUpdate,
} from "@/src/features/help-articles/schemas/help-article-schema"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useGetHelpArticles = (page = 1, limit = 20) => {
  return useQuery<
    { data: HelpArticle[]; pagination: { total: number; page: number; limit: number } },
    Error
  >({
    queryKey: ["help-articles", page, limit],
    queryFn: async () => {
      const response = await client["help-articles"].$get({
        query: { page: page.toString(), limit: limit.toString() },
      })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error || "Failed to fetch help articles")
      }

      return await response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const useGetHelpArticle = (id: string) => {
  return useQuery<{ data: HelpArticle }, Error>({
    queryKey: ["help-article", id],
    queryFn: async () => {
      const response = await client["help-articles"][":id"].$get({
        param: { id },
      })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error || "Failed to fetch help article")
      }

      return await response.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useCreateHelpArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (json: HelpArticleCreate) => {
      const response = await client["help-articles"].$post({ json })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error || "Failed to create help article")
      }

      return await response.json()
    },
    onSuccess: () => {
      toast.success("Help article created successfully")
      queryClient.invalidateQueries({ queryKey: ["help-articles"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export const useUpdateHelpArticle = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (json: HelpArticleUpdate) => {
      const response = await client["help-articles"][":id"].$patch({
        param: { id },
        json,
      })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error || "Failed to update help article")
      }

      return await response.json()
    },
    onSuccess: () => {
      toast.success("Help article updated successfully")
      queryClient.invalidateQueries({ queryKey: ["help-articles"] })
      queryClient.invalidateQueries({ queryKey: ["help-article", id] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export const useDeleteHelpArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await client["help-articles"][":id"].$delete({
        param: { id },
      })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error || "Failed to delete help article")
      }

      return await response.json()
    },
    onSuccess: () => {
      toast.success("Help article deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["help-articles"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
