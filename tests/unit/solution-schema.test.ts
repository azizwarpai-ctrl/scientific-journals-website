import { describe, it, expect } from 'vitest'
import { solutionCreateSchema, solutionUpdateSchema, solutionIdParamSchema } from '@/src/features/solutions/schemas/solution-schema'

describe('Solution Schemas', () => {
    describe('solutionCreateSchema', () => {
        const validSolution = {
            title: 'Digital Publishing',
            description: 'Modern solutions for scientific journals.',
            icon: 'Globe',
            features: ['Open Access', 'Peer Review Control'],
            display_order: 1
        }

        it('should accept valid solution with required fields', () => {
            const result = solutionCreateSchema.safeParse(validSolution)
            expect(result.success).toBe(true)
        })

        it('should default is_published to false', () => {
            const result = solutionCreateSchema.safeParse(validSolution)
            if (result.success) {
                expect(result.data.is_published).toBe(false)
            }
        })

        it('should accept solution with all fields', () => {
            const result = solutionCreateSchema.safeParse({
                ...validSolution,
                is_published: true,
            })
            expect(result.success).toBe(true)
        })

        it('should reject empty title', () => {
            const result = solutionCreateSchema.safeParse({
                ...validSolution,
                title: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty description', () => {
            const result = solutionCreateSchema.safeParse({
                ...validSolution,
                description: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject title exceeding 255 chars', () => {
            const result = solutionCreateSchema.safeParse({
                ...validSolution,
                title: 'T'.repeat(256),
            })
            expect(result.success).toBe(false)
        })
    })

    describe('solutionUpdateSchema', () => {
        it('should accept partial update (title only)', () => {
            const result = solutionUpdateSchema.safeParse({
                title: 'Updated title',
            })
            expect(result.success).toBe(true)
        })

        it('should accept partial update (is_published only)', () => {
            const result = solutionUpdateSchema.safeParse({
                is_published: true,
            })
            expect(result.success).toBe(true)
        })

        it('should accept empty object', () => {
            const result = solutionUpdateSchema.safeParse({})
            expect(result.success).toBe(true)
        })

        it('should reject invalid field values in partial update', () => {
            const result = solutionUpdateSchema.safeParse({
                title: '',
            })
            expect(result.success).toBe(false)
        })
    })

    describe('solutionIdParamSchema', () => {
        it('should accept numeric string ID', () => {
            const result = solutionIdParamSchema.safeParse({ id: '1' })
            expect(result.success).toBe(true)
        })

        it('should reject non-numeric string', () => {
            const result = solutionIdParamSchema.safeParse({ id: 'abc' })
            expect(result.success).toBe(false)
        })

        it('should reject negative number string', () => {
            const result = solutionIdParamSchema.safeParse({ id: '-1' })
            expect(result.success).toBe(false)
        })
    })
})
