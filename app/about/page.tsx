"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Eye, Award, Globe, BookOpen, Users, FileText, BarChart3, Loader2 } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { GSAPWrapper } from "@/components/gsap-wrapper"

import { useGetAboutContent } from "@/src/features/about"
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

export default function AboutPage() {
  const { data: aboutData, isLoading: isAboutLoading, isError: isAboutError } = useGetAboutContent()
  const { data: statsData, isLoading: isStatsLoading, isError: isStatsError } = useGetPlatformStatistics()

  if (isAboutLoading || isStatsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAboutError || isStatsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
        <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
          <Target className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Unavailable</h2>
        <p className="text-muted-foreground">We were unable to load the page content. Please try again later.</p>
      </div>
    )
  }

  // Use values from CMS or fallback to sensible defaults
  const content = aboutData || {
    heroTitle: "About Us",
    heroSubtitle: "",
    missionText: "",
    visionText: "",
    whoWeAreText: "",
    brandPhilosophyText: ""
  }

  // Use values from OJS DB or fallback to 0
  const stats = statsData || {
    totalJournals: 0,
    totalArticles: 0,
    totalUsers: 0,
    countriesCount: 0
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
            <div className="container mx-auto px-4 md:px-6 relative">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl text-balance">
                  {content.heroTitle}
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {content.heroSubtitle}
                </p>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Mission & Vision */}
        <GSAPWrapper animation="slideUp" delay={0.2}>
          <section className="py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid gap-8 md:grid-cols-2">
                <Card className="group hover:shadow-xl transition-all duration-500 border-border/50">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold">Our Mission</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {content.missionText}
                    </p>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-500 border-border/50">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 group-hover:scale-110 transition-transform duration-300">
                      <Eye className="h-6 w-6 text-secondary" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold">Our Vision</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {content.visionText}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* About Content */}
        <GSAPWrapper animation="slideUp" delay={0.3}>
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-6 text-3xl font-bold">Who We Are</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {content.whoWeAreText}
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Values */}
        <GSAPWrapper animation="slideUp" delay={0.4}>
          <section className="py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">Our Core Values</h2>
                <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                  Guided by principles that ensure the highest standards in scholarly publishing
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Globe, title: "Global Reach", desc: "Connecting researchers and institutions across 120+ countries worldwide", color: "primary" },
                  { icon: Award, title: "Quality", desc: "Adhering to rigorous COPE ethical standards and international publishing guidelines", color: "secondary" },
                  { icon: Target, title: "Transparency", desc: "Open processes and clear communication at every stage of publication", color: "primary" },
                  { icon: Eye, title: "Innovation", desc: "Leveraging cutting-edge technology to advance scholarly communication", color: "secondary" },
                ].map((value) => (
                  <Card key={value.title} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:-translate-y-1">
                    <CardContent className="pt-6 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110",
                          value.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                        )}>
                          <value.icon className={cn(
                            "h-8 w-8",
                            value.color === "primary" ? "text-primary" : "text-secondary"
                          )} />
                        </div>
                      </div>
                      <h3 className="mb-2 font-semibold text-lg">{value.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {value.desc}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Enhanced Statistics Visualization */}
        <GSAPWrapper animation="fadeIn" delay={0.2}>
          <section className="py-20 bg-gradient-to-b from-background via-muted/30 to-background">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-12 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <BarChart3 className="h-4 w-4" />
                  Platform Analytics
                </div>
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">Impact & Growth</h2>
                <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                  Measurable outcomes reflecting our commitment to advancing scholarly communication worldwide
                </p>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                  icon={BookOpen} 
                  value={stats.totalJournals || 0}
                  label="Active Journals" 
                />
                <StatCard 
                  icon={FileText} 
                  value={stats.totalArticles || 0}
                  label="Published Articles" 
                />
                <StatCard 
                  icon={Users} 
                  value={stats.totalUsers || 0}
                  label="Active Researchers" 
                />
                <StatCard 
                  icon={Globe} 
                  value={stats.countriesCount || 0}
                  label="Countries Reached" 
                />
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Visual Branding */}
        <GSAPWrapper animation="slideUp" delay={0.3}>
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-6 text-3xl font-bold">Our Brand Philosophy</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {content.brandPhilosophyText}
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>
      </main>

      <Footer />
    </div>
  )
}
