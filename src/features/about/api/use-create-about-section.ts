import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { toast } from "sonner"
import { type AboutSection } from "../schema"

export const useCreateAboutSection = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (json: AboutSection) => {
            const response = await client.about.index.$post({ json })
            if (!response.ok) {
                const error = await response.json()
                throw new Error("error" in error ? error.error as string : "Failed to create section")
            }
            const { data } = await response.json()
            return data
        },
        onSuccess: () => {
            toast.success("Section created successfully")
            queryClient.invalidateQueries({ queryKey: ["about-sections"] })
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })
}
