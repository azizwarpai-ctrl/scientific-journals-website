"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Eye, Award, Globe, TrendingUp, BookOpen, Users, FileText, BarChart3, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

// Radial Progress Component (Academic Style)
function RadialProgress({ 
  value, 
  max, 
  label, 
  sublabel, 
  color = "primary",
  size = 120,
  unit
}: { 
  value: number
  max: number
  label: string
  sublabel?: string
  color?: "primary" | "secondary" | "accent"
  size?: number
  unit?: string
}) {
  const percentage = max <= 0 ? 0 : Math.max(0, Math.min((value / max) * 100, 100))
  const circumference = 2 * Math.PI * ((size - 8) / 2)
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  const colorClasses = {
    primary: "stroke-primary text-primary",
    secondary: "stroke-secondary text-secondary",
    accent: "stroke-chart-3 text-chart-3"
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - 8) / 2}
            fill="none"
            className="stroke-muted"
            strokeWidth={6}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - 8) / 2}
            fill="none"
            className={cn("transition-all duration-1000 ease-out", colorClasses[color])}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold", colorClasses[color].split(" ")[1])}>
            {percentage.toFixed(0)}{unit || "%"}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-foreground">{label}</div>
        {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
      </div>
    </div>
  )
}

// Horizontal Progress Bar with Academic Styling
function MetricBar({ 
  label, 
  value, 
  max, 
  color = "bg-primary",
  showValue = true 
}: { 
  label: string
  value: number
  max: number
  color?: string
  showValue?: boolean
}) {
  const percentage = max <= 0 ? 0 : Math.max(0, Math.min((value / max) * 100, 100))
  
  return (
    <div className="group">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {showValue && (
          <span className="font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            {value.toLocaleString()}
          </span>
        )}
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out relative",
            color
          )}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
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

  const SAMPLE_FIELD_DISTRIBUTION = [
    { field: "Medical & Health Sciences", count: 85, color: "bg-primary", total: 85 },
    { field: "Engineering & Technology", count: 65, color: "bg-secondary", total: 85 },
    { field: "Life Sciences & Biology", count: 55, color: "bg-chart-3", total: 85 },
    { field: "Social Sciences & Humanities", count: 45, color: "bg-chart-4", total: 85 },
  ];

  interface QualityMetrics {
    acceptanceRate: number;
    avgReviewTime: number;
  }

  let qualityMetrics: QualityMetrics | null = null

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
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

        {/* Mission & Vision */}
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

        {/* About Content */}
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

        {/* Values */}
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
              ].map((value, idx) => (
                <Card key={idx} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:-translate-y-1">
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

        {/* Enhanced Statistics Visualization */}
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
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

            {/* Detailed Analytics */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Field Distribution */}
              <Card className="lg:col-span-2 border-border/50">
                <CardContent className="pt-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Journals by Field</h3>
                      <p className="text-sm text-muted-foreground">Distribution across academic disciplines (Illustrative data)</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-5">
                    {SAMPLE_FIELD_DISTRIBUTION.map((item, idx) => (
                      <MetricBar 
                        key={idx}
                        label={item.field}
                        value={item.count}
                        max={item.total}
                        color={item.color}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>



              <div className="space-y-6">
                {/* Quality Metrics */}
                <Card className="border-border/50">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-bold mb-4">Quality Metrics</h3>
                    {qualityMetrics ? (
                      <div className="grid grid-cols-2 gap-4">
                        <RadialProgress 
                          value={(qualityMetrics as QualityMetrics).acceptanceRate} 
                          max={100} 
                          label="Acceptance Rate" 
                          sublabel="Industry avg: 30%"
                          color="primary"
                          size={100}
                        />
                        <RadialProgress 
                          value={(qualityMetrics as QualityMetrics).avgReviewTime} 
                          max={5} 
                          label="Avg. Review Time" 
                          sublabel="Weeks"
                          color="secondary"
                          size={100}
                          unit="w"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                        Metrics currently unavailable
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Branding */}
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
      </main>

      <Footer />
    </div>
  )
}
