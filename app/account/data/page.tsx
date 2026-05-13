"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIdentity } from "@/src/hooks/use-identity"
import { useDeleteAccountData } from "@/src/features/account/api/use-account"
import { toast } from "sonner"

export default function AccountDataPage() {
    const { data: identity, isLoading } = useIdentity()
    const [confirmText, setConfirmText] = useState("")
    const mutation = useDeleteAccountData()

    if (isLoading) {
        return (
            <div className="container max-w-[760px] py-10 lg:py-16 mx-auto px-4 sm:px-6">
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        )
    }

    if (!identity?.authenticated) {
        if (typeof window !== "undefined") {
            window.location.assign(
                `/api/auth/orcid/start?return_url=${encodeURIComponent("/account/data")}`
            )
        }
        return null
    }

    const canDelete = confirmText.trim().toUpperCase() === "DELETE"

    const onDelete = async () => {
        try {
            await mutation.mutateAsync()
            toast.success("Your engagement data has been erased.")
            // Redirect home after a brief delay to let the toast render.
            setTimeout(() => {
                window.location.assign("/")
            }, 800)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Deletion failed")
        }
    }

    return (
        <div className="container max-w-[760px] py-10 lg:py-16 mx-auto px-4 sm:px-6 space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <Trash2 className="h-7 w-7 text-rose-500" />
                    Delete my engagement data
                </h1>
                <p className="text-sm text-muted-foreground">
                    Signed in as ORCID iD{" "}
                    <span className="font-mono">{identity.orcid}</span>. This action permanently
                    erases every view, download, and citation event recorded for your ORCID iD.
                    It cannot be undone.
                </p>
            </header>

            <section className="rounded-xl border border-rose-300 bg-rose-50/60 dark:bg-rose-950/30 p-5 space-y-4">
                <h2 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                    What gets deleted
                </h2>
                <ul className="list-disc list-inside space-y-1 text-sm text-rose-900 dark:text-rose-200">
                    <li>All raw event rows attributed to your ORCID.</li>
                    <li>Your lifetime totals in user_metrics.</li>
                    <li>The digitopub-side ORCID↔OJS link record.</li>
                </ul>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                    Aggregate counts already merged into per-article totals remain (they cannot
                    be re-attributed to you).
                </p>
            </section>

            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                <label className="space-y-2 block">
                    <span className="text-sm font-semibold">
                        Type <code className="font-mono">DELETE</code> to confirm
                    </span>
                    <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        autoComplete="off"
                    />
                </label>
                <Button
                    onClick={onDelete}
                    disabled={!canDelete || mutation.isPending}
                    variant="destructive"
                    className="w-full sm:w-auto font-semibold"
                >
                    {mutation.isPending ? "Deleting…" : "Permanently delete my data"}
                </Button>
            </div>
        </div>
    )
}
