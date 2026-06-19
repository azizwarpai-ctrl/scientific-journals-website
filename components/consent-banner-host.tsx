import { getFlagsEnv } from "@/src/lib/env"
import { ConsentBanner } from "./consent-banner"

/**
 * Server-component wrapper that reads UIET_P1_ENABLED once at render time
 * and gates the client banner accordingly. When the flag is off, nothing
 * is rendered and no client JS is loaded for the banner.
 */
export function ConsentBannerHost() {
    let enabled = false
    try {
        enabled = getFlagsEnv().UIET_P1_ENABLED
    } catch {
        enabled = false
    }
    if (!enabled) return null
    return <ConsentBanner enabled />
}
