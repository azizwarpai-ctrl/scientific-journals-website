import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { requireAdmin } from "@/src/lib/auth-middleware"
import { prisma } from "@/src/lib/db/config"
import {
  checkoutSchema,
  pricingPlanCreateSchema,
  pricingPlanUpdateSchema,
  pricingPlanIdParamSchema,
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
//  Checkout — POST /billing/checkout
// ═════════════════════════════════════════════════════════
app.post("/checkout", requireAdmin, zValidator("json", checkoutSchema), async (c) => {
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

    // Attach metadata outside the transaction to prevent external API failures from rolling back DB
    try {
      if (checkoutResult.stripeCheckoutId) {
        const stripe = getStripe()!
        await stripe.checkout.sessions.update(checkoutResult.stripeCheckoutId, {
          metadata: {
            adminUserId: session.id,
            pricingPlanId: pricingPlanId.toString(),
          },
        })
      }
    } catch (e) {
      console.error("[billing] Failed to update stripe session metadata:", e)
      // We don't return an error here because the checkout session is already committed to our DB
    }

    return c.json({ success: true, data: { url: checkoutResult.url } })
  } catch (error) {
    console.error("[billing] checkout error:", error)
    return c.json({ success: false, error: "Failed to create checkout session" }, 500)
  }
})

// ═════════════════════════════════════════════════════════
//  Subscription — GET /billing/subscription
// ═════════════════════════════════════════════════════════
app.get("/subscription", requireAdmin, async (c) => {
  try {
    const session = c.get("session" as never) as { id: string }

    const subscription = await prisma.subscription.findUnique({
      where: { admin_user_id: BigInt(session.id) },
      include: { pricing_plan: true, invoices: { orderBy: { created_at: "desc" }, take: 5 } },
    })

    return c.json({ success: true, data: serializeRecord(subscription) })
  } catch (error) {
    console.error("[billing] subscription fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch subscription" }, 500)
  }
})

// ═════════════════════════════════════════════════════════
//  Customer Portal — POST /billing/portal
// ═════════════════════════════════════════════════════════
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

  let event;
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
//  Pricing Plans — Admin CRUD
// ═════════════════════════════════════════════════════════

// GET /billing/plans — public (landing page reads these)
app.get("/plans", async (c) => {
  try {
    const plans = await prisma.pricingPlan.findMany({
      where: { is_active: true },
      orderBy: { price: "asc" },
    })
    return c.json({ success: true, data: serializeMany(plans) })
  } catch (error) {
    console.error("[billing] plans fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch pricing plans" }, 500)
  }
})

// GET /billing/plans/all — admin only (includes inactive)
app.get("/plans/all", requireAdmin, async (c) => {
  try {
    const plans = await prisma.pricingPlan.findMany({ orderBy: { price: "asc" } })
    return c.json({ success: true, data: serializeMany(plans) })
  } catch (error) {
    console.error("[billing] plans fetch error:", error)
    return c.json({ success: false, error: "Failed to fetch pricing plans" }, 500)
  }
})

// POST /billing/plans — admin only
app.post("/plans", requireAdmin, zValidator("json", pricingPlanCreateSchema), async (c) => {
  try {
    const data = c.req.valid("json")
    const plan = await prisma.pricingPlan.create({
      data: {
        name: data.name,
        description: data.description || null,
        price: data.price,
        features: (data.features || {}) as any,
        stripe_price_id: data.stripePriceId || null,
        is_active: data.isActive,
        is_popular: data.isPopular,
      },
    })
    return c.json({ success: true, data: serializeRecord(plan) }, 201)
  } catch (error) {
    console.error("[billing] plan create error:", error)
    return c.json({ success: false, error: "Failed to create pricing plan" }, 500)
  }
})

// PATCH /billing/plans/:id — admin only
app.patch("/plans/:id", requireAdmin, zValidator("param", pricingPlanIdParamSchema), zValidator("json", pricingPlanUpdateSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    const data = c.req.valid("json")

    const plan = await prisma.pricingPlan.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.features !== undefined && { features: data.features as any }),
        ...(data.stripePriceId !== undefined && { stripe_price_id: data.stripePriceId }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
        ...(data.isPopular !== undefined && { is_popular: data.isPopular }),
      },
    })
    return c.json({ success: true, data: serializeRecord(plan) })
  } catch (error: any) {
    console.error("[billing] plan update error:", error)
    if (error.code === "P2025") {
      return c.json({ success: false, error: "Pricing plan not found" }, 404)
    }
    return c.json({ success: false, error: "Failed to update pricing plan" }, 500)
  }
})

// DELETE /billing/plans/:id — admin only
app.delete("/plans/:id", requireAdmin, zValidator("param", pricingPlanIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param")
    await prisma.pricingPlan.update({
      where: { id: BigInt(id) },
      data: { is_active: false },
    })
    return c.json({ success: true })
  } catch (error: any) {
    console.error("[billing] plan delete error:", error)
    if (error.code === "P2025") {
      return c.json({ success: false, error: "Pricing plan not found" }, 404)
    }
    return c.json({ success: false, error: "Failed to delete pricing plan" }, 500)
  }
})

export { app as billingRouter }
