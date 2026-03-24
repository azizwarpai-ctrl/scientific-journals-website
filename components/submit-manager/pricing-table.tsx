"use client"

import { useState } from 'react';
import { Check, Plus, Minus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetPricingPlans } from "@/src/features/billing/api/use-get-pricing-plans";
import { useCreateCheckout } from "@/src/features/billing/api/use-create-checkout";
import { toast } from "sonner";

import { Serialized } from "@/src/lib/serialize";
import type { PricingPlan as PrismaPricingPlan } from "@prisma/client";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  extraFeatures?: string[];
  popular?: boolean;
  buttonVariant?: 'outline' | 'default';
  cta: string;
  href?: string;
}

function PricingCard({ 
  plan, 
  onSubscribe, 
  isSubscribing 
}: { 
  plan: PricingPlan; 
  onSubscribe: (id: string) => void;
  isSubscribing: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!!plan.popular);

  const handleAction = () => {
    if (plan.name === "Enterprise" && plan.href) {
      window.location.href = plan.href;
      return;
    }
    onSubscribe(plan.id);
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-6 md:p-8 transition-colors ${
        plan.popular
          ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
          : 'bg-transparent border border-[#2a2a2a]/40 hover:border-[#2a2a2a]'
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute top-6 right-6">
          <Badge
            variant="secondary"
            className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full hover:bg-white/90 shadow-sm"
          >
            Most Popular
          </Badge>
        </div>
      )}

      {/* Plan Header */}
      <div className="mb-6">
        <h3 className="text-white text-xl font-semibold mb-2">{plan.name}</h3>
        <p className="text-gray-400 text-sm h-10">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mb-8">
        <span className="text-white text-4xl font-bold">{plan.price}</span>
        <span className="text-gray-500 text-sm ml-2">{plan.period}</span>
      </div>

      {/* CTA Button */}
      <Button
        variant={plan.buttonVariant}
        onClick={handleAction}
        disabled={isSubscribing && plan.name !== "Enterprise"}
        className={`w-full mb-8 py-6 h-auto rounded-lg text-base font-medium transition-all duration-200 ${
          plan.popular
            ? 'bg-white text-black hover:bg-gray-100 shadow-md'
            : 'bg-[#1a1a1a] text-white border border-[#2a2a2a] hover:bg-[#252525]'
        }`}
      >
        {isSubscribing && plan.name !== "Enterprise" && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {plan.cta}
      </Button>

      {/* Features List */}
      <ul className="space-y-4 flex-1">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <Check className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Expandable Extra Features */}
      {plan.extraFeatures && plan.extraFeatures.length > 0 && (
        <div className="mt-6 pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-full py-3 border-t border-[#2a2a2a] text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-md group"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Hide advanced features" : "Show advanced features"}
          >
            {isExpanded ? (
              <Minus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            ) : (
              <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-sm font-medium">{isExpanded ? 'Hide' : 'Show'} Advanced Features</span>
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isExpanded ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <ul className="space-y-4 overflow-hidden">
              {plan.extraFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function SubmitManagerPricing() {
  const { data: remotePlans, isLoading, isError, error } = useGetPricingPlans();
  const { mutate: createCheckout } = useCreateCheckout();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  
  const handleSubscribe = (planId: string) => {
    setSubscribingPlanId(planId);
    createCheckout(
      { pricingPlanId: parseInt(planId) },
      {
        onSettled: () => setSubscribingPlanId(null)
      }
    );
  };

  const pricingPlans: PricingPlan[] = (remotePlans as Serialized<PrismaPricingPlan>[])?.map((plan) => {
    // Map DB features (Json/Record) to string array
    const features: string[] = [];
    const extraFeatures: string[] = [];
    
    if (plan.features && typeof plan.features === 'object') {
      Object.entries(plan.features as Record<string, boolean>).forEach(([feature, isExtra]) => {
        if (isExtra) extraFeatures.push(feature);
        else features.push(feature);
      });
    }

    const numericPrice = typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price;

    return {
      id: plan.id.toString(),
      name: plan.name,
      description: plan.description || "Simple pricing for your journals.",
      price: numericPrice === 0 ? "Free" : `$${numericPrice}`,
      period: numericPrice === 0 ? "forever" : "per month",
      features: features.length > 0 ? features : ["Standard OJS Sync", "Basic Analytics"],
      extraFeatures: extraFeatures,
      popular: plan.is_popular,
      buttonVariant: plan.is_popular ? 'default' : 'outline',
      cta: plan.name === "Enterprise" ? "Contact Sales" : (numericPrice === 0 ? "Get Started" : "Start Free Trial"),
      href: plan.name === "Enterprise" ? "mailto:sales@scientific-journals.com" : undefined,
    };
  }) || [];

  return (
    <section className="bg-black py-20 lg:py-32" id="pricing">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-white text-3xl md:text-5xl font-bold mb-4 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto text-pretty">
            Choose the plan that fits your publishing volume. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        {isLoading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (isError || error) ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Failed to load pricing</h3>
            <p className="text-gray-400 max-w-sm mb-6">
              There was an error fetching the subscription plans. Please try refreshing the page.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : pricingPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl text-center">
            <h3 className="text-white text-lg font-semibold mb-2">No plans available</h3>
            <p className="text-gray-400 max-w-sm">
              We couldn't find any subscription plans at the moment. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {pricingPlans.map((plan) => (
              <PricingCard 
                key={plan.id} 
                plan={plan} 
                onSubscribe={handleSubscribe}
                isSubscribing={subscribingPlanId === plan.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

