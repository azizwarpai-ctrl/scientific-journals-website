import { describe, it, expect } from 'vitest'
import { solutionCreateSchema, solutionUpdateSchema, solutionIdParamSchema } from '@/src/features/solutions/schemas/solution-schema'

describe('Solution Schemas', () => {
    // ═══════════════════════════════════════
    // solutionCreateSchema
    // ═══════════════════════════════════════
    describe('solutionCreateSchema', () => {
        const validSolution = {
            question: 'How do I submit a manuscript?',
            answer: 'Navigate to the submission portal and follow the steps.',
        }

        it('should accept valid solution with required fields', () => {
            const result = solutionCreateSchema.safeParse(validSolution)
            expect(result.success).toBe(true)
        })

        it('should default category to "general"', () => {
            const result = solutionCreateSchema.safeParse(validSolution)
            if (result.success) {
                expect(result.data.category).toBe('general')
            }
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
                category: 'Submission Process',
                is_published: true,
            })
            expect(result.success).toBe(true)
        })

        it('should reject empty question', () => {
            const result = solutionCreateSchema.safeParse({
                question: '',
                answer: 'Some answer',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty answer', () => {
            const result = solutionCreateSchema.safeParse({
                question: 'Some question?',
                answer: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject question exceeding 1000 chars', () => {
            const result = solutionCreateSchema.safeParse({
                question: 'Q'.repeat(1001),
                answer: 'Some answer',
            })
            expect(result.success).toBe(false)
        })

        it('should reject answer exceeding 10000 chars', () => {
            const result = solutionCreateSchema.safeParse({
                question: 'Some question?',
                answer: 'A'.repeat(10001),
            })
            expect(result.success).toBe(false)
        })

        it('should accept answer of exactly 10000 chars', () => {
            const result = solutionCreateSchema.safeParse({
                question: 'Some question?',
                answer: 'A'.repeat(10000),
            })
            expect(result.success).toBe(true)
        })

        it('should reject category exceeding 100 chars', () => {
            const result = solutionCreateSchema.safeParse({
                ...validSolution,
                category: 'C'.repeat(101),
            })
            expect(result.success).toBe(false)
        })
    })

    // ═══════════════════════════════════════
    // solutionUpdateSchema (partial)
    // ═══════════════════════════════════════
    describe('solutionUpdateSchema', () => {
        it('should accept partial update (question only)', () => {
            const result = solutionUpdateSchema.safeParse({
                question: 'Updated question?',
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
                question: '',
            })
            expect(result.success).toBe(false)
        })
    })

    // ═══════════════════════════════════════
    // solutionIdParamSchema
    // ═══════════════════════════════════════
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
