"use client"

import { GSAPWrapper } from "@/components/gsap-wrapper"
import { MetricTile } from "@/app/about/components/metric-tile"
import { SectionEyebrow } from "@/components/section-eyebrow"
import { BookOpen, FileText, Users, Globe, BarChart3 } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"

export interface PlatformStatistics {
  totalJournals: number;
  totalArticles: number;
  totalUsers: number;
  countriesCount: number;
}

interface PlatformStatsProps {
  stats: PlatformStatistics | undefined;
  isLoading?: boolean;
  isError?: boolean;
  variant?: "home" | "about";
  adminStatsBlockTitle?: string;
  adminStatsBlockSubtitle?: string;
}

export function PlatformStats({ 
  stats, 
  isLoading, 
  isError, 
  variant = "home",
  adminStatsBlockTitle = "Our Global Impact",
  adminStatsBlockSubtitle = "Live measurements from the DigitoPub platform — journals onboarded, articles published, and researchers served across the scientific community."
}: PlatformStatsProps) {
  
  if (isLoading) {
    return (
      <section className={"py-12 " + (variant === "about" ? "md:py-32" : "")}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-muted/60" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-4 text-destructive font-medium">
        Failed to load statistics. Please try again later.
      </div>
    )
  }

  const hasStats = stats && (stats.totalJournals + stats.totalArticles + stats.totalUsers + stats.countriesCount > 0)
  
  if (!hasStats || !stats) {
    return null
  }

  return (
    <GSAPWrapper animation={variant === "about" ? "fadeIn" : "slideUp"} delay={variant === "home" ? 0.2 : 0}>
      <section className={`relative overflow-hidden ${variant === "home" ? "py-16 md:py-20 border-y border-border/50 bg-muted/10" : "py-24 md:py-32"}`}>
        {variant === "about" && (
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              backgroundImage: "radial-gradient(circle at 85% 10%, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 50%)",
            }}
          />
        )}
        <div className="container mx-auto px-4 md:px-6 relative">
          
          {variant === "about" && (
            <div className="max-w-2xl mb-14">
              <SectionEyebrow icon={BarChart3}>Platform Analytics</SectionEyebrow>
              <h2 className="mt-5 text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-balance">
                {adminStatsBlockTitle}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed text-balance">
                {adminStatsBlockSubtitle}
              </p>
            </div>
          )}

          {variant === "home" && (
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <SectionEyebrow icon={BarChart3}>Impact in Numbers</SectionEyebrow>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
                Our Growing Network
              </h2>
            </div>
          )}

          {variant === "home" ? (
            <div className="grid gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="mb-2 text-blue-500 dark:text-blue-400">
                  <AnimatedCounter end={stats.totalJournals} suffix="+" duration={2500} />
                </div>
                <div className="text-sm text-muted-foreground">Active Journals</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-sky-500 dark:text-sky-400">
                  <AnimatedCounter end={stats.totalArticles} suffix="+" duration={2500} />
                </div>
                <div className="text-sm text-muted-foreground">Published Articles</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-indigo-500 dark:text-indigo-400">
                  <AnimatedCounter end={stats.totalUsers} suffix="+" duration={2500} />
                </div>
                <div className="text-sm text-muted-foreground">Researchers</div>
              </div>
              <div className="text-center">
                <div className="mb-2 text-cyan-500 dark:text-cyan-400">
                  <AnimatedCounter end={stats.countriesCount} suffix="+" duration={2500} />
                </div>
                <div className="text-sm text-muted-foreground">Countries (Estimated)</div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                icon={BookOpen}
                value={stats.totalJournals}
                label="Active Journals"
                caption="Peer-reviewed and indexed"
                accent="primary"
              />
              <MetricTile
                icon={FileText}
                value={stats.totalArticles}
                label="Published Articles"
                caption="Openly discoverable"
                accent="secondary"
              />
              <MetricTile
                icon={Users}
                value={stats.totalUsers}
                label="Researchers"
                caption="Authors, editors & reviewers"
                accent="primary"
              />
              <MetricTile
                icon={Globe}
                value={stats.countriesCount}
                label="Countries Reached"
                caption="Truly global reach"
                accent="secondary"
              />
            </div>
          )}

          {variant === "about" && (
            <div className="mt-14 rounded-2xl border border-border/40 bg-background p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                <div className="md:w-64 shrink-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Open Standards
                  </div>
                  <div className="mt-1 text-lg font-semibold">Built on the infrastructure of trust</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-x-8 gap-y-3 items-center text-sm text-muted-foreground">
                  {["CrossRef", "DOI", "ORCID", "Crossmark", "Similarity Check", "Portico", "CLOCKSS"].map(
                    (label) => (
                      <span key={label} className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="font-medium text-foreground/80">{label}</span>
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </GSAPWrapper>
  )
}
