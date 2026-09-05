import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { getSession } from "@/src/lib/db/auth"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { parsePagination, paginatedResponse } from "@/src/lib/pagination"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"
import { prisma } from "@/src/lib/db/config"
import { Prisma } from "@prisma/client"
import {
  offerCreateSchema,
  offerUpdateSchema,
  offerIdParamSchema,
  offerLookupParamSchema,
  offerToggleSchema,
  offerReorderSchema,
  offerQuerySchema,
  OFFER_SELECT,
} from "@/src/features/offers/schemas/offer-schema"

interface AuthVariables {
  session?: {
    userId?: string
    email?: string
    role?: string
    full_name?: string
  }
}

const app = new Hono<{ Variables: AuthVariables }>()

// ============================================================================
// ADMIN ROUTES (Placed before parameterized :id route to prevent collision)
// ============================================================================

// GET /offers/admin/all - Admin paginated list of all offers
app.get("/admin/all", requireAdmin, zValidator("query", offerQuerySchema), async (c) => {
  try {
    const query = c.req.valid("query")
    const pagination = parsePagination(c)

    const where: Prisma.OfferWhereInput = {}

    if (query.journal_id !== undefined) {
      if (query.journal_id === "null" || query.journal_id === "") {
        where.journal_id = null
      } else if (!isNaN(Number(query.journal_id))) {
        where.journal_id = BigInt(query.journal_id)
      }
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active === "true"
    }

    if (query.is_featured !== undefined) {
      where.is_featured = query.is_featured === "true"
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        select: OFFER_SELECT,
        orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
        take: pagination.limit,
        skip: pagination.offset,
      }),
      prisma.offer.count({ where }),
    ])

    return c.json(paginatedResponse(serializeMany(offers), total, pagination), 200)
  } catch (error) {
    console.error("[Offers API] Error fetching admin offers:", error)
    return c.json({ success: false, error: "Failed to fetch offers" }, 500)
  }
})

// GET /offers/admin/:id - Admin single offer fetch
app.get("/admin/:id", requireAdmin, zValidator("param", offerIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const offer = await prisma.offer.findUnique({
      where: { id: BigInt(id) },
      select: OFFER_SELECT,
    })

    if (!offer) {
      return c.json({ success: false, error: "Offer not found" }, 404)
    }

    return c.json({ success: true, data: serializeRecord(offer) }, 200)
  } catch (error) {
    console.error("[Offers API] Error fetching admin offer detail:", error)
    return c.json({ success: false, error: "Failed to fetch offer" }, 500)
  }
})

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// GET /offers - Public active offers
app.get("/", zValidator("query", offerQuerySchema), async (c) => {
  try {
    const query = c.req.valid("query")
    const now = new Date()

    const where: Prisma.OfferWhereInput = {
      is_active: true,
      AND: [
        {
          OR: [{ available_from: null }, { available_from: { lte: now } }],
        },
        {
          OR: [{ available_until: null }, { available_until: { gte: now } }],
        },
      ],
    }

    if (query.journal_id !== undefined) {
      if (query.journal_id === "null" || query.journal_id === "") {
        where.journal_id = null
      } else if (!isNaN(Number(query.journal_id))) {
        // Return offers specific to this journal OR global offers (journal_id is null)
        where.OR = [
          { journal_id: BigInt(query.journal_id) },
          { journal_id: null },
        ]
      }
    }

    if (query.is_featured !== undefined) {
      where.is_featured = query.is_featured === "true"
    }

    const offers = await prisma.offer.findMany({
      where,
      select: OFFER_SELECT,
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    })

    return c.json({ success: true, data: serializeMany(offers) }, 200)
  } catch (error) {
    console.error("[Offers API] Error fetching public offers:", error)
    return c.json({ success: false, error: "Failed to fetch offers" }, 500)
  }
})

// GET /offers/:id - Public single offer by ID or slug
app.get("/:id", zValidator("param", offerLookupParamSchema), async (c) => {
  try {
    const { id: idOrSlug } = c.req.valid("param")
    const session = await getSession()
    const isAdmin = session?.role === "admin" || session?.role === "superadmin"
    const now = new Date()

    const isNumeric = /^\d+$/.test(idOrSlug)

    const offer = await prisma.offer.findFirst({
      where: isNumeric
        ? { id: BigInt(idOrSlug) }
        : { slug: idOrSlug },
      select: OFFER_SELECT,
    })

    if (!offer) {
      return c.json({ success: false, error: "Offer not found" }, 404)
    }

    // Public visibility check: must be active and within time bounds unless admin
    if (!isAdmin) {
      if (!offer.is_active) {
        return c.json({ success: false, error: "Offer not found" }, 404)
      }
      if (offer.available_from && new Date(offer.available_from) > now) {
        return c.json({ success: false, error: "Offer not found" }, 404)
      }
      if (offer.available_until && new Date(offer.available_until) < now) {
        return c.json({ success: false, error: "Offer not found" }, 404)
      }
    }

    return c.json({ success: true, data: serializeRecord(offer) }, 200)
  } catch (error) {
    console.error("[Offers API] Error fetching single offer:", error)
    return c.json({ success: false, error: "Failed to fetch offer" }, 500)
  }
})

// ============================================================================
// ADMIN MUTATION ROUTES
// ============================================================================

// POST /offers - Create new offer
app.post("/", requireAdmin, zValidator("json", offerCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const session = c.get("session")

    // Check slug uniqueness
    const existing = await prisma.offer.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    })

    if (existing) {
      return c.json({ success: false, error: "An offer with this slug already exists" }, 409)
    }

    const offer = await prisma.offer.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price_cents: data.price_cents,
        currency: data.currency,
        billing_interval: data.billing_interval,
        features: data.features,
        icon_key: data.icon_key || null,
        image_url: data.image_url || null,
        cta_text: data.cta_text,
        cta_url: data.cta_url || null,
        is_active: data.is_active,
        is_featured: data.is_featured,
        sort_order: data.sort_order,
        available_from: data.available_from ? new Date(data.available_from) : null,
        available_until: data.available_until ? new Date(data.available_until) : null,
        pricing_plan_id: data.pricing_plan_id ? BigInt(data.pricing_plan_id) : null,
        journal_id: data.journal_id ? BigInt(data.journal_id) : null,
        created_by: session?.userId ? BigInt(session.userId) : null,
      },
      select: OFFER_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(offer), message: "Offer created successfully" },
      201
    )
  } catch (error: any) {
    if (error?.code === "P2002") {
      const target = String(error?.meta?.target || "")
      if (target.includes("slug") || target.includes("offers_slug_key")) {
        return c.json({ success: false, error: "An offer with this slug already exists" }, 409)
      }
    }
    console.error("[Offers API] Error creating offer:", error)
    return c.json({ success: false, error: "Failed to create offer" }, 500)
  }
})

// PATCH /offers/:id - Update offer
app.patch("/:id", requireAdmin, zValidator("param", offerIdParamSchema), zValidator("json", offerUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const existing = await prisma.offer.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, slug: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Offer not found" }, 404)
    }

    // If updating slug, check uniqueness
    if (data.slug && data.slug !== existing.slug) {
      const slugMatch = await prisma.offer.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      })
      if (slugMatch) {
        return c.json({ success: false, error: "An offer with this slug already exists" }, 409)
      }
    }

    const updateData: Prisma.OfferUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.description !== undefined) updateData.description = data.description
    if (data.price_cents !== undefined) updateData.price_cents = data.price_cents
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.billing_interval !== undefined) updateData.billing_interval = data.billing_interval
    if (data.features !== undefined) updateData.features = data.features
    if (data.icon_key !== undefined) updateData.icon_key = data.icon_key
    if (data.image_url !== undefined) updateData.image_url = data.image_url
    if (data.cta_text !== undefined) updateData.cta_text = data.cta_text
    if (data.cta_url !== undefined) updateData.cta_url = data.cta_url
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.is_featured !== undefined) updateData.is_featured = data.is_featured
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order

    if (data.available_from !== undefined) {
      updateData.available_from = data.available_from ? new Date(data.available_from) : null
    }
    if (data.available_until !== undefined) {
      updateData.available_until = data.available_until ? new Date(data.available_until) : null
    }
    if (data.pricing_plan_id !== undefined) {
      updateData.pricing_plan = data.pricing_plan_id
        ? { connect: { id: BigInt(data.pricing_plan_id) } }
        : { disconnect: true }
    }
    if (data.journal_id !== undefined) {
      updateData.journal = data.journal_id
        ? { connect: { id: BigInt(data.journal_id) } }
        : { disconnect: true }
    }

    const updated = await prisma.offer.update({
      where: { id: BigInt(id) },
      data: updateData,
      select: OFFER_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(updated), message: "Offer updated successfully" },
      200
    )
  } catch (error: any) {
    if (error?.code === "P2002") {
      const target = String(error?.meta?.target || "")
      if (target.includes("slug") || target.includes("offers_slug_key")) {
        return c.json({ success: false, error: "An offer with this slug already exists" }, 409)
      }
    }
    console.error("[Offers API] Error updating offer:", error)
    return c.json({ success: false, error: "Failed to update offer" }, 500)
  }
})

// PATCH /offers/:id/toggle - Toggle active status
app.patch("/:id/toggle", requireAdmin, zValidator("param", offerIdParamSchema), zValidator("json", offerToggleSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const body = c.req.valid("json")

    const existing = await prisma.offer.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, is_active: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Offer not found" }, 404)
    }

    const nextActive = body.is_active !== undefined ? body.is_active : !existing.is_active

    const updated = await prisma.offer.update({
      where: { id: BigInt(id) },
      data: { is_active: nextActive },
      select: OFFER_SELECT,
    })

    return c.json(
      {
        success: true,
        data: serializeRecord(updated),
        message: `Offer ${nextActive ? "activated" : "deactivated"} successfully`,
      },
      200
    )
  } catch (error) {
    console.error("[Offers API] Error toggling offer status:", error)
    return c.json({ success: false, error: "Failed to toggle offer status" }, 500)
  }
})

// PATCH /offers/:id/reorder - Update sort order
app.patch("/:id/reorder", requireAdmin, zValidator("param", offerIdParamSchema), zValidator("json", offerReorderSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const { sort_order } = c.req.valid("json")

    const existing = await prisma.offer.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Offer not found" }, 404)
    }

    const updated = await prisma.offer.update({
      where: { id: BigInt(id) },
      data: { sort_order },
      select: OFFER_SELECT,
    })

    return c.json(
      { success: true, data: serializeRecord(updated), message: "Offer reordered successfully" },
      200
    )
  } catch (error) {
    console.error("[Offers API] Error reordering offer:", error)
    return c.json({ success: false, error: "Failed to reorder offer" }, 500)
  }
})

// DELETE /offers/:id - Delete offer
app.delete("/:id", requireAdmin, zValidator("param", offerIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")

    const existing = await prisma.offer.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    })

    if (!existing) {
      return c.json({ success: false, error: "Offer not found" }, 404)
    }

    await prisma.offer.delete({
      where: { id: BigInt(id) },
    })

    return c.json({ success: true, message: "Offer deleted successfully" }, 200)
  } catch (error) {
    console.error("[Offers API] Error deleting offer:", error)
    return c.json({ success: false, error: "Failed to delete offer" }, 500)
  }
})

export { app as offersRouter }
