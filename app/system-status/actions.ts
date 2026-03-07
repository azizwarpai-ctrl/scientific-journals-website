"use server"

import { ojsDiagnostic } from "@/src/features/ojs/server/ojs-client"

export async function runOjsDiagnosticAction() {
    try {
        const result = await ojsDiagnostic()
        return {
            timestamp: new Date().toISOString(),
            ...result
        }
    } catch (e: any) {
        return {
            ok: false,
            error: e.message,
            timestamp: new Date().toISOString()
        }
    }
}
