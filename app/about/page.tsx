"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Target, Eye, Award, Globe, BookOpen, Users, FileText, BarChart3, 
  Shield, Cpu, Zap, Activity 
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { Skeleton } from "@/components/ui/skeleton"

import { useGetAboutSections, type AboutSection } from "@/src/features/about"
import { useGetPlatformStatistics } from "@/src/features/statistics"

// Formatted Counter Component
function FormattedCounter({ value, suffix = "", prefix = "" }: { 
  value: number
  suffix?: string
  prefix?: string
}) {
  return (
    <span className="tabular-nums tracking-tight">
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  )
}

// Stat Card with Icon
function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  suffix = ""
}: { 
  icon: React.ElementType
  value: string | number
  label: string
  suffix?: string
}) {
  return (
    <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold tracking-tight text-foreground">
            {typeof value === 'number' ? <FormattedCounter value={value} suffix={suffix} /> : value}
          </div>
          <div className="text-sm text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

const ICON_MAP: Record<string, React.ElementType> = {
  Globe, Award, Target, Eye, Users, Shield, Cpu, Zap, Activity
}

const DynamicIcon = ({ name, className }: { name: string | null | undefined, className?: string }) => {
  const Icon = name && ICON_MAP[name] ? ICON_MAP[name] : Globe
  return <Icon className={className} />
}

export default function AboutPage() {
  const { data: sections, isLoading: isAboutLoading, isError: isAboutError } = useGetAboutSections()
  const { data: statsData } = useGetPlatformStatistics()

  if (isAboutLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center space-y-4 flex flex-col items-center">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-4/5" />
              </div>
            </div>
          </section>
          <section className="py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid gap-8 md:grid-cols-2">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  // Statistics are optional — never block the page if they fail
  const stats = statsData || {
    totalJournals: 0,
    totalArticles: 0,
    totalUsers: 0,
    countriesCount: 0
  }

  // Determine what content is available
  const hasAboutContent = !isAboutError && sections && sections.length > 0
  const hasStats = (stats.totalJournals + stats.totalArticles + stats.totalUsers + stats.countriesCount) > 0
  // Check if any dynamic section already uses STATS block type (admin-managed stats title/subtitle)
  const adminStatsBlock = hasAboutContent ? sections!.find(s => s.block_type === "STATS") : null

  // Case: No about data AND no statistics → empty state
  if (!hasAboutContent && !hasStats) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold mb-4">About Us</h1>
          <p className="text-muted-foreground">No content available yet.</p>
        </main>
        <Footer />
      </div>
    )
  }

  // Render functions for each block type
  const renderHero = (section: AboutSection, index: number) => (
    <GSAPWrapper key={section.id?.toString() || index} animation="fadeIn">
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="mx-auto max-w-3xl text-center">
            {section.title && (
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl text-balance">
                {section.title}
              </h1>
            )}
            {section.subtitle && (
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {section.subtitle}
              </p>
            )}
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  const renderText = (section: AboutSection, index: number) => (
    <GSAPWrapper key={section.id?.toString() || index} animation="slideUp">
      <section className={cn("py-16", index % 2 !== 0 ? "bg-muted/30" : "")}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl">
            {section.title && <h2 className="mb-6 text-3xl font-bold">{section.title}</h2>}
            <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {section.content}
            </div>
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  const renderCards = (section: AboutSection, index: number) => {
    const cols = section.items?.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
    return (
      <GSAPWrapper key={section.id?.toString() || index} animation="slideUp">
        <section className={cn("py-16", index % 2 !== 0 ? "bg-muted/30" : "")}>
          <div className="container mx-auto px-4 md:px-6">
            {section.title && (
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">{section.title}</h2>
                {section.subtitle && (
                  <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}
            <div className={`grid gap-8 ${cols}`}>
              {section.items?.map((item, i) => (
                <Card key={item.id?.toString() || i} className="group hover:shadow-xl transition-all duration-500 border-border/50">
                  <CardContent className="pt-6">
                    <div className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-lg group-hover:scale-110 transition-transform duration-300",
                      item.color_theme === 'secondary' ? 'bg-secondary/10' : 'bg-primary/10'
                    )}>
                      <DynamicIcon name={item.icon} className={cn("h-6 w-6", item.color_theme === 'secondary' ? 'text-secondary' : 'text-primary')} />
                    </div>
                    {item.title && <h2 className="mb-3 text-2xl font-bold">{item.title}</h2>}
                    {item.description && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </GSAPWrapper>
    )
  }

  const renderGrid = (section: AboutSection, index: number) => (
    <GSAPWrapper key={section.id?.toString() || index} animation="slideUp">
      <section className={cn("py-16", index % 2 !== 0 ? "bg-muted/30" : "")}>
        <div className="container mx-auto px-4 md:px-6">
          {(section.title || section.subtitle) && (
            <div className="mb-12 text-center">
              {section.title && <h2 className="mb-4 text-3xl font-bold md:text-4xl">{section.title}</h2>}
              {section.subtitle && (
                <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                  {section.subtitle}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {section.items?.map((item, i) => (
              <Card key={item.id?.toString() || i} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:-translate-y-1">
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110",
                      item.color_theme === "secondary" ? "bg-secondary/10" : "bg-primary/10"
                    )}>
                      <DynamicIcon name={item.icon} className={cn(
                        "h-8 w-8",
                        item.color_theme === "secondary" ? "text-secondary" : "text-primary"
                      )} />
                    </div>
                  </div>
                  {item.title && <h3 className="mb-2 font-semibold text-lg">{item.title}</h3>}
                  {item.description && <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  // Standalone OJS statistics section — always appended at the bottom when data is available.
  // If admin created a STATS block, its title/subtitle are used; otherwise defaults are shown.
  const renderStatsSection = () => (
    <GSAPWrapper key="ojs-statistics" animation="fadeIn">
      <section className="py-20 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <BarChart3 className="h-4 w-4" />
              Platform Analytics
            </div>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {adminStatsBlock?.title || "Our Impact in Numbers"}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
              {adminStatsBlock?.subtitle || "Real-time statistics from our publishing platform"}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={BookOpen} value={stats.totalJournals || 0} label="Active Journals" />
            <StatCard icon={FileText} value={stats.totalArticles || 0} label="Published Articles" />
            <StatCard icon={Users} value={stats.totalUsers || 0} label="Active Researchers" />
            <StatCard icon={Globe} value={stats.countriesCount || 0} label="Countries Reached" />
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Render dynamic about sections */}
        {hasAboutContent && sections!.map((section, index) => {
          switch (section.block_type) {
            case "HERO": return renderHero(section, index)
            case "TEXT": return renderText(section, index)
            case "CARDS": return renderCards(section, index)
            case "GRID": return renderGrid(section, index)
            // STATS block type is handled below as standalone — skip to avoid duplication
            case "STATS": return null
            default: return null
          }
        })}

        {/* OJS Statistics — always rendered at the bottom when data is available */}
        {hasStats && renderStatsSection()}
      </main>
      <Footer />
    </div>
  )
}
