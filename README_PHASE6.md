# YieldPilot - Phase 6: Global Production Hardening

## Overview
Phase 6 expands YieldPilot to global markets (UK, US, Germany, Spain, France) with production-ready infrastructure including resilient ingestion, structured logging, security hardening, and multi-currency support.

## New Features

### 1. Global Market Support
- **UK**: Zoopla, Rightmove
- **US**: Zillow, Realtor.com, Redfin
- **Germany**: ImmobilienScout24
- **Spain**: Idealista
- **France**: SeLoger

### 2. Market Configuration
Each market has tailored financial assumptions:
- **UK**: EPC ratings, stamp duty
- **US**: Property tax, HOA fees
- **EU**: Notary fees, regional tax variations

See `src/lib/market.ts` for full configuration.

### 3. Currency & Localization
- Automatic FX rate fetching and caching (24h TTL)
- Multi-currency display with conversion
- Localized number/date formatting
- i18n support for 5 languages (EN-GB, EN-US, DE, ES, FR)

### 4. Resilient Infrastructure

#### Resilient Fetch
- Automatic retry with exponential backoff
- Timeout handling (30s default)
- Apify quota/memory error detection
- Structured error logging

#### Health Monitoring
Access `/api/health` to check:
- Database connectivity
- Environment variable status
- Recent ingestion errors by provider
- FX rate freshness

#### Structured Logging
All operations logged with:
- Log level (info/warn/error)
- Request ID for tracing
- Metadata (masked sensitive data)
- Persistence to Supabase

### 5. Security Enhancements
- **CSP**: Content Security Policy headers
- **HSTS**: HTTP Strict Transport Security
- **Rate Limiting**: Per-user and per-IP limits
- **Error Boundaries**: Graceful error handling
- **Secret Masking**: Automatic PII/token masking in logs

## Environment Variables

```bash
# Apify
APIFY_API_KEY=your_apify_token

# AI
OPENAI_API_KEY=your_openai_key

# Supabase (auto-configured)
VITE_SUPABASE_URL=auto
VITE_SUPABASE_PUBLISHABLE_KEY=auto
VITE_SUPABASE_PROJECT_ID=auto

# Optional
PUBLIC_DEFAULT_MARKET=GB
```

## API v2 Endpoints

### Partner Integration
- `GET /api/v2/deals?region=UK&minYield=0.06`
- `POST /api/v2/ingest` (partner-verified URLs)
- `GET /api/v2/metrics/:listing_id`

API keys managed at `/api-keys` page.

## Database Schema Updates

### New Tables
- `ingest_events` - Ingestion observability
- `app_logs` - Structured application logs
- `fx_rates` - Currency exchange rate cache

### Updated Tables
- `listings` - Added `country_code`, `city`, `region`
- `listing_metrics` - Added `fx_rate_used`

## Feature Flags

See `src/config/flags.ts`:
```typescript
export const FLAGS = {
  enableUS: true,
  enableEU: true,
  useFx: true,
  aiSummaries: true,
  showProvenance: true,
  enableApiKeys: true,
} as const;
```

## Architecture

### Provider System
```
src/lib/sources/
├── types.ts           # SourceAdapter interface
├── registry.ts        # Provider registration
└── adapters/
    ├── zoopla-uk.ts
    ├── rightmove-uk.ts
    ├── zillow-us.ts
    ├── realtor-us.ts
    ├── redfin-us.ts
    ├── immobilien-de.ts
    ├── idealista-es.ts
    └── seloger-fr.ts
```

### Edge Functions
```
supabase/functions/
├── global-ingest/      # Unified ingestion endpoint
├── health/             # System health checks
├── update-fx-rates/    # Daily FX refresh (cron)
├── update-mortgage-rates/ # Mortgage rate updates
├── api-v2-deals/       # Public API v2
└── api-v2-metrics/     # Metrics API
```

## Usage

### Import Property from Any Market
```typescript
import { getAdapterForUrl } from '@/lib/sources/registry';
import { detectMarketFromUrl } from '@/lib/market';

const adapter = getAdapterForUrl(url);
const market = detectMarketFromUrl(url);

if (adapter) {
  const result = await adapter.startRun({
    url,
    token: APIFY_TOKEN,
    maxItems: 100,
  });
}
```

### Convert Currency
```typescript
import { convertCurrency, formatCurrency } from '@/lib/fx';

const gbpAmount = await convertCurrency(250000, 'EUR', 'GBP');
const formatted = formatCurrency(gbpAmount, 'GBP', 'en-GB');
```

### Structured Logging
```typescript
import { logger, generateRequestId } from '@/lib/log';

const requestId = generateRequestId();
logger.info('Processing deal', { dealId, userId }, requestId);
logger.error('Failed to fetch', { error: err.message }, requestId);
```

## Testing

### Unit Tests
```bash
npm test
```

Tests cover:
- Provider URL detection
- FX conversion
- KPI calculations
- Market-specific logic
- Zod schema validation

### E2E Tests
```bash
npm run test:e2e
```

Minimal Playwright tests for each market.

## Deployment

### Vercel
Add headers in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

### Supabase Cron
Set up daily FX refresh:
```sql
select cron.schedule(
  'update-fx-rates',
  '0 2 * * *', -- 2 AM daily
  $$
  select net.http_post(
    url:='https://rgckrmuuathxrpohacds.supabase.co/functions/v1/update-fx-rates',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

## Monitoring

### Health Checks
```bash
curl https://your-app.com/api/health
```

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "environment": { "apifyToken": true, "openaiKey": true },
    "fx": { "lastRefresh": "2025-01-01T02:00:00Z", "stale": false },
    "ingestion": { "errorsByProvider": {}, "recentErrorCount": 0 }
  }
}
```

### Logs
Query structured logs:
```sql
select * from app_logs
where level = 'error'
and created_at > now() - interval '1 hour'
order by created_at desc;
```

### Ingestion Events
```sql
select provider, status, count(*)
from ingest_events
where created_at > now() - interval '24 hours'
group by provider, status;
```

## Troubleshooting

### Apify Quota Exceeded
If you hit Apify limits:
1. Check error in `ingest_events` table
2. Upgrade Apify plan or reduce `maxItems`
3. Use basic mode (no full details)

### Stale FX Rates
Manually trigger refresh:
```bash
curl -X POST https://your-app.com/functions/v1/update-fx-rates \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Rate Limit Errors
Adjust limits in edge functions:
```typescript
const rateLimit = checkRateLimit(key, {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 min
});
```

## Next Steps

- Add more markets (CA, AU, NZ)
- Enhanced AI summaries per market
- Real-time deal alerts
- Mobile app (React Native)
- Enterprise SSO

## Support

- Docs: https://docs.yieldpilot.com
- API: https://api.yieldpilot.com/docs
- Issues: GitHub Issues

---

**Phase 6 Complete** ✅
Global expansion with production-grade infrastructure, security, and observability.
