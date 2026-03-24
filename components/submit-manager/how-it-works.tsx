import { UserPlus, Link2, Send, LineChart } from "lucide-react"

export function SubmitManagerHowItWorks() {
    const steps = [
        {
            title: "Register Account",
            description: "Create your publisher or author account in seconds.",
            icon: UserPlus,
        },
        {
            title: "Connect OJS",
            description: "Link your existing Open Journal Systems instance securely.",
            icon: Link2,
        },
        {
            title: "Submit Manuscript",
            description: "Upload files and let our AI extract the metadata automatically.",
            icon: Send,
        },
        {
            title: "Track Progress",
            description: "Monitor the peer review status in real-time from your dashboard.",
            icon: LineChart,
        },
    ]

    return (
        <section className="bg-background py-20 lg:py-32" id="how-it-works">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">How it Works</h2>
                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
                        Four simple steps to modernize your publishing workflow.
                    </p>
                </div>

                <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-4">
                    {steps.map((step, index) => (
                        <div key={index} className="relative flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <step.icon className="h-8 w-8" />
                            </div>
                            {index < steps.length - 1 && (
                                <div className="absolute right-0 top-8 -mr-4 hidden w-8 border-t-2 border-dashed border-muted-foreground/30 md:block" />
                            )}
                            <h3 className="mb-2 text-xl font-bold">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
