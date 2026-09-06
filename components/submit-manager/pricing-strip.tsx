"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Check } from "lucide-react"
import { usePricingPlans } from "@/src/features/billing/api/use-pricing-plans"
import { PlanBadge } from "@/src/features/billing/components/plan-badge"
import { Button } from "@/components/ui/button"

const formattersCache = new Map<string, Intl.NumberFormat>()

function formatPlanPrice(price: number, currency = "USD"): string {
  const fractionDigits = price % 1 === 0 ? 0 : 2
  const cacheKey = `${currency}-${fractionDigits}`
  let formatter = formattersCache.get(cacheKey)
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    })
    formattersCache.set(cacheKey, formatter)
  }
  return formatter.format(price)
}

function extractFeatures(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.map(String)
  }
  if (features && typeof features === "object") {
    return Object.entries(features).reduce<string[]>((acc, [feature, enabled]) => {
      if (enabled) acc.push(feature)
      return acc
    }, [])
  }
  return []
}

export function SubmitManagerPricingStrip() {
  const { data: plans = [], isLoading } = usePricingPlans()

  if (isLoading || plans.length === 0) {
    return null
  }

  // Display top 3 active plans
  const displayPlans = plans.slice(0, 3)

  return (
    <section className="py-12 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Special Offers & Bundles
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Featured Publication Packages
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select an author bundle or journal sponsorship package to fast-track peer-review and indexing.
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="gap-1.5 self-start md:self-auto">
            <Link href="/submit-manager#pricing">
              <span>View All Pricing</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPlans.map((plan) => {
            const numericPrice = Number(plan.price) || 0
            const priceFormatted = formatPlanPrice(numericPrice, plan.currency || "USD")
            const isFree = numericPrice === 0
            const interval =
              plan.billing_interval === "year"
                ? "/yr"
                : plan.billing_interval === "one_time"
                ? "one-time"
                : "/mo"

            const isFeatured = Boolean(plan.is_featured || plan.is_popular)
            const ctaDestination = plan.cta_url || "/submit-manager#pricing"
            const featuresList = extractFeatures(plan.features)

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  isFeatured
                    ? "border-2 border-indigo-500/80 bg-card shadow-lg shadow-indigo-500/10"
                    : "border border-border/70 bg-card/60 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      {isFeatured && <PlanBadge type="featured" />}
                      {plan.available_until && <PlanBadge type="limited-time" />}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  {(plan.short_description || plan.description) && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {plan.short_description || plan.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-2xl font-extrabold text-foreground">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-extrabold text-foreground">
                          {priceFormatted}
                        </span>
                        <span className="text-xs text-muted-foreground">{interval}</span>
                      </>
                    )}
                  </div>

                  <div className="border-t border-border/60 my-4" />

                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {featuresList.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-foreground/90">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <Button
                    asChild
                    size="sm"
                    variant={isFeatured ? "default" : "outline"}
                    className={`w-full font-medium ${
                      isFeatured
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : ""
                    }`}
                  >
                    <Link href={ctaDestination}>
                      <span>{plan.cta_label || "Get Started"}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
