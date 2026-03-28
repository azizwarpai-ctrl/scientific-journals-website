"use client"

import { useGetPlatformStatistics } from "@/src/features/statistics"
import { Building2, FileText, CheckCircle2, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function SubmitManagerSocialProof() {
    const { data: stats, isLoading } = useGetPlatformStatistics()

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
                        {isLoading ? (
                            <Skeleton className="h-9 w-16" />
                        ) : (
                            <h4 className="text-3xl font-bold tracking-tight">
                                {stats?.totalJournals ?? "—"}+
                            </h4>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">Connected Journals</p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <FileText className="h-8 w-8 text-primary mb-2 opacity-80" />
                        {isLoading ? (
                            <Skeleton className="h-9 w-16" />
                        ) : (
                            <h4 className="text-3xl font-bold tracking-tight">
                                {stats?.totalArticles ?? "—"}+
                            </h4>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">Published Articles</p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <Users className="h-8 w-8 text-primary mb-2 opacity-80" />
                        {isLoading ? (
                            <Skeleton className="h-9 w-16" />
                        ) : (
                            <h4 className="text-3xl font-bold tracking-tight">
                                {stats?.totalUsers ?? "—"}+
                            </h4>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        <CheckCircle2 className="h-8 w-8 text-primary mb-2 opacity-80" />
                        {isLoading ? (
                            <Skeleton className="h-9 w-16" />
                        ) : (
                            <h4 className="text-3xl font-bold tracking-tight">
                                {stats?.countriesCount ?? "—"}+
                            </h4>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">Countries Reached</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
