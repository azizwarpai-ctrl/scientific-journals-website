import type Stripe from "stripe"
import { prisma } from "@/src/lib/db/config"
import { getSubscription } from "@/src/features/billing/server/stripe-service"

/**
 * Processes verified Stripe webhook events and updates the local database.
 * Only events relevant to billing lifecycle are handled; all others are ignored.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // ── Checkout completed ─────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== "subscription" || !session.subscription || !session.customer) break

      const adminUserId = session.metadata?.adminUserId
      const pricingPlanId = session.metadata?.pricingPlanId
      if (!adminUserId || !pricingPlanId) {
        console.warn("[billing] checkout.session.completed missing metadata", { adminUserId, pricingPlanId })
        break
      }

      const sub = await getSubscription(session.subscription as string)

      await prisma.subscription.upsert({
        where: { admin_user_id: BigInt(adminUserId) },
        create: {
          admin_user_id: BigInt(adminUserId),
          pricing_plan_id: BigInt(pricingPlanId),
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: "active",
          current_period_end: new Date(((sub as any).current_period_end as number) * 1000),
        },
        update: {
          pricing_plan_id: BigInt(pricingPlanId),
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          status: "active",
          current_period_end: new Date(((sub as any).current_period_end as number) * 1000),
        },
      })
      break
    }

    // ── Invoice paid ───────────────────────────────────
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
      if (!invoice.subscription) break

      const subscription = await prisma.subscription.findUnique({
        where: { stripe_subscription_id: invoice.subscription as string },
      })
      if (!subscription) break

      await prisma.invoice.upsert({
        where: { stripe_invoice_id: invoice.id },
        create: {
          subscription_id: subscription.id,
          amount: (invoice.amount_paid ?? 0) / 100,
          status: "paid",
          stripe_invoice_id: invoice.id,
          invoice_url: invoice.hosted_invoice_url ?? null,
        },
        update: {
          amount: (invoice.amount_paid ?? 0) / 100,
          status: "paid",
          invoice_url: invoice.hosted_invoice_url ?? null,
        },
      })

      // Update period end from the subscription object
      if (invoice.lines?.data?.[0]?.period?.end) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            current_period_end: new Date(invoice.lines.data[0].period.end * 1000),
            status: "active",
          },
        })
      }
      break
    }

    // ── Invoice payment failed ─────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
      if (!invoice.subscription) break

      const result = await prisma.subscription.updateMany({
        where: { stripe_subscription_id: invoice.subscription as string },
        data: { status: "past_due" },
      })
      if (result.count === 0) {
        console.warn(`[billing] webhook matched 0 subscriptions for invoice.payment_failed. sub: ${invoice.subscription}`)
      }
      break
    }

    // ── Subscription deleted / cancelled ───────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripe_subscription_id: sub.id },
        data: { status: "canceled" },
      })
      break
    }

    // ── Subscription updated ───────────────────────────
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription & { current_period_end: number }
      await prisma.subscription.updateMany({
        where: { stripe_subscription_id: sub.id },
        data: {
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000),
        },
      })
      break
    }

    default:
      // Unhandled event type — silently ignore
      break
  }
}
