import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, PlugZap } from "lucide-react"

interface OjsStatusBannerProps {
    state: "unconfigured" | "unavailable"
}

/**
 * Degraded-state banner for the arbitration panel (spec FR-017).
 * Rendered when the OJS database is not configured or unreachable — the
 * panel never crashes or spins forever in these states.
 */
export function OjsStatusBanner({ state }: OjsStatusBannerProps) {
    if (state === "unconfigured") {
        return (
            <Alert>
                <PlugZap className="h-4 w-4" />
                <AlertTitle>OJS not configured</AlertTitle>
                <AlertDescription>
                    The OJS database connection is not configured on this environment
                    (OJS_DATABASE_* missing). Review data will appear here once the
                    connection is set up.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>OJS unavailable</AlertTitle>
            <AlertDescription>
                The OJS database could not be reached. Review data is temporarily
                unavailable — retry in a moment. Editorial work continues in OJS.
            </AlertDescription>
        </Alert>
    )
}
