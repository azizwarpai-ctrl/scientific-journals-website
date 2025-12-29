"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Users, FileText, TrendingUp, Search, Shield } from "lucide-react"
import { GSAPWrapper } from "@/components/gsap-wrapper"

export default function SolutionsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-20">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl text-balance">Our Solutions</h1>
                <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                  Comprehensive digital publishing solutions designed to empower journals, editors, and researchers
                  worldwide
                </p>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: BookOpen,
                  title: "e-Journal Platform",
                  description:
                    "Complete solution for journal creation, hosting, and management with advanced digital tools",
                  color: "primary",
                },
                {
                  icon: FileText,
                  title: "Submit Manager",
                  description: "Intuitive manuscript submission platform streamlining the entire review process",
                  color: "secondary",
                },
                {
                  icon: Users,
                  title: "Editorial & Review",
                  description: "End-to-end editorial and peer review systems for efficient scholarly communication",
                  color: "primary",
                },
                {
                  icon: Search,
                  title: "CrossRef Integration",
                  description: "DOI, Crossmark, and Similarity Check services for publication integrity",
                  color: "secondary",
                },
                {
                  icon: TrendingUp,
                  title: "Citation Metrics",
                  description: "Comprehensive citation tracking and impact factor calculation services",
                  color: "primary",
                },
                {
                  icon: Shield,
                  title: "Archiving Solutions",
                  description: "Long-term preservation through Portico and CLOCKSS archiving services",
                  color: "secondary",
                },
              ].map((service, idx) => {
                const Icon = service.icon
                return (
                  <GSAPWrapper key={idx} animation="slideUp" delay={0.1 + idx * 0.1}>
                    <Card className="h-full transition-all hover:shadow-xl hover:-translate-y-1">
                      <CardContent className="pt-6">
                        <div
                          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${service.color}/10`}
                        >
                          <Icon className={`h-6 w-6 text-${service.color}`} />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">{service.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                      </CardContent>
                    </Card>
                  </GSAPWrapper>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
