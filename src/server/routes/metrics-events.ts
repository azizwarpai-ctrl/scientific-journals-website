/**
 * UIET-P1 engagement event ingestion routes.
 *
 * Mounted at /api/metrics/events/{view,download,citation}. Each call:
 *   1. Validates the body with Zod.
 *   2. Reads identity + consent + IP/UA.
 *   3. Enforces rate limit (60/min/IP, 600/hour/IP).
 *   4. Calls recordEvent which handles dedup + consent rules.
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { getIdentity } from "@/src/lib/identity-cookie"
import { getConsent } from "@/src/lib/consent"
import {
    clientIpFromHeaders,
    hashIp,
    hashUa,
} from "@/src/lib/ip-hash"
import { recordEvent } from "@/src/lib/event-recorder"
import { enforceMetricsRateLimit } from "@/src/lib/rate-limiter-configs"

const app = new Hono()

const idString = z.string().regex(/^\d+$/)

const viewSchema = z.object({
    article_id: idString,
    journal_id: idString,
    source: z.enum(["article_page", "pdf_view"]),
})

const downloadSchema = z.object({
    article_id: idString,
    journal_id: idString,
    galley_id: idString,
})

const citationSchema = z.object({
    article_id: idString,
    journal_id: idString,
    format: z.enum(["vancouver", "apa", "mla", "chicago", "harvard", "ris", "bibtex", "plain"]),
    action: z.enum(["copy", "export"]),
})

function applyRateLimit(headers: Headers) {
    const rate = enforceMetricsRateLimit(headers)
    if (rate.allowed) return null
    return new Response(
        JSON.stringify({
            success: false,
            error: "RATE_LIMITED",
            message: `Rate limit (${rate.triggered}) exceeded.`,
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(rate.retryAfter),
            },
        }
    )
}

function readContext(headers: Headers) {
    const ip = clientIpFromHeaders(headers)
    const ua = headers.get("user-agent") || ""
    return {
        ip,
        ua,
        ipHash: ip ? hashIp(ip) : null,
        uaHash: ua ? hashUa(ua) : null,
    }
}

app.post("/view", zValidator("json", viewSchema), async (c) => {
    const limited = applyRateLimit(c.req.raw.headers)
    if (limited) return limited
    const body = c.req.valid("json")
    const identity = await getIdentity(c.req.raw.headers)
    const consent = getConsent(c.req.raw.headers)
    const ctx = readContext(c.req.raw.headers)
    const result = await recordEvent({
        orcid: identity?.orcid ?? null,
        ip: ctx.ip,
        ua: ctx.ua,
        ipHash: ctx.ipHash,
        uaHash: ctx.uaHash,
        articleId: BigInt(body.article_id),
        journalId: BigInt(body.journal_id),
        eventType: "view",
        source: body.source,
        consent,
    })
    return c.json(result)
})

app.post("/download", zValidator("json", downloadSchema), async (c) => {
    const limited = applyRateLimit(c.req.raw.headers)
    if (limited) return limited
    const body = c.req.valid("json")
    const identity = await getIdentity(c.req.raw.headers)
    const consent = getConsent(c.req.raw.headers)
    const ctx = readContext(c.req.raw.headers)
    const result = await recordEvent({
        orcid: identity?.orcid ?? null,
        ip: ctx.ip,
        ua: ctx.ua,
        ipHash: ctx.ipHash,
        uaHash: ctx.uaHash,
        articleId: BigInt(body.article_id),
        journalId: BigInt(body.journal_id),
        galleyId: BigInt(body.galley_id),
        eventType: "download",
        source: "pdf_view",
        consent,
    })
    return c.json(result)
})

app.post("/citation", zValidator("json", citationSchema), async (c) => {
    const limited = applyRateLimit(c.req.raw.headers)
    if (limited) return limited
    const body = c.req.valid("json")
    const identity = await getIdentity(c.req.raw.headers)
    const consent = getConsent(c.req.raw.headers)
    const ctx = readContext(c.req.raw.headers)
    const result = await recordEvent({
        orcid: identity?.orcid ?? null,
        ip: ctx.ip,
        ua: ctx.ua,
        ipHash: ctx.ipHash,
        uaHash: ctx.uaHash,
        articleId: BigInt(body.article_id),
        journalId: BigInt(body.journal_id),
        eventType: "citation_export",
        source: body.action,
        citationFormat: body.format,
        consent,
    })
    return c.json(result)
})

export { app as metricsEventsRouter }
