import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";

const Compliance = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Compliance</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              YieldPilot is committed to maintaining the highest standards of compliance and regulatory adherence.
            </p>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">GDPR Compliance</h2>
              <p>
                We are fully compliant with the General Data Protection Regulation (GDPR) for users in the European Union:
              </p>
              <ul className="space-y-2">
                {[
                  "Right to access your data",
                  "Right to rectification",
                  "Right to erasure (right to be forgotten)",
                  "Right to data portability",
                  "Right to object to processing",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">UK Data Protection</h2>
              <p>
                We comply with the UK Data Protection Act 2018 and maintain appropriate data processing agreements with all third-party service providers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Financial Services</h2>
              <p>
                Important: YieldPilot is a software tool providing property analysis. We do not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide regulated financial advice</li>
                <li>Act as a financial intermediary</li>
                <li>Facilitate property transactions</li>
                <li>Hold client money</li>
              </ul>
              <p className="mt-4">
                Users should seek independent financial advice before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cookie Policy</h2>
              <p>
                We use essential cookies for platform functionality and analytics cookies (with consent) to improve our services. You can manage cookie preferences in your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, personal data is removed within 30 days, except where retention is required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <p>We work with compliant service providers:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Supabase (database and authentication) - ISO 27001 certified</li>
                <li>Stripe (payment processing) - PCI DSS Level 1 certified</li>
                <li>Cloudflare (CDN and security) - SOC 2 Type II certified</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Our DPO</h2>
              <p>
                For compliance-related inquiries, contact our Data Protection Officer:{" "}
                <a href="mailto:dpo@yieldpilot.app" className="text-primary hover:underline">
                  dpo@yieldpilot.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Compliance;
