# Production Setup Guide

Follow these steps to configure YieldPilot for production deployment.

## 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required (Auto-configured by Lovable Cloud)
- `VITE_SUPABASE_URL` - Automatically set
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Automatically set
- `VITE_SUPABASE_PROJECT_ID` - Automatically set

### Optional - Error Tracking (Sentry)
1. Create account at [sentry.io](https://sentry.io)
2. Create a new project
3. Copy the DSN and add to `.env`:
   ```
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

### Optional - Analytics (PostHog)
1. Create account at [posthog.com](https://posthog.com)
2. Create a new project
3. Copy the project key and add to `.env`:
   ```
   VITE_POSTHOG_KEY=phc_xxx
   VITE_POSTHOG_HOST=https://eu.posthog.com
   ```

## 2. Security Headers (Production)

### Vercel
Create `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()"
        }
      ]
    }
  ]
}
```

### Netlify
Create `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()"
```

## 3. Demo Account Setup

To enable the demo account that can view all deals:

1. Create a demo user via Supabase dashboard or signup
2. Get the user UUID
3. Run this SQL in Supabase:

```sql
DROP POLICY IF EXISTS "Demo account can view all deals" ON deals_feed;

CREATE POLICY "Demo account can view all deals"
ON deals_feed
FOR SELECT
USING (
  auth.uid() = 'your-demo-user-uuid-here'::uuid
  AND is_active = true
);
```

## 4. Content Security Policy (Optional)

The CSP in `index.html` is configured for common origins. To add more:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://your-new-origin.com;
  connect-src 'self' https://your-api.com;
  ...
">
```

## 5. Rate Limiting (Production Scale)

For production, consider upgrading from in-memory rate limiting:

### Option 1: Upstash Redis (Recommended)
```typescript
// In edge function
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL'),
  token: Deno.env.get('UPSTASH_REDIS_TOKEN'),
});

// Use Redis for distributed rate limiting
```

### Option 2: Cloudflare Workers KV
```typescript
// In edge function
const kv = await env.KV.get(`ratelimit:${key}`);
// Implement rate limit logic
```

## 6. Monitoring & Alerts

### Sentry Alerts
1. Go to Sentry dashboard
2. Navigate to Alerts
3. Create alert rules for:
   - High error rate (>10 errors/minute)
   - New error types
   - Performance degradation

### PostHog Dashboards
1. Go to PostHog dashboard
2. Create dashboards for:
   - Daily active users
   - Ingestion success rate
   - PDF export success rate
   - Average deal score

## 7. Pre-Launch Checklist

- [ ] Environment variables configured
- [ ] Security headers deployed
- [ ] CSP tested and working
- [ ] Rate limiting tested
- [ ] RLS policies verified
- [ ] Demo account created and tested
- [ ] Sentry error tracking enabled
- [ ] PostHog analytics tracking events
- [ ] SSL certificate active (automatic on Vercel/Netlify)
- [ ] Custom domain configured (if applicable)

## 8. Post-Launch Monitoring

### Daily
- [ ] Check Sentry for new errors
- [ ] Review rate limit violations in logs
- [ ] Monitor PostHog key metrics

### Weekly
- [ ] Review error trends in Sentry
- [ ] Analyze user behavior in PostHog
- [ ] Check database performance

### Monthly
- [ ] Update dependencies
- [ ] Review and update CSP if needed
- [ ] Audit RLS policies
- [ ] Performance optimization review

## Support

For issues or questions:
- Documentation: See `SECURITY.md` for security details
- Security issues: security@yieldpilot.com
- General support: support@yieldpilot.com
