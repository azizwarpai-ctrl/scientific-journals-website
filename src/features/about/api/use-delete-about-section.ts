import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"

export const useDeleteAboutSection = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id }: { id: string | number }) => {
            const response = await client.about[":id"].$delete({ 
                param: { id: id.toString() }
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error("error" in error ? error.error as string : "Failed to delete section")
            }
            return await response.json()
        },
        onSuccess: () => {
            toast.success("Section deleted successfully")
            queryClient.invalidateQueries({ queryKey: ["about-sections"] })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}
