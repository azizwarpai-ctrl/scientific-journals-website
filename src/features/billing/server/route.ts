import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { prisma } from "@/src/lib/db/config"
import { Prisma } from "@prisma/client"
import {
  checkoutSchema,
  pricingPlanCreateSchema,
  pricingPlanUpdateSchema,
  pricingPlanIdParamSchema,
  pricingPlanSlugParamSchema,
  pricingPlanPublicQuerySchema,
  pricingPlanToggleSchema,
  pricingPlanReorderSchema,
} from "@/src/features/billing/schemas/billing-schema"
import {
  getStripe,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
} from "@/src/features/billing/server/stripe-service"
import { handleWebhookEvent } from "@/src/features/billing/server/webhook-handler"
import { serializeRecord, serializeMany } from "@/src/lib/serialize"

const app = new Hono()

// ═════════════════════════════════════════════════════════
//  Stripe status — public healthcheck
// ═════════════════════════════════════════════════════════
app.get("/status", async (c) => {
  return c.json({ success: true, data: { stripeEnabled: getStripe() !== null } })
})

// ═════════════════════════════════════════════════════════
//  Checkout Session Handler
// ═════════════════════════════════════════════════════════
const checkoutHandler = async (c: any) => {
  try {
    const { pricingPlanId } = c.req.valid("json")
    const session = c.get("session" as never) as { id: string; email: string }

    const plan = await prisma.pricingPlan.findUnique({
      where: { id: BigInt(pricingPlanId) },
    })
    if (!plan || !plan.stripe_price_id) {
      return c.json({ success: false, error: "Invalid plan or plan not linked to Stripe" }, 400)
    }

    const checkoutResult = await prisma.$transaction(async (tx) => {
      // Check for active sub
      const existingSub = await tx.subscription.findUnique({
        where: { admin_user_id: BigInt(session.id) },
      })

      if (existingSub && existingSub.status === "active") {
        return { isSubscribed: true }
      }

      // Check for valid unexpired checkout session
      const existingSession = await tx.checkoutSession.findUnique({
        where: { admin_user_id: BigInt(session.id) },
      })

      if (existingSession && existingSession.expires_at > new Date()) {
        return { isSubscribed: false, url: existingSession.url }
      }

      // Create stripe checkout session
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const stripeCheckout = await createCheckoutSession({
        stripePriceId: plan.stripe_price_id!,
        customerEmail: session.email,
        stripeCustomerId: existingSub?.stripe_customer_id ?? undefined,
        successUrl: `${appUrl}/admin/dashboard?checkout=success`,
        cancelUrl: `${appUrl}/submit-manager#pricing`,
        metadata: {
          adminUserId: String(session.id),
          pricingPlanId: String(pricingPlanId),
        },
      })

      // Upsert local DB checkout session
      await tx.checkoutSession.upsert({
        where: { admin_user_id: BigInt(session.id) },
        create: {
          admin_user_id: BigInt(session.id),
          pricing_plan_id: BigInt(pricingPlanId),
          stripe_checkout_id: stripeCheckout.id,
          url: stripeCheckout.url || "",
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        },
        update: {
          pricing_plan_id: BigInt(pricingPlanId),
          stripe_checkout_id: stripeCheckout.id,
          url: stripeCheckout.url || "",
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        },
      })

      return { isSubscribed: false, url: stripeCheckout.url || "", stripeCheckoutId: stripeCheckout.id }
    })

    if (checkoutResult.isSubscribed) {
      return c.json({ success: false, error: "Active subscription already exists" }, 409)
    }

    return c.json({ success: true, data: { url: checkoutResult.url } })
  } catch (error) {
    console.error("[billing] checkout error:", error)
    return c.json({ success: false, error: "Failed to create checkout session" }, 500)
  }
}

// POST /billing/checkout and /billing/create-checkout
app.post("/checkout", requireAdmin, zValidator("json", checkoutSchema), checkoutHandler)
app.post("/create-checkout", requireAdmin, zValidator("json", checkoutSchema), checkoutHandler)

// ═════════════════════════════════════════════════════════
//  Subscription Management — Authenticated
// ═════════════════════════════════════════════════════════

// GET /billing/subscription
app.get("/subscription", requireAdmin, async (c) => {
  try {
    const session = c.get("session" as never) as { id: string }

    const subscription = await prisma.subscription.findUnique({
      where: { admin_user_id: BigInt(session.id) },
      include: {
        pricing_plan: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            features: true,
          },
        },
      },
    })

    return c.json({ success: true, data: subscription ? serializeRecord(subscription) : null })
  } catch (error) {
    console.error("[billing] subscription fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch subscription" }, 500)
  }
})

// POST /billing/portal
app.post("/portal", requireAdmin, async (c) => {
  try {
    const session = c.get("session" as never) as { id: string }

    const subscription = await prisma.subscription.findUnique({
      where: { admin_user_id: BigInt(session.id) },
    })
    if (!subscription) {
      return c.json({ success: false, error: "No active subscription found" }, 404)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const portalSession = await createPortalSession({
      stripeCustomerId: subscription.stripe_customer_id,
      returnUrl: `${appUrl}/admin/dashboard`,
    })

    return c.json({ success: true, data: { url: portalSession.url } })
  } catch (error) {
    console.error("[billing] portal error:", error)
    return c.json({ success: false, error: "Failed to create portal session" }, 500)
  }
})

// ═════════════════════════════════════════════════════════
//  Webhook — POST /billing/webhook (public, verified)
// ═════════════════════════════════════════════════════════
app.post("/webhook", async (c) => {
  const body = await c.req.text()
  const sig = c.req.header("stripe-signature")

  if (!sig) {
    return c.json({ success: false, error: "Missing stripe-signature header" }, 400)
  }

  let event
  try {
    event = constructWebhookEvent(body, sig)
  } catch (error) {
    console.error("[billing] webhook verification error:", error)
    return c.json({ success: false, error: "Webhook verification failed" }, 400)
  }

  try {
    await handleWebhookEvent(event)
    return c.json({ success: true, data: { received: true } })
  } catch (error) {
    console.error("[billing] webhook processing error:", error)
    return c.json({ success: false, error: "Webhook processing failed" }, 500)
  }
})

// ═════════════════════════════════════════════════════════
//  Pricing Plans Router (shared across /plans and /pricing-plans)
// ═════════════════════════════════════════════════════════
const plansRouter = new Hono()

// GET / — public (landing page reads these)
plansRouter.get("/", zValidator("query", pricingPlanPublicQuerySchema), async (c) => {
  try {
    const { journal_id, active_only } = c.req.valid("query")
    const now = new Date()

    const where: Prisma.PricingPlanWhereInput = {
      ...(active_only !== "false" && { is_active: true }),
      ...(journal_id !== undefined && { journal_id }),
      AND: [
        { OR: [{ available_from: null }, { available_from: { lte: now } }] },
        { OR: [{ available_until: null }, { available_until: { gte: now } }] },
      ],
    }

    const plans = await prisma.pricingPlan.findMany({
      where,
      orderBy: { sort_order: "asc" },
    })
    return c.json({ success: true, data: serializeMany(plans) })
  } catch (error) {
    console.error("[billing] plans fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch pricing plans" }, 500)
  }
})

// GET /admin/all — admin only (includes inactive)
plansRouter.get("/admin/all", requireAdmin, async (c) => {
  try {
    const plans = await prisma.pricingPlan.findMany({
      orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
    })
    return c.json({ success: true, data: serializeMany(plans) })
  } catch (error) {
    console.error("[billing] admin plans fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch pricing plans" }, 500)
  }
})

// GET /slug/:slug — public, by slug
plansRouter.get("/slug/:slug", zValidator("param", pricingPlanSlugParamSchema), async (c) => {
  try {
    const { slug } = c.req.valid("param")
    const now = new Date()

    const plan = await prisma.pricingPlan.findFirst({
      where: {
        slug,
        is_active: true,
        AND: [
          { OR: [{ available_from: null }, { available_from: { lte: now } }] },
          { OR: [{ available_until: null }, { available_until: { gte: now } }] },
        ],
      },
    })
    if (!plan) {
      return c.json({ success: false, error: "Pricing plan not found" }, 404)
    }
    return c.json({ success: true, data: serializeRecord(plan) })
  } catch (error) {
    console.error("[billing] plan fetch by slug error:", error)
    return c.json({ success: false, error: "Failed to fetch pricing plan" }, 500)
  }
})

// GET /:id — fetch by id (active only for public)
plansRouter.get("/:id", zValidator("param", pricingPlanIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const now = new Date()
    const plan = await prisma.pricingPlan.findUnique({
      where: { id: BigInt(id) },
    })
    if (
      !plan ||
      !plan.is_active ||
      (plan.available_from && plan.available_from > now) ||
      (plan.available_until && plan.available_until < now)
    ) {
      return c.json({ success: false, error: "Pricing plan not found" }, 404)
    }
    return c.json({ success: true, data: serializeRecord(plan) })
  } catch (error) {
    console.error("[billing] plan fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch pricing plan" }, 500)
  }
})

// POST / — admin only, create plan
plansRouter.post("/", requireAdmin, zValidator("json", pricingPlanCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const isActive = data.is_active !== undefined ? data.is_active : data.isActive ?? true
    const isPopular = data.is_popular !== undefined ? data.is_popular : data.isPopular ?? false
    const stripePriceId = data.stripe_price_id || data.stripePriceId || null
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

    const plan = await prisma.pricingPlan.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        short_description: data.short_description || null,
        price: data.price,
        currency: data.currency || "USD",
        billing_interval: data.billing_interval || "one_time",
        features: (data.features ?? {}) as Prisma.InputJsonValue,
        icon_key: data.icon_key || null,
        image_url: data.image_url || null,
        cta_label: data.cta_label || "Get Started",
        cta_url: data.cta_url || null,
        stripe_price_id: stripePriceId,
        is_active: isActive,
        is_popular: isPopular,
        is_featured: data.is_featured ?? false,
        sort_order: data.sort_order ?? 0,
        available_from: data.available_from ? new Date(data.available_from) : null,
        available_until: data.available_until ? new Date(data.available_until) : null,
        journal_id: data.journal_id ? BigInt(data.journal_id) : null,
      },
    })
    return c.json({ success: true, data: serializeRecord(plan) }, 201)
  } catch (error: unknown) {
    const err = error as { code?: string }
    console.error("[billing] plan create error:", error)
    if (err.code === "P2002") {
      return c.json({ success: false, error: "A plan with this slug or stripe price ID already exists" }, 409)
    }
    return c.json({ success: false, error: "Failed to create pricing plan" }, 500)
  }
})

// Plan update handler
const updatePlanHandler = async (c: any) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const isActive = data.is_active !== undefined ? data.is_active : data.isActive
    const isPopular = data.is_popular !== undefined ? data.is_popular : data.isPopular
    const stripePriceId = data.stripe_price_id !== undefined ? data.stripe_price_id : data.stripePriceId

    const plan = await prisma.pricingPlan.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.short_description !== undefined && { short_description: data.short_description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.billing_interval !== undefined && { billing_interval: data.billing_interval }),
        ...(data.features !== undefined && { features: data.features as Prisma.InputJsonValue }),
        ...(data.icon_key !== undefined && { icon_key: data.icon_key }),
        ...(data.image_url !== undefined && { image_url: data.image_url }),
        ...(data.cta_label !== undefined && { cta_label: data.cta_label }),
        ...(data.cta_url !== undefined && { cta_url: data.cta_url }),
        ...(stripePriceId !== undefined && { stripe_price_id: stripePriceId }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(isPopular !== undefined && { is_popular: isPopular }),
        ...(data.is_featured !== undefined && { is_featured: data.is_featured }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
        ...(data.available_from !== undefined && {
          available_from: data.available_from ? new Date(data.available_from) : null,
        }),
        ...(data.available_until !== undefined && {
          available_until: data.available_until ? new Date(data.available_until) : null,
        }),
        ...(data.journal_id !== undefined && {
          journal_id: data.journal_id ? BigInt(data.journal_id) : null,
        }),
      },
    })
    return c.json({ success: true, data: serializeRecord(plan) })
  } catch (error: unknown) {
    const err = error as { code?: string }
    console.error("[billing] plan update error:", error)
    if (err.code === "P2025") {
      return c.json({ success: false, error: "Pricing plan not found" }, 404)
    }
    return c.json({ success: false, error: "Failed to update pricing plan" }, 500)
  }
}

// PATCH & PUT /:id — admin only
plansRouter.patch("/:id", requireAdmin, zValidator("param", pricingPlanIdParamSchema), zValidator("json", pricingPlanUpdateSchema), updatePlanHandler)
plansRouter.put("/:id", requireAdmin, zValidator("param", pricingPlanIdParamSchema), zValidator("json", pricingPlanUpdateSchema), updatePlanHandler)

// PATCH /:id/toggle — admin only
plansRouter.patch(
  "/:id/toggle",
  requireAdmin,
  zValidator("param", pricingPlanIdParamSchema),
  zValidator("json", pricingPlanToggleSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param")
      const body = c.req.valid("json")
      const is_active = body.is_active !== undefined ? body.is_active : body.isActive ?? true

      const plan = await prisma.pricingPlan.update({
        where: { id: BigInt(id) },
        data: { is_active },
      })
      return c.json({ success: true, data: serializeRecord(plan) })
    } catch (error: unknown) {
      const err = error as { code?: string }
      console.error("[billing] plan toggle error:", error)
      if (err.code === "P2025") {
        return c.json({ success: false, error: "Pricing plan not found" }, 404)
      }
      return c.json({ success: false, error: "Failed to toggle pricing plan" }, 500)
    }
  }
)

// PATCH /:id/reorder — admin only
plansRouter.patch(
  "/:id/reorder",
  requireAdmin,
  zValidator("param", pricingPlanIdParamSchema),
  zValidator("json", pricingPlanReorderSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param")
      const { sort_order } = c.req.valid("json")

      const plan = await prisma.pricingPlan.update({
        where: { id: BigInt(id) },
        data: { sort_order },
      })
      return c.json({ success: true, data: serializeRecord(plan) })
    } catch (error: unknown) {
      const err = error as { code?: string }
      console.error("[billing] plan reorder error:", error)
      if (err.code === "P2025") {
        return c.json({ success: false, error: "Pricing plan not found" }, 404)
      }
      return c.json({ success: false, error: "Failed to reorder pricing plan" }, 500)
    }
  }
)

// DELETE /:id — admin only
plansRouter.delete("/:id", requireAdmin, zValidator("param", pricingPlanIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const planId = BigInt(id)

    // Check if references exist in subscriptions
    const subCount = await prisma.subscription.count({
      where: { pricing_plan_id: planId },
    })
    if (subCount > 0) {
      return c.json(
        { success: false, error: "Cannot delete pricing plan with existing subscriptions. Deactivate it instead." },
        409
      )
    }

    await prisma.pricingPlan.delete({
      where: { id: planId },
    })
    return c.json({ success: true, data: { id } })
  } catch (error: unknown) {
    const err = error as { code?: string }
    console.error("[billing] plan delete error:", error)
    if (err.code === "P2025") {
      return c.json({ success: false, error: "Pricing plan not found" }, 404)
    }
    if (err.code === "P2003") {
      return c.json({ success: false, error: "Cannot delete pricing plan with existing billing references" }, 409)
    }
    return c.json({ success: false, error: "Failed to delete pricing plan" }, 500)
  }
})

// Mount plans router on both /plans and /pricing-plans for complete compatibility
app.route("/plans", plansRouter)
app.route("/pricing-plans", plansRouter)

export const billingRouter = app
export default app
