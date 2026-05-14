"use client"

import { useQuery } from "@tanstack/react-query"

export interface PublicIdentity {
    authenticated: true
    orcid: string
    ojs_user_id: number | null
    exp_sliding: number
    exp_absolute: number
}

export interface AnonymousIdentity {
    authenticated: false
}

export type IdentityResult = PublicIdentity | AnonymousIdentity

async function fetchWhoami(): Promise<IdentityResult> {
    const res = await fetch("/api/auth/orcid/whoami", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
    })
    if (!res.ok) {
        return { authenticated: false }
    }
    const json = (await res.json()) as IdentityResult
    return json
}

/**
 * React Query hook returning the current public-user identity.
 * Always 200 from the server; `authenticated: false` for anonymous visitors.
 */
export function useIdentity() {
    return useQuery<IdentityResult>({
        queryKey: ["public-identity"],
        queryFn: fetchWhoami,
        staleTime: 5 * 60 * 1000,
        retry: false,
    })
}
