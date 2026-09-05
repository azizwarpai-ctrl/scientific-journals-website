import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding offers...")

  const sampleOffers = [
    {
      name: "Basic Author Package",
      slug: "basic-author",
      description: "Essential open-access publishing with rigorous peer-review and permanent DOI indexing.",
      price_cents: 4900,
      currency: "USD",
      billing_interval: "one_time",
      features: [
        "Single manuscript submission & editorial triage",
        "Blind academic peer-review coordination",
        "Permanent Crossref DOI assignment",
        "Open Access PDF publication & repository deposit",
        "Author citation tracking & download analytics",
      ],
      cta_text: "Choose Basic",
      cta_url: "/submit-manager",
      is_active: true,
      is_featured: false,
      sort_order: 1,
    },
    {
      name: "Pro Research Package",
      slug: "pro-research",
      description: "Accelerated publication with priority peer-review, professional copyediting, and article audio narration.",
      price_cents: 14900,
      currency: "USD",
      billing_interval: "one_time",
      features: [
        "Everything in Basic, plus:",
        "Fast-track 14-day peer-review cycle",
        "Professional academic copyediting & XML/HTML proofs",
        "AI-narrated article audio edition",
        "Instant ORCID sync & Google Scholar indexing",
        "Priority editorial support channel",
      ],
      cta_text: "Get Started",
      cta_url: "/submit-manager",
      is_active: true,
      is_featured: true,
      sort_order: 2,
    },
    {
      name: "Institutional & Society Tier",
      slug: "institutional-society",
      description: "Comprehensive managed publishing infrastructure for research departments, societies, and conference proceedings.",
      price_cents: 39900,
      currency: "USD",
      billing_interval: "month",
      features: [
        "Unlimited journal issues & manuscript volume hosting",
        "Dedicated OJS 3.4 instance with custom domain",
        "Automated APC billing & institutional waivers",
        "Editorial board roster & reviewer management",
        "PubMed Central & DOAJ packaging pipeline",
        "Dedicated technical account manager & 99.9% SLA",
      ],
      cta_text: "Contact Team",
      cta_url: "/contact",
      is_active: true,
      is_featured: false,
      sort_order: 3,
    },
  ]

  for (const offer of sampleOffers) {
    await prisma.offer.upsert({
      where: { slug: offer.slug },
      update: {},
      create: offer,
    })
    console.log(`✓ Seeded offer: ${offer.name} (${offer.slug})`)
  }

  console.log("Seeding offers complete.")
}

main()
  .catch((e) => {
    console.error("Error seeding offers:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
