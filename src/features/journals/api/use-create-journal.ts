import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { JournalResponse } from "../types/journal-type"
import type { JournalCreate } from "../schemas/journal-schema"

import { client } from "@/src/lib/rpc"

export function useCreateJournal() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: JournalCreate): Promise<JournalResponse> => {
            const response = await client.api.journals.$post({
                json: input,
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error((data as any).error || "Failed to create journal")
            }
            return data as JournalResponse
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journals"] })
        },
    })
}
