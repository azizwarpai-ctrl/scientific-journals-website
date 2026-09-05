"use client"

import React from "react"
import Link from "next/link"
import { Check, ArrowRight, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { OfferBadge } from "./offer-badge"
import type { Offer } from "../types/offer"
import { cn } from "@/src/lib/utils"

interface OfferCardProps {
  offer: Offer
  className?: string
  isCompact?: boolean
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-foreground/90">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          <span className="leading-snug text-sm">{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export function OfferCard({ offer, className, isCompact = false }: OfferCardProps) {
  const priceDollars = (offer.price_cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: offer.price_cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })

  const isFree = offer.price_cents === 0

  const intervalLabel =
    offer.billing_interval === "year"
      ? "/year"
      : offer.billing_interval === "one_time"
      ? "one-time"
      : "/month"

  const features = Array.isArray(offer.features) ? offer.features : []
  const hasLimitedTime = Boolean(offer.available_until)

  const ctaDestination = offer.cta_url || (offer.pricing_plan_id ? `/checkout?plan=${offer.pricing_plan_id}` : "/submit-manager")

  return (
    <Card
      id={`offer-${offer.slug}`}
      className={cn(
        "relative flex flex-col justify-between transition-all duration-300 rounded-2xl overflow-hidden backdrop-blur-sm",
        offer.is_featured
          ? "border-2 border-indigo-500/80 dark:border-indigo-500 shadow-xl shadow-indigo-500/10 dark:shadow-indigo-500/20 bg-gradient-to-b from-indigo-50/40 via-background to-background dark:from-indigo-950/20 dark:via-background dark:to-background"
          : "border border-border/80 hover:border-border hover:shadow-lg bg-card/80",
        className
      )}
    >
      {/* Top badges bar */}
      <div className="pt-5 px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {offer.is_featured && <OfferBadge type="featured" />}
          {hasLimitedTime && <OfferBadge type="limited-time" />}
        </div>
        {offer.journal && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
            <BookOpen className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{offer.journal.title}</span>
          </span>
        )}
      </div>

      <CardHeader className={cn("px-6 pb-4", isCompact ? "pt-2" : "pt-4")}>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{offer.name}</h3>
        {offer.description && (
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {offer.description}
          </p>
        )}

        <div className="mt-5 flex items-baseline gap-1.5">
          {isFree ? (
            <span className="text-4xl font-extrabold tracking-tight text-foreground">Free</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-muted-foreground">$</span>
              <span className="text-4xl font-extrabold tracking-tight text-foreground">
                {priceDollars}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{intervalLabel}</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 py-2 flex-grow">
        <div className="border-t border-border/60 my-3" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          What&apos;s included:
        </p>
        <FeatureList features={features} />
      </CardContent>

      <CardFooter className="px-6 pt-4 pb-6">
        <Button
          asChild
          variant={offer.is_featured ? "default" : "outline"}
          size="lg"
          className={cn(
            "w-full font-semibold transition-all duration-200 group cursor-pointer",
            offer.is_featured
              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25"
              : "hover:bg-accent"
          )}
        >
          <Link href={ctaDestination}>
            <span>{offer.cta_text || "Get Started"}</span>
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
