import { NextResponse } from "next/server"
import {
    buildRecordDismissCookieHeader,
    getConsent,
} from "@/src/lib/consent"

export async function POST(request: Request) {
    const prev = getConsent(request.headers)
    const setCookie = buildRecordDismissCookieHeader({ prev })
    return NextResponse.json(
        { success: true, dismissed: true },
        {
            status: 200,
            headers: { "Set-Cookie": setCookie },
        }
    )
}
