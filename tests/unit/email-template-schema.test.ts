import { describe, it, expect } from 'vitest'
import {
  emailTemplateCreateSchema,
  emailTemplateUpdateSchema,
  emailTemplateIdParamSchema,
  emailTemplatePreviewSchema,
  emailTemplateSendTestSchema,
} from '@/src/features/email-templates/schemas/email-template-schema'

describe('Email Template Schemas', () => {
  // ═══════════════════════════════════════
  // emailTemplateCreateSchema
  // ═══════════════════════════════════════
  describe('emailTemplateCreateSchema', () => {
    const validTemplate = {
      name: 'welcome-email',
      subject: 'Welcome to DigitoPub',
      html_content: '<h1>Hello {{userName}}</h1>',
    }

    it('should accept valid template with required fields', () => {
      const result = emailTemplateCreateSchema.safeParse(validTemplate)
      expect(result.success).toBe(true)
    })

    it('should default is_active to true', () => {
      const result = emailTemplateCreateSchema.safeParse(validTemplate)
      if (result.success) {
        expect(result.data.is_active).toBe(true)
      }
    })

    it('should accept template with all fields', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        text_content: 'Hello {{userName}}',
        variables: ['userName'],
        description: 'Welcome email template',
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        name: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name with uppercase letters', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        name: 'Welcome-Email',
      })
      expect(result.success).toBe(false)
    })

    it('should reject name with spaces', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        name: 'welcome email',
      })
      expect(result.success).toBe(false)
    })

    it('should accept name with hyphens and underscores', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        name: 'welcome-email_v2',
      })
      expect(result.success).toBe(true)
    })

    it('should reject name exceeding 100 chars', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        name: 'a'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty subject', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        subject: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject subject exceeding 500 chars', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        subject: 'S'.repeat(501),
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty html_content', () => {
      const result = emailTemplateCreateSchema.safeParse({
        ...validTemplate,
        html_content: '',
      })
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════
  // emailTemplateUpdateSchema (partial)
  // ═══════════════════════════════════════
  describe('emailTemplateUpdateSchema', () => {
    it('should accept partial update (subject only)', () => {
      const result = emailTemplateUpdateSchema.safeParse({
        subject: 'Updated Subject',
      })
      expect(result.success).toBe(true)
    })

    it('should accept partial update (is_active only)', () => {
      const result = emailTemplateUpdateSchema.safeParse({
        is_active: false,
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = emailTemplateUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid name in partial update', () => {
      const result = emailTemplateUpdateSchema.safeParse({
        name: 'INVALID NAME',
      })
      expect(result.success).toBe(false)
    })

    it('should accept null text_content', () => {
      const result = emailTemplateUpdateSchema.safeParse({
        text_content: null,
      })
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════════════════════════
  // emailTemplateIdParamSchema
  // ═══════════════════════════════════════
  describe('emailTemplateIdParamSchema', () => {
    it('should accept numeric string ID', () => {
      const result = emailTemplateIdParamSchema.safeParse({ id: '1' })
      expect(result.success).toBe(true)
    })

    it('should accept large numeric ID', () => {
      const result = emailTemplateIdParamSchema.safeParse({ id: '999999' })
      expect(result.success).toBe(true)
    })

    it('should reject non-numeric string', () => {
      const result = emailTemplateIdParamSchema.safeParse({ id: 'abc' })
      expect(result.success).toBe(false)
    })

    it('should reject negative number string', () => {
      const result = emailTemplateIdParamSchema.safeParse({ id: '-1' })
      expect(result.success).toBe(false)
    })
  })

  // ═══════════════════════════════════════
  // emailTemplatePreviewSchema
  // ═══════════════════════════════════════
  describe('emailTemplatePreviewSchema', () => {
    it('should accept empty variables', () => {
      const result = emailTemplatePreviewSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept variables object', () => {
      const result = emailTemplatePreviewSchema.safeParse({
        variables: { userName: 'John', email: 'john@test.com' },
      })
      expect(result.success).toBe(true)
    })
  })

  // ═══════════════════════════════════════
  // emailTemplateSendTestSchema
  // ═══════════════════════════════════════
  describe('emailTemplateSendTestSchema', () => {
    it('should accept valid email and variables', () => {
      const result = emailTemplateSendTestSchema.safeParse({
        to: 'test@example.com',
        variables: { name: 'Test' },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = emailTemplateSendTestSchema.safeParse({
        to: 'not-an-email',
      })
      expect(result.success).toBe(false)
    })

    it('should require email address', () => {
      const result = emailTemplateSendTestSchema.safeParse({
        variables: { name: 'Test' },
      })
      expect(result.success).toBe(false)
    })
  })
})
