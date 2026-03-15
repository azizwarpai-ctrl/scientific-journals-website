import { isOjsConfigured, provisionUser } from "@/src/features/ojs/server/ojs-client"
import type { OjsUserProvisionData } from "../types"

// We delegate user creation to the OJS API/Bridge since direct DB inserts violate read-only isolation
export async function provisionOjsUser(payload: OjsUserProvisionData): Promise<{ success: boolean; error?: string }> {
    if (!isOjsConfigured()) {
        console.warn("[OJS] Not configured, skipping OJS user provisioning")
        return { success: false, error: "OJS not configured" }
    }

    if (!payload.email || !payload.firstName || !payload.lastName) {
        return { success: false, error: "Invalid payload: missing required fields" }
    }

    return await provisionUser(payload)
}
