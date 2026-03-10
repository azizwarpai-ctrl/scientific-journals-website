"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"

export default function DebugPage() {
    const [dbResult, setDbResult] = useState<any>(null)
    const [schemaResult, setSchemaResult] = useState<any>(null)
    const [journalsResult, setJournalsResult] = useState<any>(null)
    const [loading, setLoading] = useState<Record<string, boolean>>({})

    const runProbe = async (endpoint: string, setter: (data: any) => void, key: string) => {
        setLoading(prev => ({ ...prev, [key]: true }))
        try {
            const res = await fetch(`/api/debug/${endpoint}`)
            const data = await res.json()
            setter(data)
        } catch (error: any) {
            setter({ error: error.message })
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }))
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <h1 className="text-3xl font-bold mb-8">System Diagnostic Panel</h1>
                
                <div className="grid gap-8">
                    {/* Database Probe */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">1. Database Connection Probe</h2>
                            <Button 
                                onClick={() => runProbe("database", setDbResult, "db")}
                                disabled={loading["db"]}
                            >
                                {loading["db"] ? "Probing..." : "Run Test"}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Checks environment variables and attempts a minimal SELECT 1 connection.</p>
                        
                        {dbResult && (
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto text-sm">
                                {JSON.stringify(dbResult, null, 2)}
                            </pre>
                        )}
                    </div>

                    {/* Schema Probe */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">2. OJS Schema Probe</h2>
                            <Button 
                                onClick={() => runProbe("ojs-schema", setSchemaResult, "schema")}
                                disabled={loading["schema"]}
                            >
                                {loading["schema"] ? "Probing..." : "Run Test"}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Verifies the existence of expected OJS tables (journals, users, submissions).</p>
                        
                        {schemaResult && (
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto text-sm">
                                {JSON.stringify(schemaResult, null, 2)}
                            </pre>
                        )}
                    </div>

                    {/* Journals Query Probe */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">3. Journals Query Probe</h2>
                            <Button 
                                onClick={() => runProbe("ojs-journals", setJournalsResult, "journals")}
                                disabled={loading["journals"]}
                            >
                                {loading["journals"] ? "Probing..." : "Run Test"}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">Executes the complex journal-settings mapped query to check for schema discrepancies.</p>
                        
                        {journalsResult && (
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto text-sm">
                                {JSON.stringify(journalsResult, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
