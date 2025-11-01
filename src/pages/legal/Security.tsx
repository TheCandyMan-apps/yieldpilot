import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Lock, Key, Server } from "lucide-react";

const Security = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Security</h1>
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Your security is our top priority. Learn about our security measures and best practices.
            </p>
            
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold mb-0">Data Encryption</h2>
              </div>
              <p>
                All data transmitted between your browser and our servers is encrypted using industry-standard TLS/SSL protocols. Your data at rest is encrypted using AES-256 encryption.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold mb-0">Authentication</h2>
              </div>
              <p>
                We use secure authentication powered by Supabase Auth, supporting multiple authentication methods with built-in security features like rate limiting and brute force protection.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold mb-0">Access Control</h2>
              </div>
              <p>
                Row-Level Security (RLS) policies ensure users can only access their own data. All database operations are validated at the database level, not just the application layer.
              </p>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <Server className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold mb-4">Infrastructure</h2>
              </div>
              <p>Our infrastructure is built on:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Supabase for secure database and authentication</li>
                <li>Cloudflare for DDoS protection and CDN</li>
                <li>Regular security audits and penetration testing</li>
                <li>Automated vulnerability scanning</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Payment Security</h2>
              <p>
                All payment processing is handled by Stripe, a PCI DSS Level 1 certified payment processor. We never store your credit card information on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Report a Vulnerability</h2>
              <p>
                If you discover a security vulnerability, please report it to:{" "}
                <a href="mailto:security@yieldpilot.app" className="text-primary hover:underline">
                  security@yieldpilot.app
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                We appreciate responsible disclosure and will respond to security reports within 48 hours.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Security;
