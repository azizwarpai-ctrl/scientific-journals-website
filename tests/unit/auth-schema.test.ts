import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, registerFormSchema } from '@/src/features/auth/schemas/auth-schema'

describe('Auth Schemas', () => {
    // ═══════════════════════════════════════
    // loginSchema
    // ═══════════════════════════════════════
    describe('loginSchema', () => {
        it('should accept valid email and password', () => {
            const result = loginSchema.safeParse({
                email: 'user@example.com',
                password: 'password123',
            })
            expect(result.success).toBe(true)
        })

        it('should reject invalid email format', () => {
            const result = loginSchema.safeParse({
                email: 'notanemail',
                password: 'password123',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty email', () => {
            const result = loginSchema.safeParse({
                email: '',
                password: 'password123',
            })
            expect(result.success).toBe(false)
        })

        it('should reject empty password', () => {
            const result = loginSchema.safeParse({
                email: 'user@example.com',
                password: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject missing fields', () => {
            const result = loginSchema.safeParse({})
            expect(result.success).toBe(false)
        })

        it('should accept minimal valid password (1 char)', () => {
            const result = loginSchema.safeParse({
                email: 'user@example.com',
                password: 'x',
            })
            expect(result.success).toBe(true)
        })
    })

    // ═══════════════════════════════════════
    // registerSchema
    // ═══════════════════════════════════════
    describe('registerSchema', () => {
        it('should accept valid registration data', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: 'securepass123',
                fullName: 'John Doe',
            })
            expect(result.success).toBe(true)
        })

        it('should reject password shorter than 6 chars', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: '12345',
                fullName: 'John Doe',
            })
            expect(result.success).toBe(false)
        })

        it('should accept password of exactly 6 chars', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: '123456',
                fullName: 'John Doe',
            })
            expect(result.success).toBe(true)
        })

        it('should reject empty fullName', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: 'securepass',
                fullName: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject fullName exceeding 255 chars', () => {
            const result = registerSchema.safeParse({
                email: 'newuser@example.com',
                password: 'securepass',
                fullName: 'A'.repeat(256),
            })
            expect(result.success).toBe(false)
        })

        it('should reject invalid email', () => {
            const result = registerSchema.safeParse({
                email: 'not-valid',
                password: 'securepass',
                fullName: 'John Doe',
            })
            expect(result.success).toBe(false)
        })
    })

    // ═══════════════════════════════════════
    // registerFormSchema (with password confirmation)
    // ═══════════════════════════════════════
    describe('registerFormSchema', () => {
        const validData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'secure123',
            confirmPassword: 'secure123',
            role: 'author',
            agreeToTerms: true,
        }

        it('should accept valid form data', () => {
            const result = registerFormSchema.safeParse(validData)
            expect(result.success).toBe(true)
        })

        it('should reject mismatched passwords', () => {
            const result = registerFormSchema.safeParse({
                ...validData,
                confirmPassword: 'different',
            })
            expect(result.success).toBe(false)
        })

        it('should reject when agreeToTerms is false', () => {
            const result = registerFormSchema.safeParse({
                ...validData,
                agreeToTerms: false,
            })
            expect(result.success).toBe(false)
        })

        it('should reject missing firstName', () => {
            const result = registerFormSchema.safeParse({
                ...validData,
                firstName: '',
            })
            expect(result.success).toBe(false)
        })

        it('should reject missing role', () => {
            const result = registerFormSchema.safeParse({
                ...validData,
                role: '',
            })
            expect(result.success).toBe(false)
        })
    })
})
