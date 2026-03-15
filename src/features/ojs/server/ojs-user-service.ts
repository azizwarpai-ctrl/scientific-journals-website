import { isOjsConfigured, provisionUser } from "@/src/features/ojs/server/ojs-client"

export interface OjsUserProvisionData {
    email: string
    firstName: string
    lastName: string
    country: string
    affiliation: string
    biography?: string
    orcid?: string
}

// We delegate user creation to the OJS API/Bridge since direct DB inserts violate read-only isolation
export async function provisionOjsUser(payload: OjsUserProvisionData): Promise<{ success: boolean; error?: string }> {
    if (!isOjsConfigured()) {
        console.warn("[OJS] Not configured, skipping OJS user provisioning")
        return { success: false, error: "OJS not configured" }
    }

    if (!payload.email || !payload.firstName || !payload.lastName) {
        return { success: false, error: "Invalid payload: missing required fields" }
    }

    try {
        return await provisionUser(payload)
    } catch (error: any) {
        console.error("[OJS] Provisioning delegation failed:", error.message)
        return { success: false, error: error.message }
    }
}
