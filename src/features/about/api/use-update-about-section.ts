import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import { type AboutSection } from "../schema"

export const useUpdateAboutSection = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, json }: { id: string | number, json: AboutSection }) => {
            const response = await client.about[":id"].$put({ 
                param: { id: id.toString() },
                json 
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error("error" in error ? error.error as string : "Failed to update section")
            }
            const { data } = await response.json()
            return data
        },
        onSuccess: () => {
            toast.success("Section updated successfully")
            queryClient.invalidateQueries({ queryKey: ["about-sections"] })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}
