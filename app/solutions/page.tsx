import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { prisma } from "@/lib/db/config"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen } from "lucide-react"
import { GSAPWrapper } from "@/components/gsap-wrapper"

export default async function SolutionsPage() {
  let journals: any[] = []
  try {
    journals = (await Promise.race([
      prisma.journal.findMany({ select: { id: true, title: true, description: true, field: true }, take: 6 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timeout")), 5000))
    ])) as any[]
  } catch (e) {
    console.error("Error fetching solutions journals:", e)
  }

  const colors = ["primary", "secondary"]

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
              {journals.map((journal, idx) => (
                <GSAPWrapper key={idx} animation="slideUp" delay={0.1 + idx * 0.1}>
                  <Card className="h-full transition-all hover:shadow-xl hover:-translate-y-1">
                    <CardContent className="pt-6">
                      <div
                        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${colors[idx % 2]}/10`}
                      >
                        <BookOpen className={`h-6 w-6 text-${colors[idx % 2]}`} />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">{journal.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {journal.description || `Specialized publishing solutions for ${journal.field} research and development.`}
                      </p>
                    </CardContent>
                  </Card>
                </GSAPWrapper>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
