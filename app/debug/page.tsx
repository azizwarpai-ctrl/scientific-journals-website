"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"

const DEBUG = process.env.NODE_ENV !== "production"

export default function DebugOjsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const runDiagnostic = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch("/api/ojs/health?ts=" + Date.now())
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
    }, [])

    useEffect(() => {
        runDiagnostic()
    }, [runDiagnostic])

    if (loading && !data) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground animate-pulse">Running Professional Diagnostics...</p>
        </div>
    )

    const steps = data?.steps || {}

    return (
        <div className="container py-10 space-y-8 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">OJS Remote Connection Diagnostic</h1>
                    <p className="text-muted-foreground">Professional Telemetry & Network Source Verification</p>
                </div>
                <Button
                    onClick={runDiagnostic}
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Run Diagnostic Again
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex flex-col gap-1">
                    <h3 className="font-bold">Diagnostic Alert</h3>
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="grid gap-6">
                {/* 0. Runtime Environment */}
                <DiagnosticStep
                    title="0. Runtime Environment"
                    step={{ ok: true }}
                    details={[
                        { label: "Environment", value: process.env.NODE_ENV },
                        { label: "Runtime", value: typeof window === "undefined" ? "Server" : "Client" },
                        { label: "Timestamp", value: new Date().toISOString() }
                    ]}
                />

                {/* 1. Environment Check */}
                <DiagnosticStep
                    title="1. Environment Check"
                    step={steps.envCheck}
                    details={[
                        {
                            label: "Host",
                            value: steps.envCheck?.host
                                ? (DEBUG ? steps.envCheck.host : "***" + steps.envCheck.host.slice(-10))
                                : "Missing"
                        },
                        { label: "Port", value: steps.envCheck?.port },
                        {
                            label: "Database",
                            value: steps.envCheck?.database
                                ? (DEBUG ? steps.envCheck.database : "***" + steps.envCheck.database.slice(-4))
                                : "Missing"
                        },
                        { label: "User", value: steps.envCheck?.user ? (DEBUG ? steps.envCheck.user : "***" + steps.envCheck.user.slice(-4)) : "Missing" },
                        { label: "Outbound IP", value: steps.envCheck?.outboundIp }
                    ]}
                />

                {/* 2. DNS Resolution */}
                <DiagnosticStep
                    title="2. DNS Resolution"
                    step={steps.dnsResolution}
                    details={[{ label: "Addresses", value: steps.dnsResolution?.addresses?.join(", ") }]}
                />

                {/* 3. TCP Port Check */}
                <DiagnosticStep
                    title="3. TCP Port Check"
                    step={steps.tcpConnection}
                    details={[{ label: "Latency", value: steps.tcpConnection?.latencyMs ? `${steps.tcpConnection.latencyMs}ms` : "N/A" }]}
                />

                {/* 4. MySQL Authentication */}
                <DiagnosticStep
                    title="4. MySQL Authentication"
                    step={steps.mysqlAuth}
                    details={[
                        { label: "MySQL Version", value: steps.mysqlAuth?.mysqlVersion },
                        { label: "Authenticated As", value: steps.mysqlAuth?.authenticatedAs },
                        { label: "Source IP", value: steps.mysqlAuth?.sourceIp },
                        { label: "Auth Plugin", value: steps.mysqlAuth?.authPlugin }
                    ]}
                />

                {/* 5. Query Execution */}
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

                {/* 6. Connection Metrics */}
                <DiagnosticStep
                    title="6. Connection Metrics"
                    step={{ ok: data?.ok }}
                    details={[
                        { label: "Total Latency", value: data?.latencyMs ? `${data.latencyMs}ms` : "—" },
                        { label: "Connection Mode", value: data?.mode },
                        { label: "Configured", value: data?.configured ? "Yes" : "No" }
                    ]}
                />
            </div>

            <div className="bg-muted p-6 rounded-lg border">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Raw Payload Telemetry</h3>
                <pre className="text-[10px] leading-relaxed font-mono opacity-80">{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    )
}

function DiagnosticStep({ title, step, details }: { title: string, step: any, details: { label: string, value: any }[] }) {
    if (!step) {
        return (
            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold">{title}</CardTitle>
                        <Badge variant="outline" className="opacity-50">Skipped</Badge>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className={step.ok ? "border-green-200 shadow-sm" : "border-red-200 shadow-sm"}>
            <CardHeader className="py-4 border-b bg-muted/10">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold tracking-tight">{title}</CardTitle>
                    <Badge variant={step.ok ? "default" : "destructive"} className={step.ok ? "bg-green-600 hover:bg-green-600" : ""}>
                        {step.ok ? "PASS" : "FAIL"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {step.error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded border border-red-100 mb-6 flex flex-col gap-1">
                        <p className="text-sm font-bold">{step.error}</p>
                        <div className="flex gap-4">
                            {step.code && <p className="text-[10px] font-mono uppercase bg-red-100 px-1.5 py-0.5 rounded tracking-wider">Code: {step.code}</p>}
                            {step.sqlState && <p className="text-[10px] font-mono uppercase bg-red-100 px-1.5 py-0.5 rounded tracking-wider">SQL State: {step.sqlState}</p>}
                            {step.errno && <p className="text-[10px] font-mono uppercase bg-red-100 px-1.5 py-0.5 rounded tracking-wider">Errno: {step.errno}</p>}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                    {details.map((d, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{d.label}</p>
                            <p className="text-sm font-mono truncate" title={String(d.value)}>{d.value !== undefined && d.value !== null ? String(d.value) : "—"}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
