"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { BookOpen, FileText, Users, HelpCircle, ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { GSAPWrapper } from "@/components/gsap-wrapper"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"

import { useGetHelpCategories } from "@/src/features/help/api/use-help-categories"
import { useGetHelpContent } from "@/src/features/help/api/use-get-help-content"
import { defaultHelpContent } from "@/src/features/help/schemas/help-schema"

export default function HelpPage() {
  const { data: categories, isLoading: isCategoriesLoading } = useGetHelpCategories()
  const { data: helpResponse, isLoading: isHelpLoading } = useGetHelpContent()
  const [searchTerm, setSearchTerm] = useState("")

  const content = helpResponse || defaultHelpContent
  const activeCategories = useMemo(() => Array.isArray(categories) ? categories : [], [categories])

  // Filter topics across categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return activeCategories

    const query = searchTerm.toLowerCase()
    
    return activeCategories.map((cat: any) => {
      const filteredTopics = cat.topics?.filter((topic: any) => 
        topic.is_active && (
          topic.title.toLowerCase().includes(query) || 
          topic.content.toLowerCase().includes(query)
        )
      ) || []
      
      return { ...cat, topics: filteredTopics }
    }).filter((cat: any) => cat.topics?.length > 0)
  }, [activeCategories, searchTerm])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header Section */}
        <GSAPWrapper animation="fadeIn">
          <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-16 md:py-20 border-b border-border/40">
            <div className="container mx-auto px-4 md:px-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] z-0"></div>
              <div className="mx-auto max-w-3xl text-center relative z-10">
                {isHelpLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="mx-auto h-12 w-64 md:h-14" />
                    <Skeleton className="mx-auto h-6 w-full max-w-md" />
                  </div>
                ) : (
                  <>
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-6xl text-foreground drop-shadow-sm">{content.heroTitle}</h1>
                    <p className="text-xl text-muted-foreground">{content.heroSubtitle}</p>
                  </>
                )}
                
                {/* Search Bar - Center piece of the help page */}
                <div className="mt-8 max-w-xl mx-auto relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative flex items-center bg-background rounded-full border shadow-sm">
                    <Search className="ml-4 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search for articles, guides, topics..."
                      className="border-0 bg-transparent h-12 md:h-14 pl-3 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 text-base shadow-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-5xl">
              
              {/* Quick Links */}
              <GSAPWrapper animation="slideUp" delay={0.2}>
                <div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {content.quickLinks?.map((link) => {
                    const isRoute = link.href.startsWith("/")
                    const Wrapper = isRoute ? Link : "a"
                    const iconName = link.icon || "BookOpen"
                    const IconElement = iconName === "Users" ? Users : iconName === "HelpCircle" ? HelpCircle : iconName === "FileText" ? FileText : BookOpen
                    
                    return (
                      <Wrapper key={link.id || link.title} href={link.href as string}>
                        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-border/40 h-full bg-card hover:bg-card/80 overflow-hidden relative">
                          <div className={`absolute top-0 left-0 w-full h-1 ${link.color === "primary" ? "bg-primary" : "bg-secondary"}`}></div>
                          <CardContent className="pt-8 text-center relative z-10">
                            <div className="mb-4 flex justify-center">
                              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:rotate-6 ${
                                link.color === "primary" ? "bg-primary/10 text-primary shadow-primary/20" : "bg-secondary/10 text-secondary shadow-secondary/20"
                              } shadow-lg`}>
                                <IconElement className="h-8 w-8" />
                              </div>
                            </div>
                            <h3 className="font-bold text-lg">{link.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{link.description}</p>
                            <div className="mt-4 flex justify-center">
                               <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                            </div>
                          </CardContent>
                        </Card>
                      </Wrapper>
                    )
                  })}
                </div>
              </GSAPWrapper>

              {/* Dynamic Database Content - Categories & Topics */}
              <GSAPWrapper animation="fadeIn" delay={0.3}>
                <div className="space-y-12">
                  <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold tracking-tight">Browse Topics</h2>
                    <p className="text-muted-foreground mt-2">Find answers by categories below</p>
                  </div>

                  {isCategoriesLoading ? (
                    <div className="space-y-6">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="border-border/40 shadow-sm">
                          <CardHeader className="bg-muted/30">
                            <Skeleton className="h-7 w-48" />
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : activeCategories.length === 0 ? (
                    <div className="py-20 text-center border rounded-2xl border-dashed bg-muted/10">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-medium text-foreground">No help content available yet</h3>
                      <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                        Please check back later or contact support if you need immediate assistance.
                      </p>
                    </div>
                  ) : filteredCategories.length === 0 && searchTerm ? (
                    <div className="py-20 text-center border rounded-2xl border-dashed bg-muted/10">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Search className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-medium text-foreground">No results found for &ldquo;{searchTerm}&rdquo;</h3>
                      <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                        We could not find any articles matching your search query. Try using different keywords.
                      </p>
                      <Button variant="outline" className="mt-6" onClick={() => setSearchTerm("")}>
                        Clear Search
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-8">
                      {filteredCategories.map((category: any) => {
                        const activeTopics = category.topics?.filter((t: any) => t.is_active) || []
                        if (activeTopics.length === 0) return null;

                        return (
                          <Card key={category.id} id={category.slug} className="border-border/40 shadow-sm overflow-hidden scroll-mt-24 transition-shadow hover:shadow-md">
                            <CardHeader className="bg-muted/30 border-b pb-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-xl">{category.title}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-0">
                              <Accordion type="single" collapsible className="w-full">
                                {activeTopics.map((topic: any, idx: number) => (
                                  <AccordionItem 
                                    key={topic.id} 
                                    value={`topic-${topic.id}`}
                                    className={`px-6 py-2 border-b-border/40 ${idx === activeTopics.length - 1 ? 'border-b-0' : ''}`}
                                  >
                                    <AccordionTrigger className="text-left font-medium hover:text-primary transition-colors py-4">
                                      {topic.title}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-wrap pb-6 pt-2">
                                      {topic.content}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </GSAPWrapper>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
