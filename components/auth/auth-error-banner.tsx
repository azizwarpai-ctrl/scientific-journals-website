"use client"

/**
 * Hotfix A3: global banner that surfaces ORCID sign-in outcomes delivered
 * via redirect query params (`?auth_error=<CODE>` from the OAuth callback,
 * `?signin=unavailable` from a degraded /start). Shows a sonner toast once,
 * then strips the params from the URL so refreshes don't re-toast.
 */

import { Suspense, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    RATE_LIMITED: "Too many sign-in attempts, please wait a moment.",
    STATE_REUSED: "Sign-in already completed; please retry.",
    STATE_EXPIRED: "Sign-in session expired; please retry.",
    INVALID_STATE: "Invalid sign-in session. Please try again.",
    INVALID_REQUEST: "Sign-in request was incomplete. Please try again.",
    ORCID_API_FAILURE: "ORCID is temporarily unavailable. Please try again later.",
    INVALID_TOKEN: "ORCID returned an invalid response. Please try again.",
    ACCOUNT_DISABLED: "This account has been disabled. Please contact support.",
}

const GENERIC_ERROR_MESSAGE = "Sign-in failed. Please try again."
const SIGNIN_UNAVAILABLE_MESSAGE = "ORCID sign-in is temporarily unavailable."

function AuthErrorBannerInner() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const firedRef = useRef(false)

    const authError = searchParams.get("auth_error")
    const signin = searchParams.get("signin")

    useEffect(() => {
        if (!authError && signin !== "unavailable") return
        if (firedRef.current) return
        firedRef.current = true

        if (authError) {
            toast.error(AUTH_ERROR_MESSAGES[authError] ?? GENERIC_ERROR_MESSAGE)
        } else {
            toast.info(SIGNIN_UNAVAILABLE_MESSAGE)
        }

        // Strip only our params; keep any others intact.
        const remaining = new URLSearchParams(searchParams.toString())
        remaining.delete("auth_error")
        remaining.delete("signin")
        const qs = remaining.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [authError, signin, searchParams, pathname, router])

    return null
}

/**
 * Suspense wrapper — useSearchParams triggers a CSR bailout in Next 16 when
 * used outside a Suspense boundary in a layout-mounted component.
 */
export function AuthErrorBanner() {
    return (
        <Suspense fallback={null}>
            <AuthErrorBannerInner />
        </Suspense>
    )
}
