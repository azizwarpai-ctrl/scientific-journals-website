import { useMutation, useQueryClient } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { type AboutContent } from "../schema"

export const useUpdateAboutContent = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (json: AboutContent) => {
            const response = await client.about.$put({ json })
            if (!response.ok) {
                throw new Error("Failed to update about content")
            }
            const { data } = await response.json()
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["about-content"] })
        },
    })
}
