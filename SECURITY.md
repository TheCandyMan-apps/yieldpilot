# Security Features

This document outlines the production-ready security features implemented in YieldPilot.

## Security Headers

### Development
Security headers are automatically applied in development mode via Vite middleware:
- `Strict-Transport-Security`: HSTS for HTTPS enforcement
- `X-Content-Type-Options`: Prevents MIME type sniffing
- `X-Frame-Options`: Clickjacking protection
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Feature policy restrictions

### Production
For production deployment, configure these headers in your hosting provider:

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()" }
      ]
    }
  ]
}
```

**Netlify** (`netlify.toml`):
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

## Content Security Policy (CSP)

A strict CSP is configured in `index.html` that allows:
- **Self**: Application's own origin
- **Supabase**: `*.supabase.co` for backend API and realtime
- **Apify**: `api.apify.com` for property data scraping
- **PostHog**: `*.posthog.com` for analytics
- **Sentry**: `*.sentry.io` for error tracking

### Customizing CSP
Edit the `<meta>` tag in `index.html` to add/remove allowed origins:

```html
<meta http-equiv="Content-Security-Policy" content="...">
```

## Row-Level Security (RLS)

### Deals Feed (`deals_feed`)
- **User ownership**: Users can only view deals they own (`user_id` match)
- **Public demo mode**: Unauthenticated users see limited preview (10 deals)
- **Demo account bypass**: Specific test account can view all deals
  - Update the demo user UUID in migration: `20251026_add_user_security.sql`

### Deal Summaries (`deal_summaries`)
- Users can only create/read/update/delete their own summaries
- Enforced via `user_id` column with RLS policies

### Listing Metrics (`listing_metrics`)
- Access controlled through parent `listings` table
- Users can only access metrics for listings they own

## Rate Limiting

### Ingestion Endpoint (`ingest-property-url`)
- **Limit**: 10 requests per minute per IP/user
- **Window**: 60 seconds sliding window
- **Response**: HTTP 429 with `Retry-After` header
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Time when limit resets

### Implementation
In-memory store for development. For production scale, consider:
- **Upstash Redis**: Serverless Redis for edge functions
- **Cloudflare Workers KV**: Distributed edge storage
- **Supabase Vault**: Encrypted KV store

## Error Tracking (Sentry)

### Configuration
1. Create a Sentry project at [sentry.io](https://sentry.io)
2. Add DSN to `.env`:
   ```
   VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

### Features
- **Automatic error capture**: Unhandled exceptions and promise rejections
- **Performance monitoring**: 10% sample rate in production
- **Session replay**: Records user sessions on errors
- **PII redaction**: Removes sensitive data:
  - Email addresses
  - Phone numbers
  - Passwords and tokens
  - API keys and authorization headers

### Manual Capture
```typescript
import { captureError, captureEvent } from '@/lib/sentry';

// Capture errors with context
try {
  // code
} catch (error) {
  captureError(error, { dealId: '123', userId: 'abc' });
}

// Capture custom events
captureEvent('pdf_generated', { dealId: '123', duration: 2500 });
```

## Analytics (PostHog)

### Configuration
1. Create a PostHog project at [posthog.com](https://posthog.com)
2. Add credentials to `.env`:
   ```
   VITE_POSTHOG_KEY=phc_xxx
   VITE_POSTHOG_HOST=https://eu.posthog.com
   ```

### Tracked Events
- **Page views**: Automatic
- **Property paste**: URL entry and source detection
- **Ingestion**: Start, success, failure with timing
- **PDF export**: Start, success, failure with duration
- **Deal interactions**: View, save, watchlist
- **Summary generation**: AI vs heuristic fallback

### Privacy
- **No autocapture**: Only explicit events tracked
- **Text masking**: Disabled (no PII in forms)
- **User identification**: Only for authenticated users

### Usage
```typescript
import { analytics } from '@/lib/analytics';

// Track events
analytics.ingestStart('zoopla', 50);
analytics.ingestSuccess('zoopla', 42, 12500);
analytics.pdfExportSuccess('deal-123', 3200);

// Identify user (on login)
analytics.identify(userId, { 
  subscription: 'pro',
  signupDate: '2025-01-01' 
});

// Reset (on logout)
analytics.reset();
```

## Demo Account Setup

To enable the demo account bypass for testing:

1. Create a demo user account
2. Get the user UUID from Supabase dashboard or API
3. Update the migration or run:
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

## Security Checklist

### Before Production
- [ ] Configure security headers in hosting provider
- [ ] Review and customize CSP origins
- [ ] Set up Sentry error tracking (optional)
- [ ] Set up PostHog analytics (optional)
- [ ] Update demo account UUID in RLS policy
- [ ] Test rate limiting under load
- [ ] Review RLS policies for data access
- [ ] Enable HTTPS (automatic on Vercel/Netlify)
- [ ] Set up monitoring and alerting

### Regular Security Tasks
- [ ] Review Sentry errors weekly
- [ ] Monitor rate limit violations
- [ ] Audit RLS policies quarterly
- [ ] Update dependencies monthly
- [ ] Review CSP violations (if reported)
- [ ] Rotate API keys annually

## Contact

For security vulnerabilities, please email security@yieldpilot.com (or your contact).

**Do not** disclose security issues publicly until they are resolved.
