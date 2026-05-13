"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Lock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { subscribeLoginModal, type OpenLoginEvent } from "./login-modal-bus"

/**
 * ORCID sign-in modal. Imperatively opened via openLoginModal({ return_url })
 * from useGatedAction or any other call site. Renders a centered modal on
 * ≥641px viewports and a full-screen drawer on ≤640px.
 *
 * The sign-in CTA is a plain `<a>` to /api/auth/orcid/start with the
 * captured return_url — the modal does no client-side OAuth work itself.
 */
export function LoginModal() {
    const [open, setOpen] = useState(false)
    const [returnUrl, setReturnUrl] = useState<string>("/")

    useEffect(() => {
        return subscribeLoginModal((e: OpenLoginEvent) => {
            setReturnUrl(e.return_url)
            setOpen(true)
        })
    }, [])

    useEffect(() => {
        if (!open) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = prevOverflow
            document.removeEventListener("keydown", onKey)
        }
    }, [open])

    if (!open || typeof document === "undefined") return null

    const startHref = `/api/auth/orcid/start?return_url=${encodeURIComponent(returnUrl)}`

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Sign in with ORCID"
            data-testid="login-modal"
            className="fixed inset-0 z-[300] flex items-stretch sm:items-center justify-center"
        >
            <button
                type="button"
                aria-label="Close sign-in"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-md cursor-default"
            />
            <div
                className={
                    // Full-screen drawer ≤640px; centered card ≥641px.
                    "relative z-10 flex w-full sm:w-auto sm:max-w-[420px] flex-col rounded-none sm:rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden"
                }
            >
                <div className="flex items-start gap-3 p-5 border-b border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold leading-tight">Sign in to continue</h2>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            This article is gated. Sign in with your ORCID iD to view the PDF.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setOpen(false)}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <Button asChild className="w-full h-11 font-semibold">
                        <a href={startHref} rel="noopener">
                            Sign in with ORCID
                        </a>
                    </Button>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        We will redirect you to orcid.org to authenticate. digitopub
                        never sees your password.
                    </p>
                    <a
                        href="https://orcid.org/help/what-is-orcid"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs font-semibold text-primary hover:underline"
                    >
                        What is ORCID?
                    </a>
                </div>
            </div>
        </div>,
        document.body
    )
}
