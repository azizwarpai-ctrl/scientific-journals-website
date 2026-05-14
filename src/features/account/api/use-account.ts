"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface AccountStats {
    orcid: string
    lifetime: {
        views: number
        downloads: number
        citations: number
        first_seen_at: string | null
        last_event_at: string | null
    }
    monthly: Array<{
        year: number
        month: number
        views: number
        downloads: number
        citations: number
    }>
}

export function useAccountStats() {
    return useQuery<{ success: true; data: AccountStats } | { success: false; error: string }>({
        queryKey: ["account-stats"],
        queryFn: async () => {
            const res = await fetch("/api/account/stats", { credentials: "same-origin" })
            if (res.status === 401) return { success: false, error: "UNAUTHENTICATED" }
            return (await res.json()) as { success: true; data: AccountStats }
        },
        retry: false,
    })
}

export function useDeleteAccountData() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/account/data", {
                method: "DELETE",
                credentials: "same-origin",
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error || `Delete failed: ${res.status}`)
            }
            return res.json()
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["public-identity"] })
            qc.invalidateQueries({ queryKey: ["account-stats"] })
        },
    })
}
