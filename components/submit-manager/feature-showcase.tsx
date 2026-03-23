import { InteractiveCard } from "@/components/ui/interactive-card"
import { Layers, FileText, Activity, Zap, Shield, Search } from "lucide-react"

export function SubmitManagerFeatures() {
    const features = [
        {
            title: "Seamless OJS Sync",
            description: "Directly connect the Submit Manager with your existing Open Journal Systems installation with a single API key. Bi-directional sync keeps data accurate.",
            icon: Layers,
        },
        {
            title: "Automated Metadata",
            description: "Intelligently extracts titles, abstracts, and author information from uploaded manuscript files, reducing manual data entry for authors.",
            icon: FileText,
        },
        {
            title: "Status Tracking",
            description: "Authors and editors get real-time visibility into the peer review process with unified dashboards and automated email notifications.",
            icon: Activity,
        },
        {
            title: "Rapid Deployment",
            description: "Get your journal online in minutes, not months. Our cloud-hosted infrastructure handles the scaling and security for you.",
            icon: Zap,
        },
        {
            title: "Enterprise Security",
            description: "Bank-grade encryption for all data in transit and at rest. Automated backups and GDPR compliant infrastructure.",
            icon: Shield,
        },
        {
            title: "Advanced Search",
            description: "Full-text indexing allows your editorial team to quickly locate manuscripts, reviews, and correspondence across all journals.",
            icon: Search,
        },
    ]

    return (
        <section className="bg-muted/30 py-20 lg:py-32" id="features">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">Engineered for Editorial Excellence</h2>
                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
                        Everything you need to manage the complete lifecycle of scholarly publishing, from submission to publication.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <InteractiveCard key={index} className="p-8 h-full">
                            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </InteractiveCard>
                    ))}
                </div>
            </div>
        </section>
    )
}
