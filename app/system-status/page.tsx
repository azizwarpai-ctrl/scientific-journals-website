"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCcw, Activity, Server, ShieldCheck, ShieldAlert, Network, Database } from "lucide-react"

const DEBUG = process.env.NODE_ENV !== "production" || true // Force debug for this specialized page

export default function SystemStatusPage() {
    const [data, setData] = useState<any>(null)
    const [isPending, setIsPending] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const executeDiagnostic = async () => {
        setIsPending(true)
        setError(null)
        try {
            const res = await fetch("/api/debug-db?ts=" + Date.now())
            const json = await res.json()
            setData(json)
            if (json.error && !json.ok && json.error !== "Access denied for user...") {
                setError(json.error)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsPending(false)
        }
    }

    useEffect(() => {
        executeDiagnostic()
    }, [])

    if (isPending && !data) return (
        <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <Activity className="w-12 h-12 text-primary relative z-10 animate-bounce" />
            </div>
            <p className="text-xl font-medium tracking-tight animate-pulse text-muted-foreground">Initializing Telemetry Handshake...</p>
        </div>
    )

    const steps = data?.steps || {}

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Server className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">OJS Database Telemetry Core</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Real-time connection verification and authentication diagnostics</p>
                        </div>
                    </div>
                    <Button
                        onClick={executeDiagnostic}
                        disabled={isPending}
                        size="lg"
                        className="flex items-center gap-2 font-bold shadow-sm"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                        {isPending ? 'Probing...' : 'Force Raw Probe'}
                    </Button>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-5 rounded-xl border border-red-200 dark:border-red-900/50 flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5" />
                            <h3 className="font-bold">System Alert</h3>
                        </div>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <div className="grid gap-6">
                    {/* 0. Runtime Environment */}
                    <DiagnosticStep
                        icon={<Server className="w-5 h-5" />}
                        title="0. Execution Context"
                        step={{ ok: true }}
                        details={[
                            { label: "Environment Mode", value: process.env.NODE_ENV },
                            { label: "Server Time (UTC)", value: data?.timestamp || new Date().toISOString() }
                        ]}
                    />

                    {/* 1. Environment Check */}
                    <DiagnosticStep
                        icon={<Database className="w-5 h-5" />}
                        title="1. Credentials Engine"
                        step={steps.envCheck}
                        details={[
                            { label: "Target Host", value: steps.envCheck?.host },
                            { label: "Target Port", value: steps.envCheck?.port },
                            { label: "Database Name", value: steps.envCheck?.database },
                            { label: "Target User", value: steps.envCheck?.user },
                            { label: "Password Length", value: steps.envCheck?.pwLength },
                            { label: "Originating Outbound IP", value: steps.envCheck?.outboundIp }
                        ]}
                    />

                    {/* 2. DNS Resolution */}
                    <DiagnosticStep
                        icon={<Network className="w-5 h-5" />}
                        title="2. DNS Resolution"
                        step={steps.dnsResolution}
                        details={[{ label: "Resolved IP Addresses", value: steps.dnsResolution?.addresses?.join(", ") }]}
                    />

                    {/* 3. TCP Port Check */}
                    <DiagnosticStep
                        icon={<Activity className="w-5 h-5" />}
                        title="3. TCP Socket Handshake"
                        step={steps.tcpConnection}
                        details={[{ label: "Socket Latency", value: steps.tcpConnection?.latencyMs ? `${steps.tcpConnection.latencyMs}ms` : "N/A" }]}
                    />

                    {/* 4. MySQL Authentication */}
                    <DiagnosticStep
                        icon={steps.mysqlAuth?.ok ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                        title="4. Protocol Authentication"
                        step={steps.mysqlAuth}
                        details={[
                            { label: "MySQL Server Version", value: steps.mysqlAuth?.mysqlVersion },
                            { label: "Authenticated User", value: steps.mysqlAuth?.authenticatedAs },
                            { label: "Received Source IP", value: steps.mysqlAuth?.sourceIp },
                            { label: "Auth Plugin Active", value: steps.mysqlAuth?.authPlugin }
                        ]}
                    />

                    {/* 5. Query Execution */}
                    <DiagnosticStep
                        icon={<Database className="w-5 h-5" />}
                        title="5. Query Test"
                        step={steps.queryTest}
                        details={[
                            { label: "Active DB", value: steps.queryTest?.databaseName },
                            { label: "Tables Read", value: steps.queryTest?.tablesVisible },
                            { label: "Total Journals", value: steps.queryTest?.journalCount },
                            { label: "Sample Check", value: steps.queryTest?.sampleJournal }
                        ]}
                    />

                    {/* 6. Connection Metrics */}
                    <DiagnosticStep
                        icon={<Activity className="w-5 h-5" />}
                        title="6. Telemetry Overview"
                        step={{ ok: data?.ok }}
                        details={[
                            { label: "Total Request Latency", value: data?.latencyMs ? `${data.latencyMs}ms` : "—" },
                            { label: "Connection Engine", value: data?.mode },
                            { label: "System Configured", value: data?.configured ? "True" : "False" }
                        ]}
                    />
                </div>

                <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl shadow-inner border border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
                        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">Raw Execution Payload</h3>
                        <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800/50">Confidential</Badge>
                    </div>
                    <pre className="text-xs leading-loose font-mono overflow-auto max-h-96 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    )
}

function DiagnosticStep({ title, icon, step, details }: { title: string, icon: React.ReactNode, step: any, details: { label: string, value: any }[] }) {
    if (!step) {
        return (
            <Card className="bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-2 shadow-none opacity-60 transition-opacity hover:opacity-100">
                <CardHeader className="py-5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-slate-500">
                            {icon}
                            <CardTitle className="text-lg font-bold">{title}</CardTitle>
                        </div>
                        <Badge variant="outline" className="uppercase tracking-wider font-bold text-[10px] py-1 border-slate-300 dark:border-slate-700">Awaiting Signal</Badge>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    const isSuccess = step.ok

    return (
        <Card className={`overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md border-t-4 ${isSuccess ? "border-t-green-500 dark:border-t-green-600" : "border-t-red-500 dark:border-t-red-600"}`}>
            <CardHeader className={`py-5 border-b ${isSuccess ? "bg-green-50/50 dark:bg-green-950/20" : "bg-red-50/50 dark:bg-red-950/20"}`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className={isSuccess ? "text-green-600" : "text-red-600"}>{icon}</span>
                        <CardTitle className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</CardTitle>
                    </div>
                    <Badge className={`uppercase tracking-widest font-bold text-[10px] px-3 py-1 shadow-sm ${isSuccess ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}>
                        {isSuccess ? "Operational" : "Failure Detected"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6 pb-8 bg-white dark:bg-slate-950">
                {step.error && (
                    <div className="bg-red-50/80 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900/50 mb-8 flex flex-col gap-3">
                        <p className="text-sm font-bold leading-relaxed">{step.error}</p>
                        <div className="flex flex-wrap gap-2">
                            {step.code && <Badge variant="outline" className="bg-white dark:bg-black uppercase font-mono text-[10px] text-red-600 border-red-200">CODE: {step.code}</Badge>}
                            {step.sqlState && <Badge variant="outline" className="bg-white dark:bg-black uppercase font-mono text-[10px] text-red-600 border-red-200">STATE: {step.sqlState}</Badge>}
                            {step.errno && <Badge variant="outline" className="bg-white dark:bg-black uppercase font-mono text-[10px] text-red-600 border-red-200">ERRNO: {step.errno}</Badge>}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
                    {details.map((d, i) => (
                        <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                {d.label}
                            </p>
                            <p className="text-[14px] font-mono font-medium text-slate-800 dark:text-slate-200 truncate pl-3" title={String(d.value)}>
                                {d.value !== undefined && d.value !== null ? String(d.value) : <span className="text-slate-300 dark:text-slate-700">unresolved</span>}
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
