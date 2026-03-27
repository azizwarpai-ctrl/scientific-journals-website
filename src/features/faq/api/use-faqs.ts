import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Faq } from "../types/faq-type"
import type { FaqCreate, FaqUpdate } from "../schemas/faq-schema"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useGetFaqs = () => {
    return useQuery<Faq[], Error>({
        queryKey: ["faqs"],
        queryFn: async () => {
            const response = await client.faqs.$get()

            if (!response.ok) {
                const error = await response.json() as { error?: string }
                throw new Error(error.error || "Failed to fetch FAQs")
            }

            const { data } = await response.json()
            return data as Faq[]
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
