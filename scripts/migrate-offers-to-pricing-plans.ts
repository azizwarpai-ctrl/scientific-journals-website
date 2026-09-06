import { prisma } from "../src/lib/db/config"
import { Prisma } from "@prisma/client"

async function main() {
  const args = process.argv.slice(2)
  const isForced = args.includes("--force")
  const shouldDropOffers = args.includes("--drop-offers")

  if (!isForced) {
    console.error(
      "Refusing to execute without --force flag.\n" +
        "Run with: bun run scripts/migrate-offers-to-pricing-plans.ts --force [--drop-offers]"
    )
    process.exit(1)
  }

  console.log("Starting migration of offers to pricing_plans...")

  // Check if offers table exists
  let offers: any[] = []
  try {
    offers = await prisma.$queryRawUnsafe<any[]>("SELECT * FROM offers")
  } catch (error: any) {
    console.log("offers table does not exist or cannot be read:", error.message)
    console.log("Migrated 0 offers to pricing_plans")
    await prisma.$disconnect()
    return
  }

  console.log(`Found ${offers.length} offers in database.`)
  let migratedCount = 0

  for (const offer of offers) {
    const slug = offer.slug || offer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

    // Check idempotency: skip if slug already exists in pricing_plans
    const existingPlan = await prisma.pricingPlan.findFirst({
      where: { slug },
    })

    if (existingPlan) {
      console.log(`Skipping offer "${offer.name}" (${slug}) — pricing_plan already exists.`)
      continue
    }

    // Convert price_cents to Decimal price (dollars)
    const price = offer.price_cents !== undefined && offer.price_cents !== null
      ? new Prisma.Decimal(Number(offer.price_cents) / 100)
      : new Prisma.Decimal(offer.price || 0)

    let parsedFeatures: Prisma.InputJsonValue = {}
    if (offer.features) {
      if (typeof offer.features === "string") {
        try {
          parsedFeatures = JSON.parse(offer.features)
        } catch {
          parsedFeatures = [offer.features]
        }
      } else {
        parsedFeatures = offer.features as Prisma.InputJsonValue
      }
    }

    const ctaLabel = offer.cta_label || offer.cta_text || "Get Started"

    await prisma.pricingPlan.create({
      data: {
        name: offer.name,
        slug,
        description: offer.description || null,
        short_description: offer.short_description || null,
        price,
        currency: offer.currency || "USD",
        billing_interval: offer.billing_interval || "one_time",
        features: parsedFeatures,
        icon_key: offer.icon_key || null,
        image_url: offer.image_url || null,
        cta_label: ctaLabel,
        cta_url: offer.cta_url || null,
        is_active: offer.is_active !== undefined ? Boolean(offer.is_active) : true,
        is_featured: offer.is_featured !== undefined ? Boolean(offer.is_featured) : false,
        sort_order: offer.sort_order !== undefined ? Number(offer.sort_order) : 0,
        available_from: offer.available_from ? new Date(offer.available_from) : null,
        available_until: offer.available_until ? new Date(offer.available_until) : null,
        journal_id: offer.journal_id ? BigInt(offer.journal_id) : null,
      },
    })

    migratedCount++
    console.log(`✓ Migrated offer "${offer.name}" (${slug}) to pricing_plans.`)
  }

  console.log(`Migrated ${migratedCount} offers to pricing_plans`)

  if (shouldDropOffers) {
    console.log("Dropping offers table as requested with --drop-offers...")
    try {
      await prisma.$executeRawUnsafe("DROP TABLE IF EXISTS offers")
      console.log("✓ offers table successfully dropped.")
    } catch (dropErr: any) {
      console.error("Warning: failed to drop offers table:", dropErr.message)
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("Migration error:", e)
  await prisma.$disconnect()
  process.exit(1)
})
