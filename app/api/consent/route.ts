import { NextResponse } from "next/server"
import { z } from "zod"
import {
    buildSetConsentCookieHeader,
    getConsent,
} from "@/src/lib/consent"

const bodySchema = z.object({
    choice: z.enum(["all", "essential_only", "customize"]),
    granular: z
        .object({
            analytics: z.boolean(),
            personalization: z.boolean(),
        })
        .optional(),
})

export async function POST(request: Request) {
    let json: unknown
    try {
        json = await request.json()
    } catch {
        return NextResponse.json(
            { success: false, error: "INVALID_REQUEST" },
            { status: 400 }
        )
    }
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, error: "INVALID_REQUEST", details: parsed.error.flatten() },
            { status: 400 }
        )
    }
    const prev = getConsent(request.headers)
    const setCookie = buildSetConsentCookieHeader({
        choice: parsed.data.choice,
        granular: parsed.data.granular,
        prevDismissCount: prev?.dismiss_count ?? 0,
    })
    return NextResponse.json(
        { success: true, choice: parsed.data.choice },
        {
            status: 200,
            headers: { "Set-Cookie": setCookie },
        }
    )
}
