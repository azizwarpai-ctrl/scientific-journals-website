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
        const {
            title,
            issn,
            description,
            subject_area,
            impact_factor,
            frequency,
            open_access,
            peer_review_type,
            submission_fee,
            publication_fee,
        } = body

        // Validate required fields
        if (!title || !issn || !description || !subject_area) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Insert journal into database
        const result = await query(
            `INSERT INTO journals (
        title, issn, description, subject_area, impact_factor, 
        frequency, open_access, peer_review_type, submission_fee, 
        publication_fee, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) 
      RETURNING id`,
            [
                title,
                issn,
                description,
                subject_area,
                impact_factor || null,
                frequency || "quarterly",
                open_access || false,
                peer_review_type || "double-blind",
                submission_fee || 0,
                publication_fee || 0,
                "active",
            ]
        )

        return NextResponse.json(
            {
                success: true,
                id: result.rows[0].id,
                message: "Journal created successfully"
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error creating journal:", error)
        return NextResponse.json(
            { error: "Failed to create journal" },
            { status: 500 }
        )
    }
}
