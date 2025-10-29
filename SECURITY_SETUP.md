# Security Setup Guide

## Overview
YieldPilot implements defense-in-depth security with strict HTTP headers, CSP, rate limiting, CORS, and egress controls suitable for VPN/corporate environments.

---

## 1. Security Headers

### Development
Security headers are automatically applied via Vite middleware (`src/lib/security-headers.ts`).

### Production (Vercel)
Configured in `vercel.json`:
- **HSTS**: Forces HTTPS for 1 year
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **Referrer-Policy**: Limits referrer leakage
- **Permissions-Policy**: Disables unused browser features
- **CSP**: Restricts script/style/connect sources

### Testing Headers
```bash
curl -I https://yieldpilot.app | grep -E "(Strict-Transport|Content-Security|X-Frame)"
```

---

## 2. Content Security Policy (CSP)

Current CSP (`vercel.json`):
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://api.apify.com https://cdn.sentry.io;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
connect-src 'self' https://*.supabase.co https://api.apify.com https://*.ingest.sentry.io wss://*.supabase.co;
```

### Tightening CSP (Future)
1. Remove `'unsafe-inline'` from `script-src` by:
   - Extracting inline scripts to `.js` files
   - Using nonces/hashes for necessary inline scripts
2. Replace `'unsafe-eval'` with build-time code generation

---

## 3. Rate Limiting

### Edge Functions
Rate limiting implemented in `supabase/functions/_shared/rate-limiter.ts`:
- **Default**: 60 requests/minute per IP/user
- **Storage**: Upstash Redis (production) or in-memory (dev)

### Setup Upstash (Production)
1. Create account at [upstash.com](https://upstash.com)
2. Create Redis database (choose region close to your Supabase region)
3. Add secrets to Supabase:
```bash
# Via Lovable Cloud UI (Settings → Backend → Secrets)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Usage in Edge Functions
```typescript
import { checkRateLimit, getRateLimitKey, getClientIp } from '../_shared/rate-limiter.ts';

const ip = getClientIp(req);
const userId = 'user-id-from-auth'; // or null
const key = getRateLimitKey(userId, ip);

const limit = await checkRateLimit(key);
if (!limit.allowed) {
  return new Response(JSON.stringify({ error: 'rate_limited' }), {
    status: 429,
    headers: { 'X-RateLimit-Reset': String(limit.resetAt) }
  });
}
```

---

## 4. CORS Configuration

### Current Setup
`supabase/functions/_shared/cors.ts`:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Hardening (Production)
Replace `*` with specific origins:
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yieldpilot.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
};
```

Or implement origin validation:
```typescript
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = ['https://yieldpilot.app', 'https://www.yieldpilot.app'];
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}
```

---

## 5. Egress Control (VPN/Corporate Firewall)

### Required External Domains
YieldPilot needs outbound access to:

| Domain | Purpose | Required |
|--------|---------|----------|
| `*.supabase.co` | Database, Auth, Storage | Yes |
| `*.supabase.in` | Alternative Supabase endpoint | Yes |
| `api.apify.com` | Web scraping actors | Yes |
| `api.openai.com` | AI features (optional) | No |
| `*.sentry.io` | Error tracking | No |
| `*.vercel.com` | Deployment/analytics | No |

### Proton VPN Setup

#### Option A: Split Tunneling (Recommended)
1. Open Proton VPN → Settings → Advanced
2. Enable "Split Tunneling"
3. Add domains to exclusion list:
```
*.supabase.co
*.supabase.in
api.apify.com
```

#### Option B: IP Allow-listing
If your network requires IP allow-listing:

1. Resolve domains to IPs:
```bash
nslookup api.apify.com
nslookup YOUR_PROJECT.supabase.co
```

2. Add IPs to firewall/VPN allow-list

3. **Important**: IPs may change. Set up monitoring:
```bash
# Cron job to check DNS changes
0 */6 * * * /path/to/check-dns.sh
```

```bash
#!/bin/bash
# check-dns.sh
DOMAINS=("api.apify.com" "YOUR_PROJECT.supabase.co")
for domain in "${DOMAINS[@]}"; do
  dig +short $domain | tee -a /var/log/dns-monitor.log
done
```

#### Option C: Egress Proxy
For strict IP-only environments:
1. Set up a tiny VPS/proxy outside VPN
2. Allow-list only proxy IP in VPN
3. Route YieldPilot traffic through proxy

---

## 6. Input Validation

All user inputs validated with Zod schemas:
- **Client-side**: Immediate feedback, prevent bad requests
- **Edge functions**: Defense against malicious payloads

Example (`src/lib/sources/validation.ts`):
```typescript
import { z } from 'zod';

export const NormalizedListingSchema = z.object({
  address_line1: z.string().min(1).max(500),
  price: z.number().positive(),
  currency: z.enum(['GBP', 'USD', 'EUR']),
  // ...
});
```

---

## 7. Environment Variables

### Required Secrets (Supabase)
Configure via Lovable Cloud UI → Settings → Backend → Secrets:

```bash
# Apify (required for scraping)
APIFY_API_TOKEN=apify_api_your_token

# Upstash Redis (optional, for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Sentry (optional, for error tracking)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### Public Config (.env)
Auto-managed by Lovable Cloud:
```bash
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=PROJECT
```

---

## 8. Monitoring & Testing

### Security Header Check
```bash
npm run check-security
# or manually:
curl -I https://yieldpilot.app | grep -i security
```

### Rate Limit Test
```bash
# Send 70 requests quickly (should get 429 after 60)
for i in {1..70}; do
  curl -X POST https://PROJECT.supabase.co/functions/v1/queue-ingest \
    -H "Content-Type: application/json" \
    -d '{"url":"https://test.com"}' &
done
wait
```

### CSP Violation Reports
Check browser console for CSP violations:
```javascript
document.addEventListener('securitypolicyviolation', (e) => {
  console.error('CSP Violation:', e.violatedDirective, e.blockedURI);
});
```

---

## 9. Pre-Production Checklist

- [ ] Security headers return on all routes (`curl -I`)
- [ ] CSP allows necessary resources (check console for violations)
- [ ] Rate limiting returns 429 after threshold
- [ ] CORS blocks unauthorized origins
- [ ] Apify/Supabase calls work with VPN enabled
- [ ] Input validation rejects malformed data
- [ ] Secrets configured (APIFY_API_TOKEN, UPSTASH_*)
- [ ] Error tracking enabled (Sentry)
- [ ] Egress domains documented for network team

---

## 10. Incident Response

If security issue detected:

1. **Immediate**: Disable affected edge function:
```bash
# Comment out function in supabase/config.toml
# [functions.vulnerable-function]
# enabled = false
```

2. **Investigate**: Check logs:
```bash
# Via Lovable Cloud UI → Backend → Functions → Logs
```

3. **Patch**: Update code and redeploy
4. **Notify**: Contact security@yieldpilot.com

---

## Support
- Security concerns: security@yieldpilot.com
- General support: Lovable Cloud UI → Help
