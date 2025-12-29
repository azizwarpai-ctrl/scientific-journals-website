"use client"

import type React from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText } from "lucide-react"
import { useState } from "react"

export default function SubmissionServicePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    description: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Service request submitted:", formData)
    alert("Your request has been sent to our support team. We'll get back to you shortly!")
    setFormData({ name: "", email: "", subject: "", description: "" })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Submission Help Service</h1>
              <p className="text-lg text-muted-foreground">
                Need assistance with your manuscript submission? Our support team is here to help
              </p>
            </div>
          </div>
        </section>

        {/* Service Form */}
        <section className="py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Submit Your Service Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject/Title *</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Describe Your Issue *</Label>
                      <Textarea
                        id="description"
                        placeholder="Please provide detailed information about your submission issue or service request..."
                        className="min-h-[180px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg">
                      Send Request to Support Team
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <h3 className="mb-3 font-semibold">What We Can Help With:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Manuscript submission technical issues</li>
                    <li>• Journal selection guidance</li>
                    <li>• Formatting and file upload problems</li>
                    <li>• Submission status inquiries</li>
                    <li>• Account and login assistance</li>
                    <li>• General submission process questions</li>
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Our support team typically responds within 24-48 hours during business days.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
