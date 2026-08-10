"use client"

/**
 * Hotfix A3: shared anonymous-state card for /account/* pages.
 *
 * Replaces the old auto-redirect to /api/auth/orcid/start (a dead-end when
 * ORCID secrets are absent in production). Shows an explicit sign-in button
 * when ORCID is configured, and a muted unavailability notice otherwise.
 */

import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { useIdentity } from "@/src/hooks/use-identity"

export function OrcidSignInCard({ returnUrl }: { returnUrl: string }) {
    const { orcidAvailable } = useIdentity()

    if (!orcidAvailable) {
        return (
            <Card className="bg-muted/40">
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        ORCID sign-in is temporarily unavailable. Please try again later.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sign in required</CardTitle>
                <CardDescription>
                    Sign in with your ORCID iD to view and manage the engagement data
                    attributed to you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="font-semibold">
                    <a
                        href={`/api/auth/orcid/start?return_url=${encodeURIComponent(returnUrl)}`}
                    >
                        <LogIn className="h-4 w-4" />
                        Sign in with ORCID
                    </a>
                </Button>
            </CardContent>
        </Card>
    )
}
