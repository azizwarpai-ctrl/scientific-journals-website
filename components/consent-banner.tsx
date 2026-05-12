"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Shield, X } from "lucide-react"

/**
 * Public-user consent banner. Reads digitopub_consent cookie client-side to
 * decide whether to show. Persists via the /api/consent endpoint so the
 * cookie is set with httpOnly=false but server-validated. When the user has
 * dismissed too many times without choosing, the banner is modal-locked.
 *
 * The component is rendered globally from app/layout.tsx and gated behind
 * UIET_P1_ENABLED. While the flag is off it renders nothing.
 */

const CONSENT_COOKIE = "digitopub_consent"
const FORCE_THRESHOLD = 31

type Choice = "all" | "essential_only" | "customize"

interface ConsentSnapshot {
    choice: Choice | null
    dismiss_count: number
    granular?: { analytics: boolean; personalization: boolean } | null
}

function readConsent(): ConsentSnapshot | null {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]+)`))
    if (!match) return null
    try {
        const raw = decodeURIComponent(match[1])
        // base64url -> JSON
        const padded = raw.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (raw.length % 4)) % 4)
        const json = JSON.parse(atob(padded))
        if (!json || typeof json !== "object") return null
        return {
            choice: json.choice ?? null,
            dismiss_count: typeof json.dismiss_count === "number" ? json.dismiss_count : 0,
            granular: json.granular ?? null,
        }
    } catch {
        return null
    }
}

async function persistChoice(
    choice: Choice,
    granular?: { analytics: boolean; personalization: boolean }
): Promise<void> {
    await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, granular }),
        credentials: "same-origin",
    }).catch(() => {
        /* network failure — banner stays visible, user can retry */
    })
}

async function persistDismiss(): Promise<void> {
    await fetch("/api/consent/dismiss", {
        method: "POST",
        credentials: "same-origin",
    }).catch(() => {})
}

interface ConsentBannerProps {
    /** When false, render nothing. Set by the master flag in the parent. */
    enabled?: boolean
}

export function ConsentBanner({ enabled = true }: ConsentBannerProps) {
    const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null)
    const [hydrated, setHydrated] = useState(false)
    const [showCustomize, setShowCustomize] = useState(false)
    const [analytics, setAnalytics] = useState(true)
    const [personalization, setPersonalization] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        setSnapshot(readConsent())
        setHydrated(true)
    }, [])

    const visible = useMemo(() => {
        if (!enabled || !hydrated) return false
        if (snapshot?.choice) return false
        return true
    }, [enabled, hydrated, snapshot])

    const forceChoice = (snapshot?.dismiss_count ?? 0) >= FORCE_THRESHOLD

    if (!visible) return null

    const choose = async (choice: Choice) => {
        setSubmitting(true)
        try {
            if (choice === "customize") {
                await persistChoice("customize", { analytics, personalization })
            } else {
                await persistChoice(choice)
            }
            setSnapshot({ choice, dismiss_count: snapshot?.dismiss_count ?? 0 })
        } finally {
            setSubmitting(false)
        }
    }

    const dismiss = async () => {
        await persistDismiss()
        // Hide for this paint; cookie will reflect new dismiss_count next reload.
        setSnapshot({
            choice: null,
            dismiss_count: (snapshot?.dismiss_count ?? 0) + 1,
        })
    }

    return (
        <div
            role="dialog"
            aria-modal={forceChoice}
            aria-label="Privacy and cookie consent"
            data-locked={forceChoice ? "true" : "false"}
            data-testid="consent-banner"
            className="fixed bottom-0 inset-x-0 z-[200] flex justify-center px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none"
        >
            {forceChoice ? (
                <div
                    aria-hidden="true"
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto"
                />
            ) : null}
            <div className="relative z-10 w-full max-w-[860px] rounded-2xl border border-border/60 bg-card shadow-xl pointer-events-auto">
                <div className="p-4 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <h2 className="text-sm sm:text-base font-bold leading-tight">
                                We respect your privacy
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                We record anonymous engagement (views, downloads, citations) to
                                improve discovery and help journals see their reach. Choose
                                what we may collect. You can change this at any time in your
                                account settings.
                            </p>
                        </div>
                        {!forceChoice && (
                            <button
                                type="button"
                                aria-label="Dismiss for now"
                                onClick={dismiss}
                                disabled={submitting}
                                className="ml-1 h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {showCustomize && (
                        <div className="mt-4 grid gap-3 rounded-lg border border-border/40 bg-muted/30 p-4">
                            <label className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                <span className="flex-1">
                                    <span className="font-semibold">Analytics</span>
                                    <span className="block text-muted-foreground">
                                        Aggregate counts of views and downloads.
                                    </span>
                                </span>
                                <Switch
                                    checked={analytics}
                                    onCheckedChange={(v) => setAnalytics(Boolean(v))}
                                    aria-label="Analytics consent"
                                />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                                <span className="flex-1">
                                    <span className="font-semibold">Personalization</span>
                                    <span className="block text-muted-foreground">
                                        Tailor article recommendations to your reading history.
                                    </span>
                                </span>
                                <Switch
                                    checked={personalization}
                                    onCheckedChange={(v) => setPersonalization(Boolean(v))}
                                    aria-label="Personalization consent"
                                />
                            </label>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col-reverse sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
                        {showCustomize ? (
                            <Button
                                onClick={() => choose("customize")}
                                disabled={submitting}
                                className="sm:flex-1 sm:min-w-[160px] font-semibold"
                            >
                                Save preferences
                            </Button>
                        ) : (
                            <Button
                                onClick={() => choose("all")}
                                disabled={submitting}
                                className="sm:flex-1 sm:min-w-[160px] font-semibold"
                            >
                                Accept all
                            </Button>
                        )}
                        <Button
                            onClick={() => choose("essential_only")}
                            disabled={submitting}
                            variant="outline"
                            className="sm:flex-1 sm:min-w-[160px] font-semibold"
                        >
                            Essential only
                        </Button>
                        <Button
                            onClick={() => setShowCustomize((v) => !v)}
                            variant="ghost"
                            className="sm:min-w-[120px] font-semibold"
                            type="button"
                        >
                            {showCustomize ? "Hide" : "Customize"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
