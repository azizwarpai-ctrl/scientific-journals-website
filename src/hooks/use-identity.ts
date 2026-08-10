"use client"

import { useQuery } from "@tanstack/react-query"

export interface PublicIdentity {
    authenticated: true
    orcid: string
    ojs_user_id: number | null
    exp_sliding: number
    exp_absolute: number
    /** Whether the server has the ORCID OAuth stack configured. */
    orcid_available?: boolean
}

export interface AnonymousIdentity {
    authenticated: false
    orcid_available?: boolean
}

export type IdentityResult = PublicIdentity | AnonymousIdentity

async function fetchWhoami(): Promise<IdentityResult> {
    const res = await fetch("/api/auth/orcid/whoami", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
    })
    if (!res.ok) {
        // Network/server hiccup: don't hide the sign-in UI on transient errors.
        return { authenticated: false, orcid_available: true }
    }
    const json = (await res.json()) as IdentityResult
    return json
}

/**
 * React Query hook returning the current public-user identity.
 * Always 200 from the server; `authenticated: false` for anonymous visitors.
 *
 * `orcidAvailable` is false ONLY when whoami explicitly reports the ORCID
 * stack as unconfigured; while loading or on fetch errors it stays true.
 */
export function useIdentity() {
    const query = useQuery<IdentityResult>({
        queryKey: ["public-identity"],
        queryFn: fetchWhoami,
        staleTime: 5 * 60 * 1000,
        retry: false,
    })
    const orcidAvailable = query.data?.orcid_available !== false
    return { ...query, orcidAvailable }
}
