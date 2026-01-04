import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message, type = "technical_support" } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Insert message into database
    const result = await query(
      `INSERT INTO messages (name, email, subject, message, type, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id`,
      [name, email, subject, message, type, "unread"]
    )

    return NextResponse.json(
      { 
        success: true, 
        id: result.rows[0].id,
        message: "Message sent successfully" 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating message:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
