import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { JournalResponse } from "../types/journal-type"
import type { JournalCreate } from "../schemas/journal-schema"

export function useCreateJournal() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: JournalCreate): Promise<JournalResponse> => {
            const response = await fetch("/api/journals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Failed to create journal")
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["journals"] })
        },
    })
}
