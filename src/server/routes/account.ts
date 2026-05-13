/**
 * Account self-service: GET /stats, DELETE /data.
 * Both require a valid digitopub_identity cookie.
 */

import { Hono } from "hono"
import { prisma } from "@/src/lib/db/config"
import {
    buildClearCookieHeader,
    getIdentity,
    invalidateRevocationCache,
} from "@/src/lib/identity-cookie"

const app = new Hono()

function err(code: string, status: number, message?: string) {
    return new Response(JSON.stringify({ success: false, error: code, message }), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

app.get("/stats", async (c) => {
    const identity = await getIdentity(c.req.raw.headers)
    if (!identity) return err("UNAUTHENTICATED", 401, "Sign in with ORCID.")

    const lifetime = await prisma.userMetrics.findUnique({
        where: { orcid: identity.orcid },
    })

    // Last 12 months of monthly rollup, including empty months.
    const now = new Date()
    const months: Array<{ year: number; month: number }> = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
        months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 })
    }

    // Build monthly counts directly from user_event for THIS orcid (the
    // aggregate tables are not per-ORCID).
    const start = new Date(Date.UTC(months[0].year, months[0].month - 1, 1))
    interface Row {
        ym: string
        views: bigint
        downloads: bigint
        citations: bigint
    }
    const rows = await prisma.$queryRawUnsafe<Row[]>(
        `SELECT
            DATE_FORMAT(created_at, '%Y-%m') AS ym,
            SUM(CASE WHEN event_type='view' THEN 1 ELSE 0 END) AS views,
            SUM(CASE WHEN event_type='download' THEN 1 ELSE 0 END) AS downloads,
            SUM(CASE WHEN event_type='citation_export' THEN 1 ELSE 0 END) AS citations
         FROM user_event
         WHERE orcid = ? AND created_at >= ?
         GROUP BY ym`,
        identity.orcid,
        start
    )
    const byKey = new Map(rows.map((r) => [r.ym, r]))

    const monthly = months.map(({ year, month }) => {
        const key = `${year}-${String(month).padStart(2, "0")}`
        const r = byKey.get(key)
        return {
            year,
            month,
            views: Number(r?.views ?? BigInt(0)),
            downloads: Number(r?.downloads ?? BigInt(0)),
            citations: Number(r?.citations ?? BigInt(0)),
        }
    })

    return c.json({
        success: true,
        data: {
            orcid: identity.orcid,
            lifetime: {
                views: lifetime?.views ?? 0,
                downloads: lifetime?.downloads ?? 0,
                citations: lifetime?.citations ?? 0,
                first_seen_at: lifetime?.first_seen_at?.toISOString() ?? null,
                last_event_at: lifetime?.last_event_at?.toISOString() ?? null,
            },
            monthly,
        },
    })
})

app.delete("/data", async (c) => {
    const identity = await getIdentity(c.req.raw.headers)
    if (!identity) return err("UNAUTHENTICATED", 401, "Sign in with ORCID.")

    const now = Math.floor(Date.now() / 1000)

    // Delete in a transaction so partial-state recovery is clean.
    const result = await prisma.$transaction(async (tx) => {
        const userEventRows = await tx.userEvent.deleteMany({
            where: { orcid: identity.orcid },
        })
        const userMetricsRows = await tx.userMetrics.deleteMany({
            where: { orcid: identity.orcid },
        })
        const linkRows = await tx.userOrcidLink.deleteMany({
            where: { orcid: identity.orcid },
        })
        await tx.revokedOrcid.upsert({
            where: { orcid: identity.orcid },
            create: { orcid: identity.orcid, cookie_iat_min: now },
            update: { cookie_iat_min: now, revoked_at: new Date() },
        })
        return {
            user_event_rows: userEventRows.count,
            user_metrics_rows: userMetricsRows.count,
            user_orcid_links_rows: linkRows.count,
        }
    })

    invalidateRevocationCache(identity.orcid)

    return new Response(
        JSON.stringify({
            success: true,
            deleted: result,
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": buildClearCookieHeader(),
            },
        }
    )
})

export { app as accountRouter }
