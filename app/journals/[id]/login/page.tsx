"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, User, UserCog, Shield } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

const journalNames: Record<string, string> = {
  "1": "Journal of Digitodontics",
  "2": "Open Journal of Biomedical Research",
}

export default function JournalLoginPage({ params }: { params: { id: string } }) {
  const [id, setId] = useState<string>("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    setId(params.id)
  }, [params])

  const journalName = journalNames[id] || "Journal"

  const handleLogin = (role: string) => {
    console.log(`Logging in as ${role} with email: ${email}`)
    // Login logic would go here
  }

  if (!id) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl">
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                    <BookOpen className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <h1 className="mb-2 text-3xl font-bold text-balance">{journalName}</h1>
                <p className="text-muted-foreground">Welcome to the Submit Manager Platform</p>
              </div>

              {/* Login Tabs */}
              <Card>
                <CardHeader>
                  <CardTitle>Login to Submit Manager</CardTitle>
                  <CardDescription>
                    Access the journal portal with your credentials. Select your role below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="author" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="author">
                        <User className="mr-2 h-4 w-4" />
                        Author
                      </TabsTrigger>
                      <TabsTrigger value="editor">
                        <UserCog className="mr-2 h-4 w-4" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger value="reviewer">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Reviewer
                      </TabsTrigger>
                      <TabsTrigger value="publisher">
                        <Shield className="mr-2 h-4 w-4" />
                        Publisher
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="author" className="mt-6">
                      <form
                        className="space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleLogin("Author")
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="author-email">Email or Username</Label>
                          <Input
                            id="author-email"
                            type="text"
                            placeholder="Enter your email or username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="author-password">Password</Label>
                          <Input
                            id="author-password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Login as Author
                        </Button>
                        <div className="flex justify-between text-sm">
                          <Link href="#" className="text-primary hover:underline">
                            Send Login Details
                          </Link>
                          <Link href="#" className="text-primary hover:underline">
                            Login Help
                          </Link>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="editor" className="mt-6">
                      <form
                        className="space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleLogin("Editor")
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="editor-email">Email or Username</Label>
                          <Input id="editor-email" type="text" placeholder="Enter your email or username" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editor-password">Password</Label>
                          <Input id="editor-password" type="password" placeholder="Enter your password" required />
                        </div>
                        <Button type="submit" className="w-full">
                          Login as Editor
                        </Button>
                        <div className="flex justify-between text-sm">
                          <Link href="#" className="text-primary hover:underline">
                            Send Login Details
                          </Link>
                          <Link href="#" className="text-primary hover:underline">
                            Login Help
                          </Link>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="reviewer" className="mt-6">
                      <form
                        className="space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleLogin("Reviewer")
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="reviewer-email">Email or Username</Label>
                          <Input id="reviewer-email" type="text" placeholder="Enter your email or username" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reviewer-password">Password</Label>
                          <Input id="reviewer-password" type="password" placeholder="Enter your password" required />
                        </div>
                        <Button type="submit" className="w-full">
                          Login as Reviewer
                        </Button>
                        <div className="flex justify-between text-sm">
                          <Link href="#" className="text-primary hover:underline">
                            Send Login Details
                          </Link>
                          <Link href="#" className="text-primary hover:underline">
                            Login Help
                          </Link>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="publisher" className="mt-6">
                      <form
                        className="space-y-4"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleLogin("Publisher")
                        }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="publisher-email">Email or Username</Label>
                          <Input id="publisher-email" type="text" placeholder="Enter your email or username" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="publisher-password">Password</Label>
                          <Input id="publisher-password" type="password" placeholder="Enter your password" required />
                        </div>
                        <Button type="submit" className="w-full">
                          Login as Publisher
                        </Button>
                        <div className="flex justify-between text-sm">
                          <Link href="#" className="text-primary hover:underline">
                            Send Login Details
                          </Link>
                          <Link href="#" className="text-primary hover:underline">
                            Login Help
                          </Link>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 border-t pt-6">
                    <div className="mb-4 text-center text-sm text-muted-foreground">
                      <p className="mb-2 font-medium">First-time users?</p>
                      <p className="leading-relaxed">
                        Click "Register" in the navigation bar and enter the requested information. Upon successful
                        registration, you will receive an email with instructions to verify your registration.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href="/register">Register Now</Link>
                    </Button>
                  </div>

                  <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                    <p className="mb-2 font-medium">Note:</p>
                    <p className="leading-relaxed">
                      If you received an email from us with an assigned user ID and password, DO NOT REGISTER AGAIN.
                      Simply use that information to login. Usernames and passwords may be changed after registration.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <h3 className="mb-2 font-semibold">Instructions for Authors</h3>
                    <Button variant="link" asChild>
                      <Link href={`/journals/${id}`}>View Guidelines</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <h3 className="mb-2 font-semibold">Instructions for Reviewers</h3>
                    <Button variant="link" asChild>
                      <Link href={`/journals/${id}`}>View Guidelines</Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <h3 className="mb-2 font-semibold">Contact Editorial Office</h3>
                    <Button variant="link" asChild>
                      <Link href="/contact">Get in Touch</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Footer Links */}
              <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>
                  <Link href="#" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                  {" | "}
                  <Link href="#" className="hover:text-primary">
                    Data Privacy Policy
                  </Link>
                </p>
                <p className="mt-2">Software Copyright © 2025 dis Scientific Journals Platform</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
