import type { Context } from "hono"

/**
 * Standard pagination parameters parsed from query string.
 */
export interface PaginationParams {
    page: number
    limit: number
    offset: number
}

/**
 * Standard paginated response envelope.
 */
export interface PaginatedResponse<T> {
    success: true
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

/**
 * Parse pagination query parameters from a Hono context.
 * Defaults: page=1, limit=20, maxLimit=100
 */
export function parsePagination(c: Context, maxLimit = 100): PaginationParams {
    const rawPage = parseInt(c.req.query("page") || "1")
    const rawLimit = parseInt(c.req.query("limit") || "20")
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage)
    const limit = Math.min(maxLimit, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit))
    const offset = (page - 1) * limit

    return { page, limit, offset }
}

/**
 * Build a paginated JSON response.
 */
export function paginatedResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / params.limit)

    return {
        success: true,
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages,
            hasNext: params.page < totalPages,
            hasPrev: params.page > 1,
        },
    }
}
