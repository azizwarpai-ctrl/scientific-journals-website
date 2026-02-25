import { describe, it, expect, vi } from 'vitest'
import { parsePagination, paginatedResponse } from '@/src/lib/pagination'

// Mock Hono context
function createMockContext(queryParams: Record<string, string> = {}) {
    return {
        req: {
            query: (key: string) => queryParams[key] || undefined,
        },
    } as any
}

describe('Pagination Utilities', () => {
    describe('parsePagination', () => {
        it('should use defaults when no query params', () => {
            const c = createMockContext()
            const result = parsePagination(c)
            expect(result.page).toBe(1)
            expect(result.limit).toBe(20)
            expect(result.offset).toBe(0)
        })

        it('should parse page and limit from query', () => {
            const c = createMockContext({ page: '3', limit: '10' })
            const result = parsePagination(c)
            expect(result.page).toBe(3)
            expect(result.limit).toBe(10)
            expect(result.offset).toBe(20)
        })

        it('should enforce minimum page of 1', () => {
            const c = createMockContext({ page: '0' })
            const result = parsePagination(c)
            expect(result.page).toBe(1)
        })

        it('should enforce minimum limit of 1', () => {
            const c = createMockContext({ limit: '0' })
            const result = parsePagination(c)
            expect(result.limit).toBe(1)
        })

        it('should cap limit at default maxLimit (100)', () => {
            const c = createMockContext({ limit: '500' })
            const result = parsePagination(c)
            expect(result.limit).toBe(100)
        })

        it('should cap limit at custom maxLimit', () => {
            const c = createMockContext({ limit: '50' })
            const result = parsePagination(c, 25)
            expect(result.limit).toBe(25)
        })

        it('should handle negative page', () => {
            const c = createMockContext({ page: '-5' })
            const result = parsePagination(c)
            expect(result.page).toBe(1)
        })

        it('should calculate correct offset', () => {
            const c = createMockContext({ page: '5', limit: '10' })
            const result = parsePagination(c)
            expect(result.offset).toBe(40)
        })

        it('should handle non-numeric page gracefully', () => {
            const c = createMockContext({ page: 'abc' })
            const result = parsePagination(c)
            expect(result.page).toBe(1) // NaN -> Math.max(1, NaN) = 1
        })
    })

    describe('paginatedResponse', () => {
        it('should build correct response for first page', () => {
            const result = paginatedResponse(
                [{ id: '1' }, { id: '2' }],
                50,
                { page: 1, limit: 20, offset: 0 }
            )
            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(2)
            expect(result.pagination.page).toBe(1)
            expect(result.pagination.total).toBe(50)
            expect(result.pagination.totalPages).toBe(3)
            expect(result.pagination.hasNext).toBe(true)
            expect(result.pagination.hasPrev).toBe(false)
        })

        it('should build correct response for last page', () => {
            const result = paginatedResponse(
                [{ id: '41' }],
                41,
                { page: 3, limit: 20, offset: 40 }
            )
            expect(result.pagination.hasNext).toBe(false)
            expect(result.pagination.hasPrev).toBe(true)
        })

        it('should handle empty dataset', () => {
            const result = paginatedResponse(
                [],
                0,
                { page: 1, limit: 20, offset: 0 }
            )
            expect(result.data).toHaveLength(0)
            expect(result.pagination.total).toBe(0)
            expect(result.pagination.totalPages).toBe(0)
            expect(result.pagination.hasNext).toBe(false)
            expect(result.pagination.hasPrev).toBe(false)
        })

        it('should handle single page exactly full', () => {
            const data = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }))
            const result = paginatedResponse(data, 20, { page: 1, limit: 20, offset: 0 })
            expect(result.pagination.totalPages).toBe(1)
            expect(result.pagination.hasNext).toBe(false)
        })

        it('should build correct totalPages for partial last page', () => {
            const result = paginatedResponse([], 21, { page: 1, limit: 20, offset: 0 })
            expect(result.pagination.totalPages).toBe(2)
        })
    })
})
