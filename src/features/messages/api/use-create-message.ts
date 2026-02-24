import { useMutation } from "@tanstack/react-query"
import type { MessageCreate } from "../schemas/message-schema"
import type { MessageResponse } from "../types/message-type"

export function useCreateMessage() {
    return useMutation({
        mutationFn: async (input: MessageCreate): Promise<MessageResponse> => {
            const response = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Failed to send message")
            }
            return data
        },
    })
}
