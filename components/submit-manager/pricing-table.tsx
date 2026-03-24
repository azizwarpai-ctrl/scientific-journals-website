"use client"

import { useState } from 'react';
import { Check, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface PricingPlan {
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

const pricingPlans: PricingPlan[] = [
  {
    name: 'Basic',
    description: 'Perfect for single, emerging journals.',
    price: '$99',
    period: 'per month',
    features: [
      'Up to 1 Journal',
      'Standard OJS Sync',
      'Basic Metadata Extraction',
      'Email Support',
    ],
    buttonVariant: 'outline',
    cta: 'Get Started',
  },
  {
    name: 'Professional',
    description: 'Ideal for growing university presses.',
    price: '$299',
    period: 'per month',
    features: [
      'Up to 5 Journals',
      'Real-time OJS Sync',
      'Advanced Metadata Extraction',
      'Status Tracking Dashboards',
      'Priority Support',
    ],
    extraFeatures: [
      'Custom Domain Support',
      'Advanced Analytics',
      'API Access',
    ],
    popular: true,
    buttonVariant: 'default',
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    description: 'Dedicated infrastructure for large publishers.',
    price: '$799',
    period: 'per month',
    features: [
      'Unlimited Journals',
      'Custom OJS Integrations',
      'AI-Powered Automations',
      'SSO / SAML Login',
      'Dedicated Account Manager',
    ],
    extraFeatures: [
      'White-glove Onboarding',
      'Custom SLA Guarantee',
      'Volume Discounts',
    ],
    buttonVariant: 'outline',
    cta: 'Contact Sales',
    href: '/contact',
  },
];

function PricingCard({ plan }: { plan: PricingPlan }) {
  const [isExpanded, setIsExpanded] = useState(plan.popular ? true : false);

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
        asChild
        className={`w-full mb-8 py-6 h-auto rounded-lg text-base font-medium transition-all duration-200 ${
          plan.popular
            ? 'bg-white text-black hover:bg-gray-100 shadow-md'
            : 'bg-[#1a1a1a] text-white border border-[#2a2a2a] hover:bg-[#252525]'
        }`}
      >
        <Link href={plan.href || "/admin/login"}>{plan.cta}</Link>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {pricingPlans.map((plan, index) => (
            <PricingCard key={index} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
