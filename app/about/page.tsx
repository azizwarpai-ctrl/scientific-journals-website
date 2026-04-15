"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Target, Eye, Award, Globe, BookOpen, Users, FileText, BarChart3, 
  Shield, Cpu, Zap, Activity, LayoutTemplate, Sparkles, Building2, Workflow
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
    <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/40 overflow-hidden bg-background">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
            <Icon className="h-7 w-7" />
          </div>
          <div className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            {typeof value === 'number' ? <FormattedCounter value={value} suffix={suffix} /> : value}
          </div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

const ICON_MAP: Record<string, React.ElementType> = {
  Globe, Award, Target, Eye, Users, Shield, Cpu, Zap, Activity, Sparkles, Building2, Workflow, LayoutTemplate
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
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <section className="relative py-20 md:py-32 overflow-hidden border-b border-border/30">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center space-y-4 flex flex-col items-center">
                <Skeleton className="h-16 w-3/4 rounded-xl" />
                <Skeleton className="h-6 w-full rounded-md" />
                <Skeleton className="h-6 w-4/5 rounded-md" />
              </div>
            </div>
          </section>
          <section className="py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid gap-8 md:grid-cols-2">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
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
  const adminStatsBlock = hasAboutContent ? sections!.find(s => s.block_type === "STATS") : null

  // Render functions for each block type
  const renderHero = (section: any, index: number) => (
    <GSAPWrapper key={section.id?.toString() || `hero-${index}`} animation="fadeIn">
      <section className="relative bg-gradient-to-b from-muted/50 to-background pt-24 pb-16 md:pt-32 md:pb-24 border-b border-border/40">
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="mx-auto max-w-4xl text-center">
            {section.title && (
              <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground text-balance">
                {section.title}
              </h1>
            )}
            {section.subtitle && (
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed text-balance mx-auto max-w-3xl">
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
      <section className={cn("py-20", index % 2 !== 0 ? "bg-muted/10" : "")}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl bg-background rounded-2xl p-8 md:p-12 shadow-sm border border-border/40">
            {section.title && (
              <h2 className="mb-8 text-3xl md:text-4xl font-bold tracking-tight border-b border-border/50 pb-4">
                {section.title}
              </h2>
            )}
            <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-loose whitespace-pre-wrap">
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
        <section className={cn("py-20", index % 2 !== 0 ? "bg-muted/10" : "")}>
          <div className="container mx-auto px-4 md:px-6">
            {section.title && (
              <div className="mb-16 text-center">
                <h2 className="mb-4 text-3xl md:text-4xl font-bold tracking-tight">{section.title}</h2>
                {section.subtitle && (
                  <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}
            <div className={`grid gap-8 ${cols}`}>
              {section.items?.map((item, i) => (
                <Card key={item.id?.toString() || i} className="group hover:shadow-xl transition-all duration-300 border-border/40 overflow-hidden bg-background">
                  <div className={cn("h-1.5 w-full", item.color_theme === 'secondary' ? 'bg-secondary' : 'bg-primary')} />
                  <CardContent className="p-8">
                    <div className={cn(
                      "mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-300",
                      item.color_theme === 'secondary' ? 'bg-secondary/10 group-hover:bg-secondary/20' : 'bg-primary/10 group-hover:bg-primary/20'
                    )}>
                      <DynamicIcon name={item.icon} className={cn("h-7 w-7", item.color_theme === 'secondary' ? 'text-secondary' : 'text-primary')} />
                    </div>
                    {item.title && <h3 className="mb-4 text-2xl font-bold tracking-tight">{item.title}</h3>}
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
      <section className={cn("py-20", index % 2 !== 0 ? "bg-muted/10" : "")}>
        <div className="container mx-auto px-4 md:px-6">
          {(section.title || section.subtitle) && (
            <div className="mb-16 text-center">
              {section.title && <h2 className="mb-4 text-3xl md:text-4xl font-bold tracking-tight">{section.title}</h2>}
              {section.subtitle && (
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
                  {section.subtitle}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {section.items?.map((item, i) => (
              <Card key={item.id?.toString() || i} className="group hover:shadow-md transition-all duration-300 border-border/40 bg-background hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="mb-5 flex justify-center">
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
                  {item.title && <h3 className="mb-3 font-bold text-lg tracking-tight">{item.title}</h3>}
                  {item.description && <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  const renderStatsSection = () => (
    <GSAPWrapper key="ojs-statistics" animation="fadeIn">
      <section className="py-24 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 uppercase tracking-wider">
              <BarChart3 className="h-4 w-4" />
              Platform Analytics
            </div>
            <h2 className="mb-4 text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground text-balance">
              {adminStatsBlock?.title || "Our Global Impact"}
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed text-balance">
              {adminStatsBlock?.subtitle || "Driving open-access discovery and collaboration across the scientific community."}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            <StatCard icon={BookOpen} value={stats.totalJournals || 0} label="Active Journals" />
            <StatCard icon={FileText} value={stats.totalArticles || 0} label="Published Articles" />
            <StatCard icon={Users} value={stats.totalUsers || 0} label="Researchers" />
            <StatCard icon={Globe} value={stats.countriesCount || 0} label="Countries Reached" />
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )

  const renderPlaceholder = (title: string, index: number, keyStr: string) => {
    // Map icons based on section
    const PlaceholderIcon = keyStr === "who_we_are" ? Building2 : keyStr === "vision" ? Eye : Target;

    return (
      <GSAPWrapper key={`placeholder-${keyStr}-${index}`} animation="slideUp">
        <section className={cn("py-20", index % 2 !== 0 ? "bg-muted/10" : "")}>
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-8 text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
              <div className="mx-auto p-12 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center bg-muted/30">
                <div className="h-16 w-16 rounded-full bg-background border border-border shadow-sm flex items-center justify-center mb-5">
                  <PlaceholderIcon className="h-8 w-8 text-muted-foreground opacity-60" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Section Under Construction</h3>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Content for this area has not been published yet. Please check back soon.
                </p>
              </div>
            </div>
          </div>
        </section>
      </GSAPWrapper>
    )
  }

  // Structuring logic
  const activeSections = sections || []
  const whoWeAre = activeSections.find(s => s.section_key === "who_we_are")
  const vision = activeSections.find(s => s.section_key === "vision")
  const goals = activeSections.find(s => s.section_key === "goals")
  
  const customHero = activeSections.filter(s => s.block_type === "HERO" && !s.section_key)
  const customOthers = activeSections.filter(s => s.block_type !== "HERO" && s.block_type !== "STATS" && !s.section_key)

  // Default fallback hero if admin hasn't created one
  const heroBlocks = customHero.length > 0 ? customHero : [{
    block_type: "HERO",
    title: "About DigitalPub",
    subtitle: "Empowering the scientific community through open, transparent, and high-impact publishing.",
    isFallback: true
  }]

  const orderedContent = [
    ...heroBlocks,
    whoWeAre || { placeholder: true, title: "Who We Are", key: "who_we_are" },
    vision || { placeholder: true, title: "Our Vision", key: "vision" },
    goals || { placeholder: true, title: "Our Mission", key: "goals" },
    ...customOthers
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <Navbar />
      <main className="flex-1">
        {/* Render explicitly ordered sections including placeholders */}
        {orderedContent.map((section: any, index: number) => {
          if (section.placeholder) {
            return renderPlaceholder(section.title, index, section.key)
          }
          switch (section.block_type) {
            case "HERO": return renderHero(section, index)
            case "TEXT": return renderText(section, index)
            case "CARDS": return renderCards(section, index)
            case "GRID": return renderGrid(section, index)
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
