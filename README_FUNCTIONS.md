# YieldPilot Edge Functions

This document describes the Edge Functions powering YieldPilot's backend operations.

## Functions Overview

### 1. `ingest` - Property Listing Ingestion

**Purpose**: Fetch and normalize property listings from multiple providers (UK, US, ES).

**Endpoint**: `POST /functions/v1/ingest`

**Request Body**:
```json
{
  "provider": "uk.rightmove" | "us.realtor" | "es.idealista",
  "since": "2025-01-01T00:00:00Z" // optional
}
```

**Response**:
```json
{
  "success": true,
  "provider": "uk.rightmove",
  "count": 15,
  "errors": 0,
  "duration_ms": 2340
}
```

**Providers**:
- `uk.rightmove` - UK property listings via Rightmove
- `us.realtor` - US property listings via Realtor.com
- `es.idealista` - Spanish property listings via Idealista

**Database Impact**:
- Upserts records into `public.listings`
- Logs execution to `public.ingest_audit`

**Cron Schedule**: Run every 6 hours
```sql
SELECT cron.schedule(
  'ingest-rightmove',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://rgckrmuuathxrpohacds.supabase.co/functions/v1/ingest',
    headers:='{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"provider": "uk.rightmove"}'::jsonb
  );
  $$
);
```

---

### 2. `fx-refresh` - Foreign Exchange Rate Updates

**Purpose**: Fetch and update hourly FX rates for USD, EUR, GBP.

**Endpoint**: `POST /functions/v1/fx-refresh`

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "count": 9
}
```

**Environment Variables**:
- `FX_API_KEY` (optional) - API key for external FX provider

**Database Impact**:
- Inserts new rates into `public.fx_rates`
- Prunes records older than 30 days

**Cron Schedule**: Run every hour
```sql
SELECT cron.schedule(
  'fx-refresh-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://rgckrmuuathxrpohacds.supabase.co/functions/v1/fx-refresh',
    headers:='{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

### 3. `score` - Listing Metrics & Scoring

**Purpose**: Calculate gross yield, net yield, cashflow, and investment scores for listings.

**Endpoint**: `POST /functions/v1/score`

**Request Body**:
```json
{
  "listing_id": "uuid" // optional - if omitted, scores all active listings
}
```

**Response**:
```json
{
  "success": true,
  "processed": 234
}
```

**Scoring Algorithm**:
- **Gross Yield** (35 points): ≥8% excellent, 6-8% good, 4-6% fair, <4% poor
- **Net Yield** (30 points): ≥6% excellent, 4-6% good, 2-4% fair, <2% poor
- **Price Efficiency** (20 points): <£3k/m² excellent, £3k-5k/m² good, >£5k/m² fair
- **Days on Market** (15 points): ≤7 days hot, 8-30 days normal, >30 days stale

**Score Bands**:
- `A`: 80-100 points
- `B`: 65-79 points
- `C`: 50-64 points
- `D`: 35-49 points
- `E`: 0-34 points

**Database Impact**:
- Upserts metrics into `public.listing_metrics`

**Cron Schedule**: Run after each ingestion (via trigger or scheduled job)

---

### 4. `alerts` - Saved Search Alerts & Push Notifications

**Purpose**: Match new listings against user saved searches and send Web Push/FCM notifications.

**Endpoint**: `POST /functions/v1/alerts`

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "matches": 12,
  "notifications": 8
}
```

**Environment Variables**:
- `VAPID_PUBLIC_KEY` - Web Push VAPID public key
- `VAPID_PRIVATE_KEY` - Web Push VAPID private key
- `FCM_SERVER_KEY` - Firebase Cloud Messaging server key

**Database Impact**:
- Inserts matches into `public.alert_matches`
- Updates `last_run_at` on `public.saved_searches`

**Cron Schedule**: Run every hour
```sql
SELECT cron.schedule(
  'alerts-check',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://rgckrmuuathxrpohacds.supabase.co/functions/v1/alerts',
    headers:='{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## Rate Limiting

All functions use the shared rate limiter (`_shared/rate-limiter.ts`):
- **Limit**: 60 requests per minute per key/IP
- **Storage**: Upstash Redis (if configured) or in-memory fallback

**Environment Variables**:
- `UPSTASH_REDIS_REST_URL` (optional)
- `UPSTASH_REDIS_REST_TOKEN` (optional)

**Usage**:
```typescript
import { checkRateLimit, getRateLimitKey, getClientIp } from '../_shared/rate-limiter.ts';

const ip = getClientIp(req);
const userId = req.headers.get('x-user-id');
const key = getRateLimitKey(userId, ip);

const { allowed, remaining, resetAt } = await checkRateLimit(key);

if (!allowed) {
  return new Response('Rate limit exceeded', { 
    status: 429,
    headers: { 'X-RateLimit-Reset': resetAt.toString() }
  });
}
```

---

## Database Audit

All function invocations are logged to `public.api_audit_logs`:
- `route`: Function name
- `params_hash`: SHA256 hash of request params
- `duration_ms`: Execution time
- `status`: HTTP status code
- `user_id`: Authenticated user (if applicable)

---

## Testing

Run a simple test:
```bash
# Test ingestion
curl -X POST https://rgckrmuuathxrpohacds.supabase.co/functions/v1/ingest \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"provider": "uk.rightmove"}'

# Test scoring
curl -X POST https://rgckrmuuathxrpohacds.supabase.co/functions/v1/score \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{}'

# Test FX refresh
curl -X POST https://rgckrmuuathxrpohacds.supabase.co/functions/v1/fx-refresh \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test alerts
curl -X POST https://rgckrmuuathxrpohacds.supabase.co/functions/v1/alerts \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## Deployment

All functions are automatically deployed via Lovable Cloud. No manual deployment needed.

---

## Next Steps

1. Replace mock providers with real Apify actors or direct API integrations
2. Configure VAPID keys for Web Push
3. Set up FCM for mobile notifications
4. Enable Upstash Redis for production rate limiting
5. Add Playwright tests for alert flow
