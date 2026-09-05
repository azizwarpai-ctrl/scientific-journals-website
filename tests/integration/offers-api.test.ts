import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { prisma } from "@/src/lib/db/config"

let mockSession: any = null

vi.mock("@/src/lib/db/auth", () => ({
  getSession: vi.fn(() => mockSession),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}))

vi.mock("@/src/lib/db/config", () => ({
  prisma: {
    offer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Import router after mocking
const { offersRouter } = await import("@/src/features/offers/server/route")

function buildApp() {
  return new Hono().route("/offers", offersRouter)
}

const adminSession = {
  userId: "1",
  email: "admin@example.com",
  role: "admin",
  full_name: "Admin User",
}

const nonAdminSession = {
  userId: "2",
  email: "author@example.com",
  role: "author",
  full_name: "Author User",
}

const mockOffer = {
  id: BigInt(1),
  name: "Standard Publication",
  slug: "standard-publication",
  description: "Standard peer-review package",
  price_cents: 14900,
  currency: "USD",
  billing_interval: "month",
  features: ["Peer review", "DOI Assignment"],
  icon_key: null,
  image_url: null,
  cta_text: "Get Started",
  cta_url: null,
  is_active: true,
  is_featured: false,
  sort_order: 1,
  available_from: null,
  available_until: null,
  pricing_plan_id: null,
  journal_id: null,
  created_by: BigInt(1),
  created_at: new Date("2026-01-01T00:00:00Z"),
  updated_at: new Date("2026-01-01T00:00:00Z"),
  pricing_plan: null,
  journal: null,
}

beforeEach(() => {
  mockSession = null
  vi.clearAllMocks()
})

describe("Offers API Integration Tests", () => {
  describe("GET /offers (Public listing)", () => {
    it("should return 200 with serialized active offers", async () => {
      vi.mocked(prisma.offer.findMany).mockResolvedValue([mockOffer as any])

      const res = await buildApp().request("/offers")
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(1)
      expect(json.data[0].id).toBe("1")
      expect(json.data[0].name).toBe("Standard Publication")
      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        })
      )
    })

    it("should filter by journal_id when provided", async () => {
      vi.mocked(prisma.offer.findMany).mockResolvedValue([])

      const res = await buildApp().request("/offers?journal_id=5")
      expect(res.status).toBe(200)

      expect(prisma.offer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_active: true,
            OR: [{ journal_id: BigInt(5) }, { journal_id: null }],
          }),
        })
      )
    })
  })

  describe("GET /offers/:id (Public single offer)", () => {
    it("should return 200 for active offer by ID", async () => {
      vi.mocked(prisma.offer.findFirst).mockResolvedValue(mockOffer as any)

      const res = await buildApp().request("/offers/1")
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe("standard-publication")
    })

    it("should return 200 for active offer by slug", async () => {
      vi.mocked(prisma.offer.findFirst).mockResolvedValue(mockOffer as any)

      const res = await buildApp().request("/offers/standard-publication")
      expect(res.status).toBe(200)

      expect(prisma.offer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "standard-publication" },
        })
      )
    })

    it("should return 404 if offer not found", async () => {
      vi.mocked(prisma.offer.findFirst).mockResolvedValue(null)

      const res = await buildApp().request("/offers/999")
      expect(res.status).toBe(404)
    })

    it("should return 404 for inactive offer if not admin", async () => {
      vi.mocked(prisma.offer.findFirst).mockResolvedValue({
        ...mockOffer,
        is_active: false,
      } as any)

      const res = await buildApp().request("/offers/1")
      expect(res.status).toBe(404)
    })

    it("should return 400 for out-of-range numeric ID and NOT invoke Prisma", async () => {
      vi.mocked(prisma.offer.findFirst).mockClear()

      const res = await buildApp().request("/offers/99999999999999999999999999999999")
      expect(res.status).toBe(400)
      expect(prisma.offer.findFirst).not.toHaveBeenCalled()
    })

    it("should return 200 for inactive offer if admin", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findFirst).mockResolvedValue({
        ...mockOffer,
        is_active: false,
      } as any)

      const res = await buildApp().request("/offers/1")
      expect(res.status).toBe(200)
    })
  })

  describe("GET /offers/admin/all", () => {
    it("should return 401 when not authenticated", async () => {
      const res = await buildApp().request("/offers/admin/all")
      expect(res.status).toBe(401)
    })

    it("should return 403 when authenticated as non-admin", async () => {
      mockSession = nonAdminSession
      const res = await buildApp().request("/offers/admin/all")
      expect(res.status).toBe(403)
    })

    it("should return 200 with paginated offers for admin", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findMany).mockResolvedValue([mockOffer as any])
      vi.mocked(prisma.offer.count).mockResolvedValue(1)

      const res = await buildApp().request("/offers/admin/all?page=1&limit=10")
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data).toHaveLength(1)
      expect(json.pagination.total).toBe(1)
    })
  })

  describe("POST /offers", () => {
    const newOfferPayload = {
      name: "Pro Package",
      slug: "pro-package",
      features: ["Fast review", "Copyediting"],
      price_cents: 29900,
      currency: "USD",
      billing_interval: "one_time",
    }

    it("should return 401 if unauthenticated", async () => {
      const res = await buildApp().request("/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOfferPayload),
      })
      expect(res.status).toBe(401)
    })

    it("should return 409 if slug already exists", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue({ id: BigInt(2) } as any)

      const res = await buildApp().request("/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOfferPayload),
      })
      expect(res.status).toBe(409)
    })

    it("should create offer successfully for admin", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.offer.create).mockResolvedValue({
        ...mockOffer,
        id: BigInt(2),
        name: "Pro Package",
        slug: "pro-package",
      } as any)

      const res = await buildApp().request("/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOfferPayload),
      })
      expect(res.status).toBe(201)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe("pro-package")
    })

    it("should return 400 for invalid payload (empty features)", async () => {
      mockSession = adminSession

      const res = await buildApp().request("/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Invalid",
          slug: "invalid",
          features: [],
        }),
      })
      expect(res.status).toBe(400)
    })

    it("should return 409 when Prisma throws P2002 unique constraint error on slug during create", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(null)
      const p2002Error: any = new Error("Unique constraint failed")
      p2002Error.code = "P2002"
      p2002Error.meta = { target: ["offers_slug_key"] }
      vi.mocked(prisma.offer.create).mockRejectedValue(p2002Error)

      const res = await buildApp().request("/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOfferPayload),
      })
      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toBe("An offer with this slug already exists")
    })

    it("should return 500 when unexpected error occurs during create", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.offer.create).mockRejectedValue(new Error("Database connection error"))

      const res = await buildApp().request("/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOfferPayload),
      })
      expect(res.status).toBe(500)
    })
  })

  describe("PATCH /offers/:id", () => {
    it("should return 401 if unauthenticated", async () => {
      const res = await buildApp().request("/offers/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      })
      expect(res.status).toBe(401)
    })

    it("should return 404 if offer does not exist", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(null)

      const res = await buildApp().request("/offers/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      })
      expect(res.status).toBe(404)
    })

    it("should update offer successfully for admin", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(mockOffer as any)
      vi.mocked(prisma.offer.update).mockResolvedValue({
        ...mockOffer,
        name: "Updated Name",
      } as any)

      const res = await buildApp().request("/offers/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.name).toBe("Updated Name")
    })

    it("should return 409 when Prisma throws P2002 unique constraint error on update", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(mockOffer as any)
      const p2002Error: any = new Error("Unique constraint failed")
      p2002Error.code = "P2002"
      p2002Error.meta = { target: ["offers_slug_key"] }
      vi.mocked(prisma.offer.update).mockRejectedValue(p2002Error)

      const res = await buildApp().request("/offers/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "conflict-slug" }),
      })
      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toBe("An offer with this slug already exists")
    })

    it("should return 500 when unexpected error occurs during update", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(mockOffer as any)
      vi.mocked(prisma.offer.update).mockRejectedValue(new Error("Database connection error"))

      const res = await buildApp().request("/offers/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })
      expect(res.status).toBe(500)
    })
  })

  describe("PATCH /offers/:id/toggle", () => {
    it("should toggle is_active status", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(mockOffer as any)
      vi.mocked(prisma.offer.update).mockResolvedValue({
        ...mockOffer,
        is_active: false,
      } as any)

      const res = await buildApp().request("/offers/1/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.is_active).toBe(false)
      expect(prisma.offer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { is_active: false },
        })
      )
    })
  })

  describe("PATCH /offers/:id/reorder", () => {
    it("should update sort_order", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(mockOffer as any)
      vi.mocked(prisma.offer.update).mockResolvedValue({
        ...mockOffer,
        sort_order: 10,
      } as any)

      const res = await buildApp().request("/offers/1/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: 10 }),
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.sort_order).toBe(10)
    })
  })

  describe("DELETE /offers/:id", () => {
    it("should return 401 if unauthenticated", async () => {
      const res = await buildApp().request("/offers/1", {
        method: "DELETE",
      })
      expect(res.status).toBe(401)
    })

    it("should return 404 if offer not found", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(null)

      const res = await buildApp().request("/offers/1", {
        method: "DELETE",
      })
      expect(res.status).toBe(404)
    })

    it("should delete offer successfully for admin", async () => {
      mockSession = adminSession
      vi.mocked(prisma.offer.findUnique).mockResolvedValue(mockOffer as any)
      vi.mocked(prisma.offer.delete).mockResolvedValue(mockOffer as any)

      const res = await buildApp().request("/offers/1", {
        method: "DELETE",
      })
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.success).toBe(true)
      expect(prisma.offer.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      })
    })
  })
})
