"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { RegistrationWizard } from "@/src/features/auth/components/register/registration-wizard"
import { GSAPWrapper } from "@/components/gsap-wrapper"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-2xl">
            <GSAPWrapper animation="slideUp">
              <Card>
                <CardHeader className="text-center">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                      <span className="font-mono text-2xl font-bold text-primary-foreground">dis</span>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Register to access journals, submit manuscripts, and more
                    <span className="block mt-2 text-xs text-muted-foreground/80">powered by submit manager</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RegistrationWizard />

                  <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Link
                      href={process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://submitmanager.com"}
                      className="font-medium text-primary hover:underline"
                    >
                      Login on Submit Manager
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </GSAPWrapper>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
