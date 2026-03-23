"use client"

import { useGetOjsJournals } from "@/src/features/ojs/api/use-get-ojs-journals"
import { Building2, FileText, CheckCircle2, Users } from "lucide-react"

export function SubmitManagerSocialProof() {
    const { data: journalsData, isLoading } = useGetOjsJournals()

    // Determine counts to show (use real data if available, otherwise placeholders)
    const journalCount = journalsData?.data?.length || 120
    const abstractViews = 450 // Static placeholder until we add real stats
    const articleCount = 12 // Placeholder 

    return (
        <section className="border-t border-b bg-card py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-10 text-center">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Trusted by researchers and editorial boards worldwide
                    </p>
                </div>

                <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <Building2 className="h-8 w-8 text-primary mb-2 opacity-80" />
                        <h4 className="text-3xl font-bold tracking-tight">
                            {isLoading ? "..." : `${journalCount}+`}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground">Connected Journals</p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <FileText className="h-8 w-8 text-primary mb-2 opacity-80" />
                        <h4 className="text-3xl font-bold tracking-tight">
                            {isLoading ? "..." : `${articleCount}k+`}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground">Published Articles</p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <Users className="h-8 w-8 text-primary mb-2 opacity-80" />
                        <h4 className="text-3xl font-bold tracking-tight">
                            {isLoading ? "..." : "8.5k+"}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground">Active Reviewers</p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <CheckCircle2 className="h-8 w-8 text-primary mb-2 opacity-80" />
                        <h4 className="text-3xl font-bold tracking-tight">
                            {isLoading ? "..." : "99.9%"}
                        </h4>
                        <p className="text-sm font-medium text-muted-foreground">Uptime Guarantee</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
