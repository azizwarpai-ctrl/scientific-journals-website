import { describe, it, expect } from 'vitest'
import { faqCreateSchema, faqUpdateSchema, faqIdParamSchema } from '@/src/features/faq/schemas/faq-schema'

describe('FAQ Schemas', () => {
    describe('faqCreateSchema', () => {
        const validFAQ = {
            question: 'How do I submit a manuscript?',
            answer: 'Navigate to the submission portal and follow the steps.',
            display_order: 1
        }

        it('should accept valid FAQ with required fields', () => {
            const result = faqCreateSchema.safeParse(validFAQ)
            expect(result.success).toBe(true)
        })

        it('should default is_published to false', () => {
            const result = faqCreateSchema.safeParse(validFAQ)
            if (result.success) {
                expect(result.data.is_published).toBe(false)
            }
        })

        it('should reject empty question', () => {
            const result = faqCreateSchema.safeParse({
                ...validFAQ,
                question: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty answer', () => {
            const result = faqCreateSchema.safeParse({
                ...validFAQ,
                answer: '',
            })
            expect(result.success).toBe(false)
        })
    })

    describe('faqUpdateSchema', () => {
        it('should accept partial update (question only)', () => {
            const result = faqUpdateSchema.safeParse({
                question: 'Updated question?',
            })
            expect(result.success).toBe(true)
        })

        it('should accept partial update (is_published only)', () => {
            const result = faqUpdateSchema.safeParse({
                is_published: true,
            })
            expect(result.success).toBe(true)
        })
    })

    describe('faqIdParamSchema', () => {
        it('should accept numeric string ID', () => {
            const result = faqIdParamSchema.safeParse({ id: '1' })
            expect(result.success).toBe(true)
        })

        it('should reject non-numeric string ID', () => {
            const result = faqIdParamSchema.safeParse({ id: 'abc' })
            expect(result.success).toBe(false)
        })

        it('should reject negative number string', () => {
            const result = faqIdParamSchema.safeParse({ id: '-1' })
            expect(result.success).toBe(false)
        })
    })
})
