"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SubmissionFlowTester() {
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const runProbe = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/debug/submission-flow`)
            const data = await res.json()
            setResult(data)
        } catch (error: any) {
            setResult({ error: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex gap-4 mb-8">
                    <Link href="/debug" className="text-primary hover:underline">&larr; Back to Main Debug</Link>
                    <span className="text-muted-foreground">|</span>
                    <Link href="/debug/auth" className="text-primary hover:underline">Auth Debug</Link>
                    <span className="text-muted-foreground">|</span>
                    <Link href="/debug/ojs" className="text-primary hover:underline">OJS Connection Probe</Link>
                </div>

                <h1 className="text-3xl font-bold mb-8">Submission Workflow Simulation</h1>
                
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Simulate "Submit Manuscript" Click</h2>
                        <Button onClick={runProbe} disabled={loading} size="lg">
                            {loading ? "Tracing..." : "Simulate Submit Button"}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Traces the HTTP redirect chain when a user attempts to access the OJS submission wizard. Helps identify if OJS is successfully catching the request and redirecting to the login portal.
                    </p>
                    
                    {result && (
                        <pre className="bg-slate-900 border border-slate-700 text-yellow-400 p-4 rounded-md overflow-x-auto text-sm">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    )}
                </div>
            </main>
        </div>
    )
}
