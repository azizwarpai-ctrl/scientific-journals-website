"use client"

import { useCallback } from "react"
import { openLoginModal } from "@/components/auth/login-modal-bus"
import { useIdentity } from "./use-identity"

interface UseGatedActionOptions {
    isOpenAccess: boolean
}

/**
 * Wraps a callback with the OA-aware gate.
 *
 * - OA article OR signed-in user → callback runs normally.
 * - Non-OA AND anonymous → openLoginModal is fired; callback is suppressed.
 *
 * Returns `{ run, gated }` so callers can render different UI states.
 */
export function useGatedAction<TArgs extends unknown[]>(
    action: (...args: TArgs) => void,
    options: UseGatedActionOptions
) {
    const { data, isLoading } = useIdentity()
    const isAuthenticated = data?.authenticated === true

    const run = useCallback(
        (...args: TArgs) => {
            // While identity is unknown (loading), be conservative: gate non-OA.
            if (!options.isOpenAccess && !isAuthenticated) {
                openLoginModal({
                    return_url:
                        typeof window !== "undefined" ? window.location.href : "/",
                })
                return
            }
            action(...args)
        },
        [action, options.isOpenAccess, isAuthenticated]
    )

    return {
        run,
        gated: !options.isOpenAccess && !isAuthenticated && !isLoading,
    }
}
