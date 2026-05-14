"use client"

/**
 * Fire-and-forget client helpers for the UIET-P1 metric endpoints.
 * Failures are silently swallowed so the UI never blocks on analytics.
 */

interface ViewPayload {
    article_id: string | number
    journal_id: string | number
    source: "article_page" | "pdf_view"
}

interface DownloadPayload {
    article_id: string | number
    journal_id: string | number
    galley_id: string | number
}

interface CitationPayload {
    article_id: string | number
    journal_id: string | number
    format: "vancouver" | "apa" | "mla" | "chicago" | "harvard" | "ris" | "bibtex" | "plain"
    action: "copy" | "export"
}

function toStringId(v: string | number): string {
    return typeof v === "string" ? v : String(v)
}

async function post(url: string, body: unknown): Promise<void> {
    try {
        await fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            keepalive: true,
        })
    } catch {
        /* swallow */
    }
}

export function recordViewEvent(p: ViewPayload): void {
    void post("/api/metrics/events/view", {
        article_id: toStringId(p.article_id),
        journal_id: toStringId(p.journal_id),
        source: p.source,
    })
}

export function recordDownloadEvent(p: DownloadPayload): void {
    void post("/api/metrics/events/download", {
        article_id: toStringId(p.article_id),
        journal_id: toStringId(p.journal_id),
        galley_id: toStringId(p.galley_id),
    })
}

export function recordCitationEvent(p: CitationPayload): void {
    void post("/api/metrics/events/citation", {
        article_id: toStringId(p.article_id),
        journal_id: toStringId(p.journal_id),
        format: p.format,
        action: p.action,
    })
}
