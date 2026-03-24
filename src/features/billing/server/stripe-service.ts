import Stripe from "stripe"

/**
 * Lazily-initialised Stripe client.
 * When STRIPE_SECRET_KEY is absent the module exports null — callers
 * MUST guard with `getStripe()` and handle the null case gracefully.
 */
function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.warn("[billing] STRIPE_SECRET_KEY is not set — Stripe features disabled")
    return null
  }
  return new Stripe(key, { apiVersion: "2026-02-25.clover" })
}

let _stripe: Stripe | null | undefined
export function getStripe(): Stripe | null {
  if (_stripe === undefined) _stripe = createStripeClient()
  return _stripe
}

// ── Checkout Session ─────────────────────────────────────
export async function createCheckoutSession(opts: {
  stripePriceId: string
  customerEmail: string
  stripeCustomerId?: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  if (!stripe) throw new Error("Stripe is not configured")

  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: opts.stripePriceId, quantity: 1 }],
    customer: opts.stripeCustomerId || undefined,
    customer_email: opts.stripeCustomerId ? undefined : opts.customerEmail,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  })
}

// ── Customer Portal ──────────────────────────────────────
export async function createPortalSession(opts: {
  stripeCustomerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()
  if (!stripe) throw new Error("Stripe is not configured")

  return stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: opts.returnUrl,
  })
}

// ── Subscription Fetch ───────────────────────────────────
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe()
  if (!stripe) throw new Error("Stripe is not configured")

  return stripe.subscriptions.retrieve(subscriptionId)
}

// ── Webhook Signature Verification ───────────────────────
export function constructWebhookEvent(
  body: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripe()
  if (!stripe) throw new Error("Stripe is not configured")

  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set")

  return stripe.webhooks.constructEvent(body, signature, secret)
}
