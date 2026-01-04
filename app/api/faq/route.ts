import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import { getSession } from "@/lib/db/auth"

export async function POST(request: NextRequest) {
    try {
        // Verify admin authentication
        const session = await getSession()
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { question, answer, category = "general" } = body

        // Validate required fields
        if (!question || !answer) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Insert FAQ into database
        const result = await query(
            `INSERT INTO faq_solutions (question, answer, category, created_at, updated_at) 
       VALUES ($1, $2, $3, NOW(), NOW()) 
       RETURNING id`,
            [question, answer, category]
        )

        return NextResponse.json(
            {
                success: true,
                id: result.rows[0].id,
                message: "FAQ created successfully"
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error creating FAQ:", error)
        return NextResponse.json(
            { error: "Failed to create FAQ" },
            { status: 500 }
        )
    }
}
