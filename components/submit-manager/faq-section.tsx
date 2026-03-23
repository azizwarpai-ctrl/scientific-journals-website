import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export function SubmitManagerFaq() {
    const faqs = [
        {
            question: "How does the sync with Open Journal Systems (OJS) work?",
            answer: "We use a secure, bi-directional REST API integration. Submit Manager reads journal metadata, user roles, and submission statuses directly from your OJS instance, ensuring that both systems are always in sync. You never have to enter data twice.",
        },
        {
            question: "Do authors need to create new accounts?",
            answer: "No. Our seamless Single Sign-On (SSO) integration ensures that authors use their existing OJS credentials to log into Submit Manager. We provision new accounts back to OJS instantly as well.",
        },
        {
            question: "What formats do you support for automated metadata extraction?",
            answer: "Our system currently supports PDF, DOCX, and LaTeX files. It automatically extracts the title, abstract, authors, and keywords from the manuscript text to populate OJS metadata forms.",
        },
        {
            question: "Do you host OJS for us?",
            answer: "Submit Manager is a supplementary platform that connects to your existing OJS installation. However, our Enterprise tier includes fully managed OJS hosting if you do not already have an infrastructure provider.",
        },
        {
            question: "Is there a free trial?",
            answer: "Yes, all plans come with a 14-day free trial. You can test the platform with your OJS staging instance to ensure compatibility before committing.",
        },
    ]

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
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-left text-lg font-medium">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
                
                <div className="mt-16 text-center">
                    <p className="text-muted-foreground">
                        Still have questions? <a href="#contact" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">Contact our support team</a>.
                    </p>
                </div>
            </div>
        </section>
    )
}
