import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Faq } from "@/src/features/faq/types/faq-type"
import type { FaqCreate, FaqUpdate } from "@/src/features/faq/schemas/faq-schema"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useGetFaqs = (page = 1, limit = 10) => {
    return useQuery<{ data: Faq[], pagination: { total: number, page: number, limit: number } }, Error>({
        queryKey: ["faqs", page, limit],
        queryFn: async () => {
            const response = await client.faqs.$get({
                query: { page: page.toString(), limit: limit.toString() }
            })

            if (!response.ok) {
                const error = await response.json() as { error?: string }
                throw new Error(error.error || "Failed to fetch FAQs")
            }

            return await response.json()
        },
        staleTime: 5 * 60 * 1000,
    })
}

export const useCreateFaq = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (json: FaqCreate) => {
            const response = await client.faqs.$post({ json })

            if (!response.ok) {
                const error = await response.json() as { error?: string }
                throw new Error(error.error || "Failed to create FAQ")
            }

            return await response.json()
        },
        onSuccess: () => {
            toast.success("FAQ created successfully")
            queryClient.invalidateQueries({ queryKey: ["faqs"] })
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })
}

export const useUpdateFaq = (id: string) => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (json: FaqUpdate) => {
            const response = await client.faqs[":id"].$patch({ 
                param: { id },
                json 
            })

            if (!response.ok) {
                const error = await response.json() as { error?: string }
                throw new Error(error.error || "Failed to update FAQ")
            }

            return await response.json()
        },
        onSuccess: () => {
            toast.success("FAQ updated successfully")
            queryClient.invalidateQueries({ queryKey: ["faqs"] })
            queryClient.invalidateQueries({ queryKey: ["faq", id] })
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })
}

export const useDeleteFaq = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await client.faqs[":id"].$delete({ 
                param: { id }
            })

            if (!response.ok) {
                const error = await response.json() as { error?: string }
                throw new Error(error.error || "Failed to delete FAQ")
            }

            return await response.json()
        },
        onSuccess: () => {
            toast.success("FAQ deleted successfully")
            queryClient.invalidateQueries({ queryKey: ["faqs"] })
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })
}
