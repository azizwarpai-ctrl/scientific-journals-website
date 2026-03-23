import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export function SubmitManagerPricing() {
    const tiers = [
        {
            name: "Basic",
            price: "$99",
            description: "Perfect for single, emerging journals.",
            features: [
                "Up to 1 Journal",
                "Standard OJS Sync",
                "Basic Metadata Extraction",
                "Email Support",
            ],
            cta: "Get Started",
            popular: false,
        },
        {
            name: "Professional",
            price: "$299",
            description: "Ideal for growing university presses.",
            features: [
                "Up to 5 Journals",
                "Real-time OJS Sync",
                "Advanced Metadata Extraction",
                "Status Tracking Dashboards",
                "Priority Support",
            ],
            cta: "Start Free Trial",
            popular: true,
        },
        {
            name: "Enterprise",
            price: "$799",
            description: "Dedicated infrastructure for large publishers.",
            features: [
                "Unlimited Journals",
                "Custom OJS Integrations",
                "AI-Powered Automations",
                "SSO / SAML Login",
                "Dedicated Account Manager",
            ],
            cta: "Contact Sales",
            popular: false,
        },
    ]

    return (
        <section className="bg-background py-20 lg:py-32" id="pricing">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">Simple, transparent pricing</h2>
                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
                        Choose the plan that fits your publishing volume. No hidden fees.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
                    {tiers.map((tier, index) => (
                        <div
                            key={index}
                            className={`relative flex flex-col rounded-2xl border ${tier.popular ? "border-primary shadow-xl scale-105 z-10 bg-card" : "border-border shadow-sm bg-background"} p-8`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                                <p className="text-sm text-muted-foreground">{tier.description}</p>
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-extrabold">{tier.price}</span>
                                <span className="text-muted-foreground">/month</span>
                            </div>

                            <div className="flex-1">
                                <ul className="space-y-3 mb-8">
                                    {tier.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-3">
                                            <Check className="h-5 w-5 text-primary shrink-0" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button 
                                variant={tier.popular ? "default" : "outline"} 
                                className="w-full"
                                size="lg"
                            >
                                {tier.cta}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
