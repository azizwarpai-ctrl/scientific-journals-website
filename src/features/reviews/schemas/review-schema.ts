import { z } from "zod"

export const reviewSchema = z.object({
    id: z.string(),
    submission_id: z.string(),
    reviewer_name: z.string(),
    reviewer_email: z.string(),
    review_status: z.string(),
    recommendation: z.string().nullable(),
    review_date: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    submission: z.object({
        manuscript_title: z.string(),
        journal: z.object({
            title: z.string(),
        }).optional(),
    }).optional(),
})

export const reviewsResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(reviewSchema).optional(),
    error: z.string().optional(),
})

export type Review = z.infer<typeof reviewSchema>
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>
