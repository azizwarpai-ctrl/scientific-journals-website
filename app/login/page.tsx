import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { prisma } from "@/src/lib/db/config"
import { LoginForm } from "@/src/features/auth/components/login-form"
import { PenLine, Search, BookOpen, GraduationCap } from "lucide-react"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { returnUrl?: string }
}) {
  const returnUrl = searchParams.returnUrl
  
  let journalTitle: string | undefined = undefined
  let journalLogoUrl: string | undefined = undefined
  let journalDescription: string | undefined = undefined

  // If we have a returnUrl pointing to an SSO redirect, we can extract the specific journal path
  // to customize the login screen.
  // Example returnUrl: /api/ojs/sso/redirect?journalPath=jme
  if (returnUrl && returnUrl.includes('journalPath=')) {
    try {
      // Decode and extract the journalPath query param from the return URL
      const decodedReturnUrl = decodeURIComponent(returnUrl)
      const urlObj = new URL(decodedReturnUrl, "http://localhost")
      const path = urlObj.searchParams.get("journalPath")

      if (path) {
        // Fetch specific journal branding
        const journal = await prisma.journal.findFirst({
          where: { ojs_path: path },
          select: { title: true, cover_image_url: true, description: true }
        })

        if (journal) {
          journalTitle = journal.title
          journalLogoUrl = journal.cover_image_url || undefined
          journalDescription = journal.description || undefined
        }
      }
    } catch (e) {
      console.warn("Failed to parse specific journal from returnUrl:", returnUrl)
    }
  }

  const defaultDescription = "A unified publishing platform for open access research. Join our community of authors, reviewers, and editors advancing scientific discovery."

  return (
    <div className="flex min-h-screen flex-col bg-background/50 relative overflow-hidden">
      <Navbar />

      <main className="flex-1 flex max-w-[1400px] mx-auto w-full p-4 md:p-8 lg:p-12 gap-8 items-center">
        
        {/* Left Side: Contextual Info Panel (Hidden on small screens) */}
        <div className="hidden lg:flex flex-col w-1/2 justify-center pr-12 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent rounded-3xl -z-10 blur-3xl" />
          
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            {journalLogoUrl ? (
              <div className="h-24 w-24 rounded-2xl bg-white shadow-xl flex items-center justify-center p-3 border border-primary/10">
                <img src={journalLogoUrl} alt="Journal Logo" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl flex items-center justify-center">
                <span className="text-3xl font-bold text-primary-foreground font-mono">dis</span>
              </div>
            )}

            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                {journalTitle ? (
                  <>Access <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">{journalTitle}</span></>
                ) : (
                  <>Welcome to <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">Digitopub</span></>
                )}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                {journalDescription || defaultDescription}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border/50">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <PenLine className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Authors</h3>
                  <p className="text-sm text-muted-foreground mt-1">Submit & track research</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Reviewers</h3>
                  <p className="text-sm text-muted-foreground mt-1">Evaluate manuscripts</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Editors</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage publications</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Readers</h3>
                  <p className="text-sm text-muted-foreground mt-1">Discover new science</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex items-center justify-center lg:justify-end w-full">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <Card className="border-border/50 shadow-2xl shadow-primary/5 bg-background/60 backdrop-blur-xl">
              <CardContent className="pt-8 pb-8 px-6 sm:px-10">
                <LoginForm 
                  journalTitle={journalTitle} 
                  journalLogoUrl={journalLogoUrl} 
                  returnUrl={returnUrl} 
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
