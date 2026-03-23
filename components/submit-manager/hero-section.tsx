import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export function SubmitManagerHero() {
    return (
        <section className="relative overflow-hidden bg-background py-20 lg:py-32">
            {/* Background decorations */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
            <div className="absolute -left-40 top-20 z-0 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute -right-40 bottom-20 z-0 h-96 w-96 rounded-full bg-secondary/10 blur-[100px]" />

            <div className="container relative z-10 mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm font-medium">
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                        Next-Gen Publishing Platform
                    </div>
                    
                    <h1 className="mb-6 text-5xl font-extrabold tracking-tight md:text-6xl lg:text-7xl text-balance">
                        Automate your journal <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">submission workflow</span>
                    </h1>
                    
                    <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground leading-relaxed text-pretty">
                        Connect directly to Open Journal Systems (OJS). Streamline peer review, automate metadata extraction, and track manuscript status in real-time.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8" asChild>
                            <Link href="#pricing">
                                View Pricing <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8" asChild>
                            <Link href="#contact">
                                Contact Sales
                            </Link>
                        </Button>
                    </div>

                    <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>No credit card required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>14-day free trial</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Seamless OJS integration</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
