import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { prisma } from "@/lib/db/config"
import { LoginForm } from "@/src/features/auth/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { returnUrl?: string }
}) {
  const returnUrl = searchParams.returnUrl
  
  let journalTitle: string | undefined = undefined
  let journalLogoUrl: string | undefined = undefined

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
          select: { title: true, cover_image_url: true }
        })

        if (journal) {
          journalTitle = journal.title
          journalLogoUrl = journal.cover_image_url || undefined
        }
      }
    } catch (e) {
      console.warn("Failed to parse specific journal from returnUrl:", returnUrl)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-md">
            <Card>
              <CardContent className="pt-6">
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
