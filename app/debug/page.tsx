"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DebugOjsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchHealth() {
            try {
                const res = await fetch("/api/ojs/health")
                const json = await res.json()
                setData(json)
                if (!res.ok) {
                    setError(json.error || "Failed to fetch health diagnostic")
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchHealth()
    }, [])

    if (loading) return <div className="p-8">Running Diagnostics...</div>

    const steps = data?.steps || {}

    return (
        <div className="container py-10 space-y-8">
            <h1 className="text-3xl font-bold">OJS Remote Connection Diagnostic</h1>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
                    <h3 className="font-semibold">Diagnostic Failed</h3>
                    <p>{error}</p>
                </div>
            )}

            <div className="grid gap-6">
                <DiagnosticStep
                    title="1. Environment Check"
                    step={steps.envCheck}
                    details={[
                        { label: "Host", value: steps.envCheck?.host ? "***" + steps.envCheck.host.slice(-10) : "Missing" },
                        { label: "Port", value: steps.envCheck?.port },
                        { label: "Database", value: steps.envCheck?.database ? "***" + steps.envCheck.database.slice(-4) : "Missing" }
                    ]}
                />

                <DiagnosticStep
                    title="2. DNS Resolution"
                    step={steps.dnsResolution}
                    details={[{ label: "Addresses", value: steps.dnsResolution?.addresses?.join(", ") }]}
                />

                <DiagnosticStep
                    title="3. TCP Port Check"
                    step={steps.tcpConnection}
                    details={[{ label: "Latency", value: steps.tcpConnection?.latencyMs ? `${steps.tcpConnection.latencyMs}ms` : "N/A" }]}
                />

                <DiagnosticStep
                    title="4. MySQL Authentication"
                    step={steps.mysqlAuth}
                    details={[
                        { label: "MySQL Version", value: steps.mysqlAuth?.mysqlVersion },
                        { label: "Authenticated As", value: steps.mysqlAuth?.authenticatedAs }
                    ]}
                />

                <DiagnosticStep
                    title="5. Query Execution"
                    step={steps.queryTest}
                    details={[
                        { label: "Database Name", value: steps.queryTest?.databaseName },
                        { label: "Tables Visible", value: steps.queryTest?.tablesVisible },
                        { label: "Journal Count", value: steps.queryTest?.journalCount },
                        { label: "Sample Journal", value: steps.queryTest?.sampleJournal }
                    ]}
                />
            </div>

            <div className="bg-muted p-4 rounded-md overflow-auto">
                <h3 className="font-semibold mb-2">Raw Payload</h3>
                <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    )
}

function DiagnosticStep({ title, step, details }: { title: string, step: any, details: { label: string, value: any }[] }) {
    if (!step) {
        return (
            <Card>
                <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <Badge variant="outline">Skipped</Badge>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className={step.ok ? "border-green-200" : "border-red-200"}>
            <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <Badge variant={step.ok ? "default" : "destructive"} className={step.ok ? "bg-green-600 hover:bg-green-700" : ""}>
                        {step.ok ? "PASS" : "FAIL"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {step.error && <p className="text-red-500 text-sm mb-4">{step.error}</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {details.map((d, i) => (
                        <div key={i}>
                            <p className="text-muted-foreground text-xs font-semibold uppercase">{d.label}</p>
                            <p className="text-sm font-medium">{d.value !== undefined && d.value !== null ? String(d.value) : "—"}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
