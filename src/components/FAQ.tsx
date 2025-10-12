import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How accurate is the AI property analysis?",
    answer: "Our AI analysis uses advanced algorithms trained on thousands of property transactions and market data. While highly accurate, we recommend using it as part of your overall due diligence process alongside professional valuations."
  },
  {
    question: "What property types can I analyze?",
    answer: "YieldPilot supports residential properties, commercial real estate, and mixed-use developments. Our AI adapts to different property types and local market conditions."
  },
  {
    question: "How long does an analysis take?",
    answer: "Most property analyses are completed within 30-60 seconds. Complex properties with multiple units may take up to 2 minutes."
  },
  {
    question: "Can I export my analysis reports?",
    answer: "Yes! All analysis reports can be exported as PDF documents and shared with investors, partners, or advisors."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied with the service, contact us for a full refund."
  },
  {
    question: "How often is market data updated?",
    answer: "Our market data is updated daily from multiple sources including MLS listings, public records, and real-time market feeds to ensure accuracy."
  },
  {
    question: "Can I compare multiple properties?",
    answer: "Yes, our Pro and Enterprise plans include side-by-side property comparison tools to help you make informed investment decisions."
  },
  {
    question: "Is my data secure?",
    answer: "We use bank-level encryption and secure cloud infrastructure. Your property data and analysis history are private and never shared with third parties."
  }
];

const FAQ = () => {
  return (
    <section className="py-20 bg-background" id="faq">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about property analysis with YieldPilot
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
