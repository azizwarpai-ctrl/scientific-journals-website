"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import {
  Target, Eye, Globe, Sparkles, Building2,
  ShieldCheck, Scale, HeartHandshake, CheckCircle2
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import { GSAPWrapper } from "@/components/gsap-wrapper"

import { useGetAboutSections, type AboutSection } from "@/src/features/about"
import { useGetPlatformStatistics } from "@/src/features/statistics"

import { DynamicIcon } from "./components/dynamic-icon"
import { CredibilityStrip } from "./components/credibility-strip"
import { PillarCard } from "./components/pillar-card"
import { SectionEyebrow } from "@/components/section-eyebrow"
import { CtaSection } from "@/components/cta-section"
import { AboutSkeleton } from "./components/about-skeleton"
import { PlatformStats } from "@/components/platform-stats"


export default function AboutPage() {
  const { data: sections, isLoading: isAboutLoading } = useGetAboutSections()
  const { data: statsData } = useGetPlatformStatistics()

  const stats = statsData || {
    totalJournals: 0,
    totalArticles: 0,
    totalUsers: 0,
    countriesCount: 0,
  }
  const hasStats =
    stats.totalJournals + stats.totalArticles + stats.totalUsers + stats.countriesCount > 0

  const activeSections: AboutSection[] = sections || []
  const whoWeAre = activeSections.find((s) => s.section_key === "who_we_are")
  const vision = activeSections.find((s) => s.section_key === "vision")
  const mission = activeSections.find((s) => s.section_key === "goals")

  // Admin overrides for hero / stats copy — exclude canonical rows (those with section_key)
  const adminHero = activeSections.find((s) => s.block_type === "HERO" && !s.section_key)
  const adminStatsBlock = activeSections.find((s) => s.block_type === "STATS" && !s.section_key)

  // Custom admin-defined extra blocks (not canonical, not hero, not stats)
  const customExtras = activeSections.filter(
    (s) =>
      !s.section_key &&
      s.block_type !== "HERO" &&
      s.block_type !== "STATS"
  )

  const heroTitle = adminHero?.title || "About DigitoPub"
  const heroSubtitle =
    adminHero?.subtitle ||
    "Empowering the scientific community through open, transparent, and high-impact publishing."

  if (isAboutLoading) {
    return <AboutSkeleton />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <Navbar />
      <main className="flex-1">
        {/* ============== HERO ============== */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/40 via-background to-background">
            <div
              className="absolute inset-0 pointer-events-none opacity-70"
              aria-hidden
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 15%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 45%), radial-gradient(circle at 80% 25%, color-mix(in oklab, var(--color-secondary, var(--color-primary)) 14%, transparent) 0%, transparent 45%)",
              }}
            />
            <div className="container mx-auto px-4 md:px-6 relative pt-24 md:pt-32 pb-16 md:pb-24">
              <div className="mx-auto max-w-4xl text-center">
                <div className="flex justify-center mb-6">
                  <SectionEyebrow icon={Sparkles}>Scientific Publishing, Reimagined</SectionEyebrow>
                </div>
                <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground text-balance">
                  {heroTitle}
                </h1>
                <p className="mx-auto max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
                  {heroSubtitle}
                </p>
              </div>
              {hasStats && <CredibilityStrip stats={stats} />}
            </div>
          </section>
        </GSAPWrapper>

        {/* ============== WHO WE ARE ============== */}
        <GSAPWrapper animation="slideUp">
          <section className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid gap-12 lg:grid-cols-12 items-start">
                <div className="lg:col-span-4 lg:sticky lg:top-24">
                  <SectionEyebrow icon={Building2}>{whoWeAre ? "Who We Are" : "Our Story"}</SectionEyebrow>
                  <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                    {whoWeAre?.title || "Who We Are"}
                  </h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    A purpose-built publishing platform combining editorial rigor with modern engineering —
                    designed for journals, editors, and researchers who expect more.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {[
                      "End-to-end editorial workflow",
                      "Open standards & interoperability",
                      "Long-term preservation & discovery",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-foreground/80">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="lg:col-span-8">
                  <Card className="border-border/40 bg-background shadow-sm">
                    <CardContent className="p-8 md:p-12">
                      {whoWeAre?.content ? (
                        <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-loose whitespace-pre-wrap">
                          {whoWeAre.content}
                        </div>
                      ) : (
                        <div className="text-muted-foreground leading-relaxed">
                          DigitoPub is the official publishing platform of Digitodontics International Academy.
                          We help journals, editors, and researchers publish with confidence — from submission
                          and peer review to production, indexing, and preservation.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* ============== MISSION & VISION ============== */}
        <GSAPWrapper animation="slideUp">
          <section className="py-20 md:py-28 bg-muted/20 border-y border-border/40">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-2xl mb-14 md:mb-16">
                <SectionEyebrow icon={Target}>Purpose</SectionEyebrow>
                <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
                  The direction we move in — and the horizon we serve.
                </h2>
              </div>
              <div className="grid gap-8 md:grid-cols-2">
                <PillarCard
                  icon={Target}
                  eyebrow="Our Mission"
                  title={mission?.title || "Our Mission"}
                  body={
                    mission?.content ||
                    "To empower journals, editors, and researchers worldwide with comprehensive digital publishing solutions that uphold the highest standards of transparency, quality, and ethical scholarly communication."
                  }
                  accent="primary"
                />
                <PillarCard
                  icon={Eye}
                  eyebrow="Our Vision"
                  title={vision?.title || "Our Vision"}
                  body={
                    vision?.content ||
                    "To create a vibrant ecosystem where science and technology evolve in harmony, fostering a trusted environment where scholarly work can thrive — regardless of geography, institution, or discipline."
                  }
                  accent="secondary"
                />
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* ============== CUSTOM ADMIN EXTRAS (preserve CMS extensibility) ============== */}
        {customExtras.length > 0 && (
          <GSAPWrapper animation="slideUp">
            <section className="py-20">
              <div className="container mx-auto px-4 md:px-6 space-y-16">
                {customExtras.map((section) => (
                  <div key={section.id?.toString()} className="mx-auto max-w-5xl">
                    {section.title && (
                      <h2 className="mb-4 text-3xl md:text-4xl font-bold tracking-tight text-center">
                        {section.title}
                      </h2>
                    )}
                    {section.subtitle && (
                      <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-muted-foreground leading-relaxed">
                        {section.subtitle}
                      </p>
                    )}
                    {section.block_type === "TEXT" && section.content && (
                      <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-loose whitespace-pre-wrap">
                        {section.content}
                      </div>
                    )}
                    {(section.block_type === "CARDS" || section.block_type === "GRID") && (
                      <div
                        className={cn(
                          "grid gap-6",
                          section.block_type === "GRID"
                            ? "md:grid-cols-2 lg:grid-cols-4"
                            : section.items?.length === 3
                              ? "md:grid-cols-3"
                              : "md:grid-cols-2"
                        )}
                      >
                        {section.items?.map((item, i) => (
                          <Card
                            key={item.id?.toString() || i}
                            className="group border-border/40 bg-background hover:shadow-xl transition-all duration-300"
                          >
                            <CardContent className="p-7">
                              <div
                                className={cn(
                                  "mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                                  item.color_theme === "secondary"
                                    ? "bg-secondary/10 text-secondary"
                                    : "bg-primary/10 text-primary"
                                )}
                              >
                                <DynamicIcon name={item.icon} className="h-6 w-6" />
                              </div>
                              {item.title && (
                                <h3 className="mb-3 text-xl font-bold tracking-tight">{item.title}</h3>
                              )}
                              {item.description && (
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {item.description}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </GSAPWrapper>
        )}

        {/* ============== GLOBAL IMPACT — ANIMATED METRIC WALL ============== */}
        <PlatformStats
          stats={stats}
          variant="about"
          adminStatsBlockTitle={adminStatsBlock?.title ?? undefined}
          adminStatsBlockSubtitle={adminStatsBlock?.subtitle ?? undefined}
        />

        {/* ============== TRUST & VALUES ============== */}
        <GSAPWrapper animation="slideUp">
          <section className="py-20 md:py-28 bg-muted/20 border-y border-border/40">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-2xl mb-14 md:mb-16 mx-auto text-center">
                <SectionEyebrow icon={ShieldCheck}>What we stand for</SectionEyebrow>
                <h2 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight">
                  Principles that shape every decision
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    icon: Scale,
                    title: "Editorial Integrity",
                    body: "Transparent peer review, conflict checks, and similarity screening — built in, not bolted on.",
                  },
                  {
                    icon: Globe,
                    title: "Open Access, by Default",
                    body: "Discoverable, citable, and preserved. Research belongs to the people who can use it.",
                  },
                  {
                    icon: HeartHandshake,
                    title: "Partnership, Not Just Hosting",
                    body: "We work alongside editors and societies — your journal keeps its identity; we carry the infrastructure.",
                  },
                ].map(({ icon: Icon, title, body }) => (
                  <Card
                    key={title}
                    className="group border-border/40 bg-background hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <CardContent className="p-7">
                      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mb-2 text-lg font-bold tracking-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* ============== CTA ============== */}
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
