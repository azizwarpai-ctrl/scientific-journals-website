import { Hono } from "hono"
import { prisma } from "@/src/lib/db/config"
import { reviewsResponseSchema } from "../schemas/review-schema"

const app = new Hono()

app.get("/", async (c) => {
    try {
        const reviewsData = await prisma.review.findMany({
            orderBy: { created_at: "desc" },
            include: {
                submission: {
                    include: {
                        journal: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            }
        })

        // Map Prisma objects to strict JSON-serializable schema objects
        const mappedReviews = reviewsData.map((r: any) => ({
            id: r.id,
            submission_id: r.submission_id,
            reviewer_name: r.reviewer_name,
            reviewer_email: r.reviewer_email,
            review_status: r.review_status,
            recommendation: r.recommendation,
            review_date: r.review_date ? r.review_date.toISOString() : null,
            created_at: r.created_at.toISOString(),
            updated_at: r.updated_at.toISOString(),
            submission: r.submission ? {
                manuscript_title: r.submission.manuscript_title,
                journal: r.submission.journal ? {
                    title: r.submission.journal.title
                } : undefined
            } : undefined
        }))

        const payload = { success: true, data: mappedReviews }

        const validated = reviewsResponseSchema.safeParse(payload)
        if (!validated.success) {
            console.error("Review response validation failed:", validated.error.flatten())
            return c.json({ success: false, error: "Validation error" }, 500)
        }

        return c.json(validated.data, 200)
    } catch (error) {
        console.error("Failed to fetch reviews:", error)
        return c.json({ success: false, error: "Failed to fetch reviews" }, 500)
    }
})

export { app as reviewsRouter }
