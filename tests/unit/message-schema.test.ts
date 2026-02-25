import { describe, it, expect } from 'vitest'
import { messageCreateSchema, messageUpdateSchema, messageIdParamSchema } from '@/src/features/messages/schemas/message-schema'

describe('Message Schemas', () => {
    // ═══════════════════════════════════════
    // messageCreateSchema
    // ═══════════════════════════════════════
    describe('messageCreateSchema', () => {
        const validMessage = {
            name: 'Mohammed Tazi',
            email: 'mohammed@example.com',
            subject: 'Inquiry about submission',
            message: 'Hello, I have a question about the submission process.',
        }

        it('should accept valid message with required fields', () => {
            const result = messageCreateSchema.safeParse(validMessage)
            expect(result.success).toBe(true)
        })

        it('should default message_type to "general"', () => {
            const result = messageCreateSchema.safeParse(validMessage)
            if (result.success) {
                expect(result.data.message_type).toBe('general')
            }
        })

        it('should accept all valid message types', () => {
            const types = ['general', 'submission_help', 'technical_support', 'editorial', 'partnership', 'other']
            for (const message_type of types) {
                const result = messageCreateSchema.safeParse({ ...validMessage, message_type })
                expect(result.success).toBe(true)
            }
        })

        it('should reject invalid message_type', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                message_type: 'invalid_type',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty name', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                name: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty subject', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                subject: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty message body', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                message: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject invalid email', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                email: 'not-an-email',
            })
            expect(result.success).toBe(false)
        })

        it('should reject message exceeding 5000 chars', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                message: 'X'.repeat(5001),
            })
            expect(result.success).toBe(false)
        })

        it('should accept message of exactly 5000 chars', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                message: 'X'.repeat(5000),
            })
            expect(result.success).toBe(true)
        })

        it('should reject name exceeding 255 chars', () => {
            const result = messageCreateSchema.safeParse({
                ...validMessage,
                name: 'X'.repeat(256),
            })
            expect(result.success).toBe(false)
        })
    })

    // ═══════════════════════════════════════
    // messageUpdateSchema
    // ═══════════════════════════════════════
    describe('messageUpdateSchema', () => {
        it('should accept valid status update', () => {
            const statuses = ['unread', 'read', 'replied', 'archived']
            for (const status of statuses) {
                const result = messageUpdateSchema.safeParse({ status })
                expect(result.success).toBe(true)
            }
        })

        it('should reject invalid status', () => {
            const result = messageUpdateSchema.safeParse({ status: 'deleted' })
            expect(result.success).toBe(false)
        })

        it('should accept empty object', () => {
            const result = messageUpdateSchema.safeParse({})
            expect(result.success).toBe(true)
        })
    })

    // ═══════════════════════════════════════
    // messageIdParamSchema
    // ═══════════════════════════════════════
    describe('messageIdParamSchema', () => {
        it('should accept numeric string ID', () => {
            const result = messageIdParamSchema.safeParse({ id: '42' })
            expect(result.success).toBe(true)
        })

        it('should reject non-numeric string', () => {
            const result = messageIdParamSchema.safeParse({ id: 'abc' })
            expect(result.success).toBe(false)
        })

        it('should reject mixed alphanumeric', () => {
            const result = messageIdParamSchema.safeParse({ id: '12abc' })
            expect(result.success).toBe(false)
        })
    })
})
