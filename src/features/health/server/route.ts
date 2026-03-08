import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { prisma } from "@/lib/db/config"
import { isOjsConfigured, ojsHealthCheck } from "@/src/features/ojs/server/ojs-client"

export const healthRouter = new Hono()
    .get(
        "/",
        async (c) => {
            try {
                const startTime = Date.now()
                
                // 1. Internal DB Check
                let internalDbStatus = "disconnected"
                let internalLatency = 0
                try {
                    const internalStart = Date.now()
                    await prisma.$queryRaw`SELECT 1`
                    internalLatency = Date.now() - internalStart
                    internalDbStatus = "connected"
                } catch (e) {
                    internalDbStatus = "error"
                }

                // 2. External OJS DB Check
                let externalDbStatus = "unconfigured"
                let externalLatency = 0
                let externalError = null

                if (isOjsConfigured()) {
                    const ojsHealth = await ojsHealthCheck()
                    externalDbStatus = ojsHealth.ok ? "connected" : "error"
                    externalLatency = ojsHealth.latencyMs || 0
                    if (!ojsHealth.ok) externalError = ojsHealth.error
                }

                const totalLatency = Date.now() - startTime
                const isHealthy = internalDbStatus === "connected" && 
                                  (externalDbStatus === "unconfigured" || externalDbStatus === "connected")

                return c.json({
                    status: isHealthy ? "operational" : "degraded",
                    timestamp: new Date().toISOString(),
                    latency: totalLatency,
                    dependencies: {
                        internalDatabase: {
                            status: internalDbStatus,
                            latencyMs: internalLatency
                        },
                        externalOjsDatabase: {
                            status: externalDbStatus,
                            latencyMs: externalLatency,
                            error: externalError
                        }
                    }
                }, isHealthy ? 200 : 503)
            } catch (error) {
                console.error("[HEALTH_PROBE_ERROR]", error)
                return c.json({ status: "error", message: "Failed to run health probe" }, 500)
            }
        }
    )
