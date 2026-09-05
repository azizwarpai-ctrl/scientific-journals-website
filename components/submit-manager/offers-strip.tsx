"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Sparkles, Check } from "lucide-react"
import { useOffers } from "@/src/features/offers/api/use-offers"
import { OfferBadge } from "@/src/features/offers/components/offer-badge"
import { Button } from "@/components/ui/button"

export function SubmitManagerOffers() {
  const { data: offers = [], isLoading } = useOffers()

  if (isLoading || offers.length === 0) {
    return null
  }

  // Display top 3 active offers
  const displayOffers = offers.slice(0, 3)

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
            <Link href="/packages">
              <span>View All Packages</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayOffers.map((offer) => {
            const priceFormatted = (offer.price_cents / 100).toLocaleString(undefined, {
              minimumFractionDigits: offer.price_cents % 100 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })
            const isFree = offer.price_cents === 0
            const interval =
              offer.billing_interval === "year"
                ? "/yr"
                : offer.billing_interval === "one_time"
                ? "one-time"
                : "/mo"

            const ctaDestination =
              offer.cta_url ||
              (offer.pricing_plan_id ? `/checkout?plan=${offer.pricing_plan_id}` : "/packages")

            return (
              <div
                key={offer.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  offer.is_featured
                    ? "border-2 border-indigo-500/80 bg-card shadow-lg shadow-indigo-500/10"
                    : "border border-border/70 bg-card/60 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      {offer.is_featured && <OfferBadge type="featured" />}
                      {offer.available_until && <OfferBadge type="limited-time" />}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-foreground">{offer.name}</h3>
                  {offer.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {offer.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-baseline gap-1">
                    {isFree ? (
                      <span className="text-2xl font-extrabold text-foreground">Free</span>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-muted-foreground">$</span>
                        <span className="text-2xl font-extrabold text-foreground">
                          {priceFormatted}
                        </span>
                        <span className="text-xs text-muted-foreground">{interval}</span>
                      </>
                    )}
                  </div>

                  <div className="border-t border-border/60 my-4" />

                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {(offer.features || []).slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground/90">
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
                    variant={offer.is_featured ? "default" : "outline"}
                    className={`w-full font-medium ${
                      offer.is_featured
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                        : ""
                    }`}
                  >
                    <Link href={ctaDestination}>
                      <span>{offer.cta_text || "Get Started"}</span>
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
