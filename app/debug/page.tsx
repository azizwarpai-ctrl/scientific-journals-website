"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"

export default function DebugPage() {
    const [dbResult, setDbResult] = useState<any>(null)
    const [schemaResult, setSchemaResult] = useState<any>(null)
    const [journalsResult, setJournalsResult] = useState<any>(null)
    const [envResult, setEnvResult] = useState<any>(null)
    const [networkResult, setNetworkResult] = useState<any>(null)
    const [authResult, setAuthResult] = useState<any>(null)
    const [dbExistenceResult, setDbExistenceResult] = useState<any>(null)
    const [privilegeResult, setPrivilegeResult] = useState<any>(null)
    const [charsetResult, setCharsetResult] = useState<any>(null)
    const [fullReportResult, setFullReportResult] = useState<any>(null)
    
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
                <h1 className="text-3xl font-bold mb-8">System Diagnostic Panel (Deep Inspection)</h1>
                
                <div className="mb-12">
                    <h2 className="text-2xl font-bold border-b pb-2 mb-6">Unified Diagnostic Report</h2>
                    <div className="rounded-lg border bg-primary/5 border-primary/20 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold">Run All Probes Connectively</h3>
                                <p className="text-sm text-muted-foreground mt-1">Executes every deep diagnostic probe and bundles the output into a single JSON report.</p>
                            </div>
                            <Button 
                                size="lg"
                                onClick={() => runProbe("full-database-diagnostic", setFullReportResult, "full")}
                                disabled={loading["full"]}
                            >
                                {loading["full"] ? "Running Full Diagnostic..." : "Run Full Diagnostic"}
                            </Button>
                        </div>
                        
                        {fullReportResult && (
                            <pre className="bg-slate-900 border border-slate-700 text-green-400 p-4 rounded-md overflow-x-auto text-sm max-h-[600px] overflow-y-auto">
                                {JSON.stringify(fullReportResult, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>

                <h2 className="text-2xl font-bold border-b pb-2 mb-6">Individual Deep Probes</h2>
                <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* 1. Env Probe */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">1. Environment</h3>
                            <Button size="sm" onClick={() => runProbe("db-environment", setEnvResult, "env")} disabled={loading["env"]}>Run</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Reads environment configuration and identifies Node vs Edge runtime restrictions.</p>
                        {envResult && <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-xs max-h-64">{JSON.stringify(envResult, null, 2)}</pre>}
                    </div>

                    {/* 2. Network Probe */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">2. TCP Network</h3>
                            <Button size="sm" onClick={() => runProbe("network-probe", setNetworkResult, "net")} disabled={loading["net"]}>Run</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Attempts a pure TCP ping to the host and port independently from MySQL logic.</p>
                        {networkResult && <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-xs max-h-64">{JSON.stringify(networkResult, null, 2)}</pre>}
                    </div>

                    {/* 3. Auth Probe */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">3. MYSQL Auth Plugin</h3>
                            <Button size="sm" onClick={() => runProbe("auth-probe", setAuthResult, "auth")} disabled={loading["auth"]}>Run</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Inspects server variables for plugin enforcement (caching_sha2 vs native).</p>
                        {authResult && <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-xs max-h-64">{JSON.stringify(authResult, null, 2)}</pre>}
                    </div>

                    {/* 4. DB Existence */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">4. Database Existence</h3>
                            <Button size="sm" onClick={() => runProbe("database-existence", setDbExistenceResult, "dbex")} disabled={loading["dbex"]}>Run</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Connects globally and executes SHOW DATABASES to confirm the target DB actually exists.</p>
                        {dbExistenceResult && <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-xs max-h-64">{JSON.stringify(dbExistenceResult, null, 2)}</pre>}
                    </div>

                    {/* 5. Privileges */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">5. User Privileges</h3>
                            <Button size="sm" onClick={() => runProbe("user-privileges", setPrivilegeResult, "priv")} disabled={loading["priv"]}>Run</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Runs SHOW GRANTS to expose exactly what IP binding the MySQL server matched us against.</p>
                        {privilegeResult && <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-xs max-h-64">{JSON.stringify(privilegeResult, null, 2)}</pre>}
                    </div>
                    
                    {/* 6. Charset */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">6. Charset Encoding</h3>
                            <Button size="sm" onClick={() => runProbe("charset-encoding", setCharsetResult, "char")} disabled={loading["char"]}>Run</Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Diagnoses character_set variables that might conflict with Node's driver mapping.</p>
                        {charsetResult && <pre className="bg-slate-900 text-slate-50 p-3 rounded-md overflow-x-auto text-xs max-h-64">{JSON.stringify(charsetResult, null, 2)}</pre>}
                    </div>
                </div>

                <h2 className="text-2xl font-bold border-b pb-2 mb-6 mt-12">Legacy High-Level Tests</h2>
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Legacy DB */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm opacity-80">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">SELECT 1 Check</h3>
                            <Button size="sm" variant="outline" onClick={() => runProbe("database", setDbResult, "db")} disabled={loading["db"]}>Run</Button>
                        </div>
                        {dbResult && <pre className="bg-slate-800 text-slate-300 p-2 rounded text-[10px] max-h-32 overflow-auto">{JSON.stringify(dbResult, null, 2)}</pre>}
                    </div>

                    {/* Legacy Schema */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm opacity-80">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">Journal Schema</h3>
                            <Button size="sm" variant="outline" onClick={() => runProbe("ojs-schema", setSchemaResult, "schema")} disabled={loading["schema"]}>Run</Button>
                        </div>
                        {schemaResult && <pre className="bg-slate-800 text-slate-300 p-2 rounded text-[10px] max-h-32 overflow-auto">{JSON.stringify(schemaResult, null, 2)}</pre>}
                    </div>

                    {/* Legacy Journals */}
                    <div className="rounded-lg border bg-card p-6 shadow-sm opacity-80">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">Mapping Dry Run</h3>
                            <Button size="sm" variant="outline" onClick={() => runProbe("ojs-journals", setJournalsResult, "journals")} disabled={loading["journals"]}>Run</Button>
                        </div>
                        {journalsResult && <pre className="bg-slate-800 text-slate-300 p-2 rounded text-[10px] max-h-32 overflow-auto">{JSON.stringify(journalsResult, null, 2)}</pre>}
                    </div>
                </div>
            </main>
        </div>
    )
}
