import { describe, it, expect } from 'vitest'
import {
  checkoutSchema,
  pricingPlanCreateSchema,
  pricingPlanUpdateSchema,
  pricingPlanIdParamSchema,
  pricingPlanSlugParamSchema,
  pricingPlanToggleSchema,
  pricingPlanReorderSchema,
} from '@/src/features/billing/schemas/billing-schema'

describe('Billing Schemas', () => {
  describe('checkoutSchema', () => {
    it('accepts numeric pricingPlanId', () => {
      const result = checkoutSchema.safeParse({ pricingPlanId: 10 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pricingPlanId).toBe(10)
      }
    })

    it('transforms string pricingPlanId to number', () => {
      const result = checkoutSchema.safeParse({ pricingPlanId: '42' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pricingPlanId).toBe(42)
      }
    })

    it('rejects missing pricingPlanId', () => {
      const result = checkoutSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('pricingPlanCreateSchema', () => {
    const validBase = {
      name: 'Standard Tier',
      price: 49.99,
      description: 'Standard plan for individual journals',
      features: { 'OJS Sync': true, 'DOI Registration': false },
    }

    it('accepts valid plan with required fields and defaults', () => {
      const result = pricingPlanCreateSchema.safeParse(validBase)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Standard Tier')
        expect(result.data.price).toBe(49.99)
        expect(result.data.currency).toBe('USD')
        expect(result.data.billing_interval).toBe('one_time')
        expect(result.data.cta_label).toBe('Get Started')
      }
    })

    it('accepts features as an array of strings', () => {
      const result = pricingPlanCreateSchema.safeParse({
        ...validBase,
        features: ['OJS 3.x support', 'Priority indexing', 'SSL included'],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data.features)).toBe(true)
      }
    })

    it('accepts valid kebab-case slug', () => {
      const result = pricingPlanCreateSchema.safeParse({
        ...validBase,
        slug: 'pro-author-pack-2026',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.slug).toBe('pro-author-pack-2026')
      }
    })

    it('rejects invalid slug format', () => {
      const result = pricingPlanCreateSchema.safeParse({
        ...validBase,
        slug: 'Invalid Slug!',
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative price', () => {
      const result = pricingPlanCreateSchema.safeParse({
        ...validBase,
        price: -10,
      })
      expect(result.success).toBe(false)
    })

    it('supports both camelCase (isActive, isPopular) and snake_case (is_active, is_popular)', () => {
      const camelResult = pricingPlanCreateSchema.safeParse({
        ...validBase,
        isActive: true,
        isPopular: true,
        stripePriceId: 'price_123',
      })
      expect(camelResult.success).toBe(true)

      const snakeResult = pricingPlanCreateSchema.safeParse({
        ...validBase,
        is_active: true,
        is_popular: false,
        stripe_price_id: 'price_456',
      })
      expect(snakeResult.success).toBe(true)
    })
  })

  describe('pricingPlanUpdateSchema', () => {
    it('accepts partial updates', () => {
      const result = pricingPlanUpdateSchema.safeParse({
        price: 99.0,
        is_popular: true,
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty update object', () => {
      const result = pricingPlanUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('pricingPlanIdParamSchema', () => {
    it('accepts valid string id', () => {
      const result = pricingPlanIdParamSchema.safeParse({ id: '123' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('123')
      }
    })

    it('transforms number id to string', () => {
      const result = pricingPlanIdParamSchema.safeParse({ id: 456 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('456')
      }
    })
  })

  describe('pricingPlanSlugParamSchema', () => {
    it('accepts valid slug', () => {
      const result = pricingPlanSlugParamSchema.safeParse({ slug: 'enterprise-package' })
      expect(result.success).toBe(true)
    })

    it('rejects empty slug', () => {
      const result = pricingPlanSlugParamSchema.safeParse({ slug: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('toggle and reorder schemas', () => {
    it('validates toggle payload', () => {
      expect(pricingPlanToggleSchema.safeParse({ is_active: false }).success).toBe(true)
      expect(pricingPlanToggleSchema.safeParse({ isActive: false }).success).toBe(true)
    })

    it('validates reorder payload', () => {
      expect(pricingPlanReorderSchema.safeParse({ sort_order: 5 }).success).toBe(true)
      expect(pricingPlanReorderSchema.safeParse({ sort_order: 'not_a_number' }).success).toBe(false)
    })
  })
})
