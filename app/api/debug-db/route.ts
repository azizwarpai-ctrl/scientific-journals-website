import { NextResponse } from "next/server"
import { ojsDiagnostic } from "@/src/features/ojs/server/ojs-client"

// Force this route to be evaluated dynamically for every request completely bypassing the cache
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
    try {
        const result = await ojsDiagnostic()
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            cacheBuster: Math.random().toString(36).substring(7),
            ...result
        })
    } catch (e: any) {
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: e.message,
            stack: e.stack
        }, { status: 500 })
    }
}
