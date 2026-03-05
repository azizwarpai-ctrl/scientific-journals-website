"use client"

import { useState, useEffect } from "react"

interface EndpointResult {
    name: string
    url: string
    status: number | string
    latencyMs: number
    data: any
    error?: string
}

interface JournalCheck {
    id: string
    title: string
    hasImage: boolean
    imageUrl: string | null
    hasDescription: boolean
    field: string
    publisher: string
}

export default function DebugPage() {
    const [results, setResults] = useState<EndpointResult[]>([])
    const [loading, setLoading] = useState(true)
    const [timestamp, setTimestamp] = useState("")

    useEffect(() => {
        setTimestamp(new Date().toISOString())
        runAllTests()
    }, [])

    async function testEndpoint(name: string, url: string): Promise<EndpointResult> {
        const start = Date.now()
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
            const json = await res.json()
            return { name, url, status: res.status, latencyMs: Date.now() - start, data: json }
        } catch (err: any) {
            return { name, url, status: "ERR", latencyMs: Date.now() - start, data: null, error: err.message }
        }
    }

    async function runAllTests() {
        setLoading(true)
        const endpoints = [
            { name: "Journals (Hono)", url: "/api/journals" },
            { name: "Home Stats", url: "/api/home-stats" },
            { name: "OJS Journals (Homepage)", url: "/api/ojs/journals" },
            { name: "OJS Stats", url: "/api/ojs/stats" },
            { name: "OJS Health", url: "/api/ojs/health" },
        ]

        const all = await Promise.all(endpoints.map(ep => testEndpoint(ep.name, ep.url)))
        setResults(all)
        setLoading(false)
    }

    // Parse journals from the Hono route for analysis
    const journalsResult = results.find(r => r.name === "Journals (Hono)")
    const journalChecks: JournalCheck[] = (journalsResult?.data?.data || []).map((j: any) => ({
        id: j.id,
        title: j.title || "(empty)",
        hasImage: !!j.cover_image_url,
        imageUrl: j.cover_image_url,
        hasDescription: !!j.description,
        field: j.field || "(empty)",
        publisher: j.publisher || "(empty)",
    }))

    // Parse OJS journals for thumbnail analysis
    const ojsResult = results.find(r => r.name === "OJS Journals (Homepage)")
    const ojsJournals = ojsResult?.data?.data || []

    // Stats
    const statsResult = results.find(r => r.name === "Home Stats")
    const stats = statsResult?.data?.data

    return (
        <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem", background: "#0f172a", color: "#e2e8f0", minHeight: "100vh" }}>
            <h1 style={{ color: "#38bdf8", borderBottom: "2px solid #1e3a5f", paddingBottom: "0.5rem" }}>
                🔍 DigitoPub API Debug Report
            </h1>
            <p style={{ color: "#64748b" }}>Generated: {timestamp}</p>

            {loading && <p style={{ color: "#fbbf24", fontSize: "1.2rem" }}>⏳ Running tests...</p>}

            {/* Section 1: Endpoint Status */}
            <h2 style={{ color: "#22d3ee", marginTop: "2rem" }}>1. API Endpoint Status</h2>
            <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "1rem" }}>
                <thead>
                    <tr style={{ background: "#1e293b" }}>
                        <th style={thStyle}>Endpoint</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Latency</th>
                        <th style={thStyle}>Success</th>
                        <th style={thStyle}>Error</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map(r => (
                        <tr key={r.name} style={{ borderBottom: "1px solid #334155" }}>
                            <td style={tdStyle}><strong>{r.name}</strong><br /><code style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.url}</code></td>
                            <td style={tdStyle}>
                                <span style={{ ...badgeStyle, background: r.status === 200 ? "#14532d" : "#7f1d1d", color: r.status === 200 ? "#bbf7d0" : "#fecaca" }}>
                                    {r.status}
                                </span>
                            </td>
                            <td style={tdStyle}>{r.latencyMs}ms</td>
                            <td style={tdStyle}>
                                {r.data?.success === true ? <span style={{ color: "#4ade80" }}>✓</span> : <span style={{ color: "#f87171" }}>✗</span>}
                            </td>
                            <td style={tdStyle}>{r.error || r.data?.error || "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Section 2: Stats Analysis */}
            {stats && (
                <>
                    <h2 style={{ color: "#22d3ee", marginTop: "2rem" }}>2. Homepage Stats</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
                        {[
                            { label: "Active Journals", value: stats.activeJournals },
                            { label: "Published Articles", value: stats.publishedArticles },
                            { label: "Researchers", value: stats.researchers },
                            { label: "Countries", value: stats.countriesEstimated },
                        ].map(s => (
                            <div key={s.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "1.5rem" }}>
                                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{s.label}</div>
                                <div style={{ fontSize: "2rem", fontWeight: "bold", color: s.value === 0 ? "#f87171" : "#4ade80" }}>
                                    {s.value ?? "null"}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Section 3: Journals Table (from /api/journals) */}
            {journalChecks.length > 0 && (
                <>
                    <h2 style={{ color: "#22d3ee", marginTop: "2rem" }}>3. Journals from /api/journals ({journalChecks.length} total)</h2>
                    <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "1rem" }}>
                        <thead>
                            <tr style={{ background: "#1e293b" }}>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Title</th>
                                <th style={thStyle}>Field</th>
                                <th style={thStyle}>Publisher</th>
                                <th style={thStyle}>Image</th>
                                <th style={thStyle}>Description</th>
                                <th style={thStyle}>Image Preview</th>
                            </tr>
                        </thead>
                        <tbody>
                            {journalChecks.map(j => (
                                <tr key={j.id} style={{ borderBottom: "1px solid #334155" }}>
                                    <td style={tdStyle}>{j.id}</td>
                                    <td style={tdStyle}>{j.title}</td>
                                    <td style={tdStyle}>{j.field}</td>
                                    <td style={tdStyle}>{j.publisher}</td>
                                    <td style={tdStyle}>
                                        {j.hasImage
                                            ? <span style={{ ...badgeStyle, background: "#14532d", color: "#bbf7d0" }}>✓ set</span>
                                            : <span style={{ ...badgeStyle, background: "#7f1d1d", color: "#fecaca" }}>✗ missing</span>}
                                    </td>
                                    <td style={tdStyle}>
                                        {j.hasDescription
                                            ? <span style={{ ...badgeStyle, background: "#14532d", color: "#bbf7d0" }}>✓ set</span>
                                            : <span style={{ ...badgeStyle, background: "#7f1d1d", color: "#fecaca" }}>✗ missing</span>}
                                    </td>
                                    <td style={tdStyle}>
                                        {j.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={j.imageUrl} alt="thumb" style={{ maxWidth: 80, maxHeight: 50, borderRadius: 4, border: "1px solid #334155" }} />
                                        ) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Section 4: OJS Journals Thumbnail Check */}
            {ojsJournals.length > 0 && (
                <>
                    <h2 style={{ color: "#22d3ee", marginTop: "2rem" }}>4. OJS Journals from /api/ojs/journals (Homepage Source)</h2>
                    <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "1rem" }}>
                        <thead>
                            <tr style={{ background: "#1e293b" }}>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>thumbnail_url</th>
                                <th style={thStyle}>Preview</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ojsJournals.map((j: any) => (
                                <tr key={j.journal_id} style={{ borderBottom: "1px solid #334155" }}>
                                    <td style={tdStyle}>{j.journal_id}</td>
                                    <td style={tdStyle}>{j.name || "(empty)"}</td>
                                    <td style={tdStyle}>
                                        {j.thumbnail_url
                                            ? <><span style={{ ...badgeStyle, background: "#14532d", color: "#bbf7d0" }}>✓</span><br /><code style={{ fontSize: "0.7rem", wordBreak: "break-all" }}>{j.thumbnail_url}</code></>
                                            : <span style={{ ...badgeStyle, background: "#7f1d1d", color: "#fecaca" }}>✗ null</span>}
                                    </td>
                                    <td style={tdStyle}>
                                        {j.thumbnail_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={j.thumbnail_url} alt="thumb" style={{ maxWidth: 80, maxHeight: 50, borderRadius: 4, border: "1px solid #334155" }} />
                                        ) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}

            {/* Section 5: Summary */}
            <h2 style={{ color: "#22d3ee", marginTop: "2rem" }}>5. Summary</h2>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "1.5rem", marginTop: "1rem" }}>
                <p>Journals from /api/journals: <strong>{journalChecks.length}</strong></p>
                <p>Journals missing images: <strong style={{ color: journalChecks.filter(j => !j.hasImage).length > 0 ? "#f87171" : "#4ade80" }}>{journalChecks.filter(j => !j.hasImage).length}</strong></p>
                <p>Journals missing descriptions: <strong style={{ color: journalChecks.filter(j => !j.hasDescription).length > 0 ? "#fbbf24" : "#4ade80" }}>{journalChecks.filter(j => !j.hasDescription).length}</strong></p>
                <p>OJS journals with thumbnail_url: <strong style={{ color: ojsJournals.filter((j: any) => j.thumbnail_url).length < ojsJournals.length ? "#f87171" : "#4ade80" }}>{ojsJournals.filter((j: any) => j.thumbnail_url).length} / {ojsJournals.length}</strong></p>
                <p>Stats Active Journals: <strong style={{ color: stats?.activeJournals === 0 ? "#f87171" : "#4ade80" }}>{stats?.activeJournals ?? "N/A"}</strong></p>
            </div>

            {/* Section 6: Raw Responses */}
            <h2 style={{ color: "#22d3ee", marginTop: "2rem" }}>6. Raw API Responses</h2>
            {results.map(r => (
                <details key={r.name} style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", color: "#94a3b8", padding: "0.5rem", background: "#1e293b", borderRadius: 4 }}>
                        {r.name} — {r.status}
                    </summary>
                    <pre style={{ background: "#0f172a", border: "1px solid #334155", padding: "1rem", borderRadius: "0 0 4px 4px", overflow: "auto", fontSize: "0.8rem", maxHeight: 400 }}>
                        {JSON.stringify(r.data, null, 2) || r.error || "No data"}
                    </pre>
                </details>
            ))}

            <p style={{ color: "#f87171", fontWeight: "bold", marginTop: "2rem" }}>⚠️ Delete this page after debugging is complete.</p>

            <button
                onClick={() => { setLoading(true); runAllTests() }}
                style={{ marginTop: "1rem", padding: "0.75rem 2rem", background: "#2563eb", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}
            >
                🔄 Re-run Tests
            </button>
        </div>
    )
}

const thStyle: React.CSSProperties = { borderBottom: "2px solid #334155", padding: "8px 12px", textAlign: "left", color: "#94a3b8" }
const tdStyle: React.CSSProperties = { padding: "8px 12px", verticalAlign: "top" }
const badgeStyle: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600 }
