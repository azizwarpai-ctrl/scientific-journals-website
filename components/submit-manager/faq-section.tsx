"use client"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Loader2 } from "lucide-react"
import { useGetHelpCategories } from "@/src/features/help/api/use-help-categories"
import Link from "next/link"
import { useMemo } from "react"

export function SubmitManagerFaq() {
    const { data: categories, isLoading } = useGetHelpCategories()
    
    // Flatten all active topics from all categories into a FAQ-style list
    const faqs = useMemo(() => {
        if (!Array.isArray(categories)) return []
        return categories.flatMap((cat: any) => 
            (cat.topics || [])
                .filter((t: any) => t.is_active)
                .map((t: any) => ({ id: t.id, question: t.title, answer: t.content }))
        ).slice(0, 10)
    }, [categories])

    return (
        <section className="bg-muted/30 py-20 lg:py-32" id="faq">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-16 text-center">
                    <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">Frequently Asked Questions</h2>
                    <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
                        Everything you need to know about integrating Submit Manager with your publishing workflow.
                    </p>
                </div>

                <div className="mx-auto max-w-3xl">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No FAQs available yet. Check back soon!</p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq: any, index: number) => (
                                <AccordionItem value={`item-${index}`} key={faq.id}>
                                    <AccordionTrigger className="text-left text-lg font-medium">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground leading-relaxed text-base whitespace-pre-wrap">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
                
                <div className="mt-16 text-center">
                    <p className="text-muted-foreground">
                        Still have questions?{" "}
                        <Link href="/contact" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
                            Contact our support team
                        </Link>.
                    </p>
                </div>
            </div>
        </section>
    )
}

