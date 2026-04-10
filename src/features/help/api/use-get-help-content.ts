import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { type HelpContent } from "../schemas/help-schema"

export const useGetHelpContent = () => {
    return useQuery({
        queryKey: ["help-content"],
        queryFn: async () => {
            const response = await client.help.$get()
            if (!response.ok) {
                throw new Error("Failed to fetch help content")
            }
            const json = await response.json()
            return json.data as HelpContent
        },
        staleTime: 5 * 60 * 1000,
    })
}

