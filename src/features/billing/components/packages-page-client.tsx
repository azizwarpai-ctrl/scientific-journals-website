"use client"

import { useState } from "react"
import { Check, Star, Zap, Shield, Sparkles, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useGetPricingPlans } from "@/src/features/billing/api/use-get-pricing-plans"
import { useCreateCheckout } from "@/src/features/billing/api/use-create-checkout"
import { useGetAuthMe } from "@/src/features/auth/api/use-get-auth-me"
import { useIdentity } from "@/src/hooks/use-identity"
import { useRouter } from "next/navigation"

interface PackageFeature {
  text: string
  included: boolean
  highlight?: boolean
}

interface PackagePlan {
  id: string
  name: string
  tagline: string
  price: number
  billingPeriod: string
  isPopular?: boolean
  isBestValue?: boolean
  features: PackageFeature[]
  stripePriceId?: string
  buttonText: string
}

const DEFAULT_PACKAGES: PackagePlan[] = [
  {
    id: "starter",
    name: "Starter Journal",
    tagline: "Essential tools for newly established academic journals.",
    price: 49,
    billingPeriod: "/ month",
    features: [
      { text: "Up to 50 manuscript submissions / year", included: true },
      { text: "Standard OJS 3.x synchronization", included: true },
      { text: "Basic Article Metrics & Counter V5", included: true },
      { text: "Standard PDF Viewer & Download", included: true },
      { text: "Community Support & Help Desk", included: true },
      { text: "Audio Abstracts & Audio Player", included: false },
      { text: "Dedicated Domain & Custom Branding", included: false },
    ],
    buttonText: "Select Starter Package",
  },
  {
    id: "professional",
    name: "Professional Publisher",
    tagline: "Full-featured platform for growing scientific journals and societies.",
    price: 149,
    billingPeriod: "/ month",
    isPopular: true,
    isBestValue: true,
    features: [
      { text: "Unlimited manuscript submissions", included: true, highlight: true },
      { text: "Real-time OJS bidirectional synchronization", included: true, highlight: true },
      { text: "Advanced ORCID identity & SSO integration", included: true, highlight: true },
      { text: "AI Audio Abstract Generation & Hosting", included: true, highlight: true },
      { text: "DOI auto-registration (Crossref / DataCite)", included: true },
      { text: "Priority Email & Live Chat Support", included: true },
      { text: "Custom Domain & Journal Theme Customizer", included: true },
    ],
    buttonText: "Select Professional Package",
  },
  {
    id: "enterprise",
    name: "Institutional Enterprise",
    tagline: "Custom solution for university presses and large publishing groups.",
    price: 399,
    billingPeriod: "/ month",
    features: [
      { text: "Multi-journal portal (Unlimited journals)", included: true, highlight: true },
      { text: "Dedicated High-Performance Infrastructure", included: true, highlight: true },
      { text: "Custom API Access & Webhook Integrations", included: true },
      { text: "Comprehensive SLA (99.9% Uptime Guarantee)", included: true },
      { text: "Dedicated Account Manager & Onboarding", included: true },
      { text: "Full Custom Branding & White-Labeling", included: true },
      { text: "24/7 Priority Emergency Support", included: true },
    ],
    buttonText: "Contact Enterprise Sales",
  },
]

export function PackagesPageClient() {
  const router = useRouter()
  const { data: dbPlans, isLoading: isDbLoading } = useGetPricingPlans()
  const { mutate: createCheckout, isPending: isCheckoutPending } = useCreateCheckout()
  const { data: adminUser } = useGetAuthMe()
  const { data: publicIdentity } = useIdentity()

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isAuthenticated = Boolean(adminUser?.id || publicIdentity?.authenticated)

  // Map DB plans or fallback to DEFAULT_PACKAGES
  const packagesToDisplay: PackagePlan[] = (dbPlans && dbPlans.length > 0)
    ? dbPlans.map((plan) => {
        const rawFeatures = (plan.features as Record<string, boolean>) || {}
        const featureList: PackageFeature[] = Object.entries(rawFeatures).map(([text, included]) => ({
          text,
          included: Boolean(included),
        }))

        // Ensure default features if empty
        if (featureList.length === 0) {
          featureList.push(
            { text: "Full OJS Read-Only Sync & Archiving", included: true },
            { text: "ORCID Single Sign-On Access", included: true },
            { text: "Article Metrics & Download Statistics", included: true },
            { text: "Standard Support & Help Center", included: true }
          )
        }

        return {
          id: plan.id.toString(),
          name: plan.name,
          tagline: plan.description || "Professional journal publishing and indexing package.",
          price: Number(plan.price),
          billingPeriod: Number(plan.price) === 0 ? "free" : "/ month",
          isPopular: plan.is_popular,
          stripePriceId: plan.stripe_price_id || undefined,
          features: featureList,
          buttonText: `Select ${plan.name}`,
        }
      })
    : DEFAULT_PACKAGES

  const handleSelectPackage = (pkg: PackagePlan) => {
    setSuccessMessage(null)
    setErrorMessage(null)
    setSelectedPlanId(pkg.id)

    if (pkg.id === "enterprise" || pkg.price >= 300) {
      window.location.href = "mailto:support@scientific-journals.com?subject=Enterprise%20Package%20Inquiry"
      return
    }

    if (!adminUser?.id) {
      // Prompt sign in
      setErrorMessage("Please sign in with an admin account to proceed with package subscription.")
      setTimeout(() => {
        router.push(`/admin/login?redirect=/packages`)
      }, 1500)
      return
    }

    // Call checkout API if numerical plan ID exists
    const numericId = parseInt(pkg.id, 10)
    if (!isNaN(numericId)) {
      createCheckout(
        { pricingPlanId: numericId },
        {
          onSuccess: (data) => {
            if (data?.data?.url) {
              window.location.href = data.data.url
            } else {
              setSuccessMessage(`Package "${pkg.name}" selected successfully! Your request has been recorded.`)
            }
          },
          onError: (err: any) => {
            setErrorMessage(err.message || "Failed to initiate package checkout. Please try again.")
          },
          onSettled: () => {
            setSelectedPlanId(null)
          },
        }
      )
    } else {
      // Mock success for demo package selection
      setSuccessMessage(`Package "${pkg.name}" selected successfully! Associated with account: ${adminUser.email}`)
      setSelectedPlanId(null)
    }
  }

  return (
    <div className="py-12 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Header section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-12 md:mb-16">
          <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary bg-primary/5 rounded-full">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline-block text-primary" />
            Publishing Packages & Pricing
          </Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Choose the Perfect Package for Your Journal
          </h1>
          <p className="text-base md:text-xl text-muted-foreground leading-relaxed">
            Flexible publishing plans designed for scholarly journals, research institutes, and university presses. All packages include standard OJS sync and ORCID integration.
          </p>
        </div>

        {/* Notifications */}
        {successMessage && (
          <Alert className="mb-8 border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300 max-w-3xl mx-auto">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <AlertTitle className="font-semibold">Selection Saved</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mb-8 max-w-3xl mx-auto">
            <AlertTitle className="font-semibold">Authentication Required</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Package Grid */}
        {isDbLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {packagesToDisplay.map((pkg) => {
              const isProcessing = isCheckoutPending && selectedPlanId === pkg.id

              return (
                <Card
                  key={pkg.id}
                  className={`flex flex-col relative transition-all duration-300 hover:shadow-xl ${
                    pkg.isPopular
                      ? "border-2 border-primary bg-card shadow-lg shadow-primary/5 scale-[1.02]"
                      : "border border-border/60 hover:border-border"
                  }`}
                >
                  {pkg.isPopular && (
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <Badge className="bg-primary text-primary-foreground font-semibold px-4 py-1 rounded-full shadow-md text-xs tracking-wide uppercase">
                        <Star className="w-3 h-3 mr-1 fill-current inline-block" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pt-8 pb-4">
                    <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground min-h-[40px] mt-1.5">
                      {pkg.tagline}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-6">
                    {/* Price Tag */}
                    <div className="border-b border-border/50 pb-6">
                      <div className="flex items-baseline">
                        <span className="text-4xl md:text-5xl font-extrabold tracking-tight">
                          ${pkg.price}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium ml-2">
                          {pkg.billingPeriod}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Included Features:
                      </p>
                      <ul className="space-y-2.5">
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm">
                            {feat.included ? (
                              <Check className={`h-4 w-4 mt-0.5 shrink-0 ${feat.highlight ? "text-primary font-bold" : "text-green-500"}`} />
                            ) : (
                              <span className="h-4 w-4 mt-0.5 shrink-0 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground">✕</span>
                            )}
                            <span className={feat.included ? (feat.highlight ? "font-semibold text-foreground" : "text-foreground/90") : "text-muted-foreground/60 line-through"}>
                              {feat.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4 pb-6">
                    <Button
                      onClick={() => handleSelectPackage(pkg)}
                      disabled={isProcessing}
                      className={`w-full h-11 text-sm font-semibold transition-all ${
                        pkg.isPopular
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                          : "variant-outline"
                      }`}
                      variant={pkg.isPopular ? "default" : "outline"}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          {pkg.buttonText}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Customer Trust Footer */}
        <div className="mt-16 md:mt-24 p-8 rounded-2xl bg-muted/40 border border-border/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <Zap className="h-6 w-6 text-primary mx-auto" />
            <h4 className="font-semibold text-base">Instant Provisioning</h4>
            <p className="text-xs text-muted-foreground">Setup and OJS synchronization active within minutes of package activation.</p>
          </div>
          <div className="space-y-2">
            <Shield className="h-6 w-6 text-primary mx-auto" />
            <h4 className="font-semibold text-base">Data Security & Compliance</h4>
            <p className="text-xs text-muted-foreground">Full COPE ethics compliance, ORCID verification, and HTTPS encryption.</p>
          </div>
          <div className="space-y-2">
            <Star className="h-6 w-6 text-primary mx-auto" />
            <h4 className="font-semibold text-base">Flexible Upgrades</h4>
            <p className="text-xs text-muted-foreground">Upgrade or adjust your journal publishing package anytime from your dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
