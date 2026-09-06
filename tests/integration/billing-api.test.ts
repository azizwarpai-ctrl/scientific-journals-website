import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { billingRouter } from '@/src/features/billing/server'
import { prisma } from '@/src/lib/db/config'

let mockSession: any = null

vi.mock('@/src/lib/db/auth', () => ({
  getSession: vi.fn(() => mockSession),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

vi.mock('@/src/lib/db/config', () => ({
  prisma: {
    pricingPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    checkoutSession: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
  },
}))

function createApp() {
  const app = new Hono()
  app.route('/billing', billingRouter)
  return app
}

describe('Billing API Routes', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
    mockSession = null
  })

  describe('GET /billing/plans & /billing/pricing-plans (Public)', () => {
    it('returns active plans at /billing/plans without authentication', async () => {
      const mockPlans = [
        {
          id: BigInt(1),
          name: 'Starter',
          slug: 'starter',
          description: 'Basic plan',
          price: 0,
          currency: 'USD',
          billing_interval: 'one_time',
          features: { 'OJS Sync': true },
          is_active: true,
          is_popular: false,
          is_featured: false,
          sort_order: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      vi.mocked(prisma.pricingPlan.findMany).mockResolvedValueOnce(mockPlans as any)

      const res = await app.request('/billing/plans')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Starter')
      expect(json.data[0].id).toBe('1') // BigInt serialized to string
    })

    it('returns active plans at /billing/pricing-plans alias without authentication', async () => {
      const mockPlans = [
        {
          id: BigInt(2),
          name: 'Pro',
          slug: 'pro',
          description: 'Pro plan',
          price: 99,
          currency: 'USD',
          billing_interval: 'one_time',
          features: { 'Custom Domain': true },
          is_active: true,
          is_popular: true,
          is_featured: true,
          sort_order: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]
      vi.mocked(prisma.pricingPlan.findMany).mockResolvedValueOnce(mockPlans as any)

      const res = await app.request('/billing/pricing-plans')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].name).toBe('Pro')
    })
  })

  describe('GET /billing/plans/:id & /billing/plans/slug/:slug', () => {
    it('returns a plan by ID if found', async () => {
      const mockPlan = {
        id: BigInt(1),
        name: 'Starter',
        slug: 'starter',
        price: 0,
        currency: 'USD',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
      vi.mocked(prisma.pricingPlan.findUnique).mockResolvedValueOnce(mockPlan as any)

      const res = await app.request('/billing/plans/1')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.name).toBe('Starter')
    })

    it('returns 404 when plan ID is not found', async () => {
      vi.mocked(prisma.pricingPlan.findUnique).mockResolvedValueOnce(null)

      const res = await app.request('/billing/plans/999')
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.success).toBe(false)
    })

    it('returns a plan by slug if found', async () => {
      const mockPlan = {
        id: BigInt(3),
        name: 'Enterprise',
        slug: 'enterprise',
        price: 499,
        currency: 'USD',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }
      vi.mocked(prisma.pricingPlan.findFirst).mockResolvedValueOnce(mockPlan as any)

      const res = await app.request('/billing/plans/slug/enterprise')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe('enterprise')
    })
  })

  describe('Admin Authorization Guards', () => {
    it('rejects unauthenticated requests to /billing/plans/admin/all with 401', async () => {
      mockSession = null
      const res = await app.request('/billing/plans/admin/all')
      expect(res.status).toBe(401)
    })

    it('rejects unauthenticated requests to POST /billing/plans with 401', async () => {
      mockSession = null
      const res = await app.request('/billing/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker', price: 0 }),
      })
      expect(res.status).toBe(401)
    })

    it('allows admin session to create a plan', async () => {
      mockSession = { id: '1', role: 'admin', email: 'admin@example.com' }
      const newPlan = {
        id: BigInt(10),
        name: 'New Tier',
        slug: 'new-tier',
        price: 19.99,
        currency: 'USD',
        is_active: true,
        is_popular: false,
        created_at: new Date(),
        updated_at: new Date(),
      }
      vi.mocked(prisma.pricingPlan.create).mockResolvedValueOnce(newPlan as any)

      const res = await app.request('/billing/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Tier',
          price: 19.99,
          features: { 'SSL Certificate': true },
        }),
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.name).toBe('New Tier')
    })
  })
})
