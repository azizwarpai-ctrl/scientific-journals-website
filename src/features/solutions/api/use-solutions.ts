import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SolutionResponse } from "../types/solution-type"
import type { SolutionCreate } from "../schemas/solution-schema"

export function useGetSolutions() {
    return useQuery<SolutionResponse>({
        queryKey: ["solutions"],
        queryFn: async () => {
            const response = await fetch("/api/solutions")
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch solutions")
            }
            return data
        },
    })
}

export function useCreateSolution() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: SolutionCreate): Promise<SolutionResponse> => {
            const response = await fetch("/api/solutions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.error || "Failed to create solution")
            }
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["solutions"] })
        },
    })
}
