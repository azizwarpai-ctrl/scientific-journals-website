import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Eye, Award, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl text-balance">About dis</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Redefining the future of academic publishing through seamless digital integration and innovation
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-bold">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To empower journals, editors, and researchers worldwide with comprehensive digital publishing
                    solutions that uphold the highest standards of transparency, quality, and ethical scholarly
                    communication. We bridge the gap between research creation, dissemination, and long-term
                    preservation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <Eye className="h-6 w-6 text-secondary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-bold">Our Vision</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To create a vibrant ecosystem where science and technology evolve in harmony, fostering a trusted
                    environment where scholarly work can thrive. We envision a future where every researcher has access
                    to world-class publishing tools and global reach.
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
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  At dis, we redefine the future of academic publishing through seamless digital integration and
                  innovation. As a forward-thinking scientific publisher, we provide a comprehensive suite of digital
                  publishing and management solutions designed to empower journals, editors, and researchers worldwide.
                </p>
                <p>
                  Our services include e-journal platform solutions for journal creation, hosting, and management;
                  SubmitManager, our intuitive e-submission platform; and end-to-end e-editorial and e-review systems
                  that streamline every stage of scholarly communication.
                </p>
                <p>
                  Beyond these core services, we offer CrossRef integration (DOI, Crossmark, Similarity Check), XML and
                  LaTeX production, ORCID author identification, citation metrics, indexing, and archiving solutions
                  through Portico and CLOCKSS—ensuring every publication meets the highest international standards of
                  accessibility and integrity.
                </p>
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
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Globe className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-semibold">Global Reach</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connecting researchers and institutions across 120+ countries worldwide
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                      <Award className="h-8 w-8 text-secondary" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-semibold">Quality</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Adhering to rigorous COPE ethical standards and international publishing guidelines
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Target className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-semibold">Transparency</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Open processes and clear communication at every stage of publication
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                      <Eye className="h-8 w-8 text-secondary" />
                    </div>
                  </div>
                  <h3 className="mb-2 font-semibold">Innovation</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Leveraging cutting-edge technology to advance scholarly communication
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Visual Branding */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-6 text-3xl font-bold">Our Brand Philosophy</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Our visual branding reflects our philosophy of digital growth and intellectual connectivity. The dis
                  identity—featuring gradient blue and orange tones—symbolizes the organic growth of knowledge rooted in
                  technological innovation.
                </p>
                <p>
                  The color palette represents the interconnection of ideas, researchers, and data. The dual-tone of
                  deep blue and vibrant orange conveys both academic reliability and forward-looking creativity.
                  Together, they capture our vision: a vibrant ecosystem where science and technology evolve in harmony
                  to advance open, ethical, and impactful scholarly communication.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Visualization */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Platform Growth</h2>
              <p className="text-muted-foreground">Our impact in numbers</p>
            </div>

            <div className="mx-auto max-w-4xl">
              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4 text-sm font-medium text-muted-foreground">Total Journals by Field</div>
                    <div className="space-y-3">
                      {[
                        { field: "Medical Sciences", count: 85, color: "bg-primary" },
                        { field: "Engineering", count: 65, color: "bg-secondary" },
                        { field: "Life Sciences", count: 55, color: "bg-chart-3" },
                        { field: "Social Sciences", count: 45, color: "bg-chart-4" },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{item.field}</span>
                            <span className="font-medium">{item.count}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${item.color}`}
                              style={{ width: `${(item.count / 85) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="mb-4 text-sm font-medium text-muted-foreground">Yearly Publications Growth</div>
                    <div className="space-y-3">
                      {[
                        { year: "2024", count: 4500 },
                        { year: "2023", count: 3800 },
                        { year: "2022", count: 2900 },
                        { year: "2021", count: 1800 },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span>{item.year}</span>
                            <span className="font-medium">{item.count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
                              style={{ width: `${(item.count / 4500) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
