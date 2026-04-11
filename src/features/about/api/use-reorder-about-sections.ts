import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useReorderAboutSections = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (sections: { id: string | number, display_order: number }[]) => {
            const response = await client.about.reorder.$post({ 
                json: { sections }
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error("error" in error ? error.error as string : "Failed to reorder sections")
            }
            return await response.json()
        },
        onSuccess: () => {
            // No toast needed for reordering as it can be spammy, just invalidate
            queryClient.invalidateQueries({ queryKey: ["about-sections"] })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}
