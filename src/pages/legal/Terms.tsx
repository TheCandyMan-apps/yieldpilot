import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
            
            <section>
              <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
              <p>
                By accessing and using YieldPilot, you accept and agree to be bound by the terms and provisions of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Use of Service</h2>
              <p>YieldPilot provides property investment analysis tools. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the service only for lawful purposes</li>
                <li>Not misuse or attempt to gain unauthorized access</li>
                <li>Maintain the security of your account credentials</li>
                <li>Not share your account with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Subscription and Billing</h2>
              <p>
                Paid subscriptions are billed in advance on a recurring basis. You can cancel your subscription at any time through your account settings or by contacting support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
              <p>
                YieldPilot provides analysis tools for informational purposes only. We do not provide financial advice. All investment decisions are your responsibility, and you should consult with qualified professionals before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p>
                YieldPilot shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact</h2>
              <p>
                For questions about these terms, contact us at:{" "}
                <a href="mailto:legal@yieldpilot.app" className="text-primary hover:underline">
                  legal@yieldpilot.app
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

export default Terms;
