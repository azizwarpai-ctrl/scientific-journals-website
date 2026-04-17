"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight } from "lucide-react"
import { SectionEyebrow } from "@/components/section-eyebrow"
import { GSAPWrapper } from "@/components/gsap-wrapper"

export function CtaSection() {
  return (
    <GSAPWrapper animation="fadeIn">
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-10 md:p-14">
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden
              style={{
                backgroundImage:
                  "radial-gradient(circle at 90% 110%, color-mix(in oklab, var(--color-primary) 20%, transparent), transparent 50%)",
              }}
            />
            <div className="relative flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
              <div className="flex-1">
                <SectionEyebrow icon={Sparkles}>Join the ecosystem</SectionEyebrow>
                <h2 className="mt-4 text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
                  Publish with the platform built for scholarly communication.
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">
                  Whether you run a journal or submit to one, DigitoPub gives you modern tools,
                  open standards, and a partner that takes stewardship seriously.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                <Button asChild size="lg" className="group">
                  <Link href="/submit-manager">
                    Submit Research
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact">Talk to our team</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </GSAPWrapper>
  )
}
