import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SubmitManagerHero } from "@/components/submit-manager/hero-section"
import { SubmitManagerSocialProof } from "@/components/submit-manager/social-proof"
import { SubmitManagerHowItWorks } from "@/components/submit-manager/how-it-works"
import { SubmitManagerFeatures } from "@/components/submit-manager/feature-showcase"
import { SubmitManagerPricing } from "@/components/submit-manager/pricing-table"
import { SubmitManagerFaq } from "@/components/submit-manager/faq-section"

export default function SubmitManagerPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <SubmitManagerHero />
        <SubmitManagerSocialProof />
        <SubmitManagerHowItWorks />
        <SubmitManagerFeatures />
        <SubmitManagerPricing />
        <SubmitManagerFaq />
      </main>

      <Footer />
    </div>
  )
}

