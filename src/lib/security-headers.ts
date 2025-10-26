// Security headers middleware for development
export function securityHeadersMiddleware() {
  return {
    name: 'security-headers',
    configureServer(server: any) {
      server.middlewares.use((_req: any, res: any, next: any) => {
        // HSTS
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        
        // Prevent MIME sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Clickjacking protection
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Referrer policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions policy
        res.setHeader(
          'Permissions-Policy',
          'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()'
        );
        
        next();
      });
    }
  };
}

// Production headers configuration
// Add these to your hosting provider (Vercel, Netlify, etc.):
export const PRODUCTION_HEADERS = `
# Security Headers for Production

# HSTS
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Prevent MIME sniffing
X-Content-Type-Options: nosniff

# Clickjacking protection
X-Frame-Options: DENY

# Referrer policy
Referrer-Policy: strict-origin-when-cross-origin

# Permissions policy
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()

# Content Security Policy (tweak origins as needed)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://api.apify.com https://cdn.posthog.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.apify.com https://*.posthog.com https://*.ingest.sentry.io wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
`;
