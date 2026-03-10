"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function OJSConnectionDebug() {
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const runProbe = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/debug/ping-ojs`)
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
                    <Link href="/debug/submission-flow" className="text-primary hover:underline">Submission Flow Tester</Link>
                </div>

                <h1 className="text-3xl font-bold mb-8">OJS HTTP Connection Debugger</h1>
                
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Ping OJS Domain URL</h2>
                        <Button onClick={runProbe} disabled={loading}>
                            {loading ? "Pinging..." : "Test HTTP Connection"}
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Performs an HTTP HEAD request against the `OJS_BASE_URL` to verify the OJS web server is reachable and resolves correctly over the internet.
                    </p>
                    
                    {result && (
                        <pre className="bg-slate-900 border border-slate-700 text-sky-400 p-4 rounded-md overflow-x-auto text-sm">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    )}
                </div>
            </main>
        </div>
    )
}
