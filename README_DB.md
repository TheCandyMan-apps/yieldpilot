# YieldPilot Database Schema Documentation

## Overview

YieldPilot uses a canonical global property listings schema designed to support multi-country property investment analysis. The database is built on Supabase/PostgreSQL with Row Level Security (RLS) for secure multi-tenant access.

## Core Tables

### `public.listings`

Canonical property listings table normalized for global markets (UK, US, ES, FR, DE, etc.).

**Schema:**
```sql
id                  uuid PRIMARY KEY
source              text NOT NULL              -- rightmove, zoopla, zillow, redfin, idealista, etc.
source_listing_id   text                       -- Provider's listing ID
listing_url         text                       -- Original listing URL
images              text[]                     -- Array of image URLs
country             text NOT NULL              -- ISO 3166-1 alpha-2 (GB, US, ES, FR, DE)
region              text                       -- State/County/Autonomous community
city                text
postcode            text
address_line1       text                       -- Street address
latitude            double precision
longitude           double precision
property_type       text                       -- apartment, house, condo, multi-family, HMO
tenure              text                       -- freehold, leasehold (nullable, region-specific)
bedrooms            integer
bathrooms           numeric(4,1)
square_feet         integer
floor_area_m2       numeric(12,2)
lot_area_m2         numeric(12,2)
year_built          integer
price               numeric(14,2) NOT NULL
currency            char(3) NOT NULL           -- ISO 4217 (GBP, USD, EUR)
estimated_rent      numeric
is_active           boolean DEFAULT true
days_on_market      integer
user_id             uuid                       -- For user-submitted listings
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
data_provenance     jsonb                      -- Metadata about source/fetch/transform
source_refs         jsonb                      -- Provider-specific reference data
```

**Indexes:**
- `idx_listings_country_region` - btree(country, region)
- `idx_listings_created_desc` - btree(created_at DESC)
- `idx_listings_price` - btree(price)
- `idx_listings_property_type` - btree(property_type)
- `idx_listings_active` - btree(is_active) WHERE is_active
- `idx_listings_location` - btree(latitude, longitude) WHERE lat/lng NOT NULL
- `idx_listings_textsearch` - GIN(to_tsvector('simple', address||city||postcode))

**RLS Policies:**
- Anonymous/Free: SELECT last 7 days, max 100 rows
- Authenticated: SELECT all active listings
- Users: INSERT/UPDATE/DELETE own listings (user_id = auth.uid())
- Service role: Full access

### `public.listing_metrics`

Computed investment metrics for each listing.

**Schema:**
```sql
listing_id          uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE
gross_rent_month    numeric(12,2)
operating_exp_pct   numeric(5,2)              -- Operating expenses as % of gross rent
vacancy_pct         numeric(5,2)              -- Vacancy rate %
gross_yield_pct     numeric(6,2)              -- Annual gross yield %
net_yield_pct       numeric(6,2)              -- Annual net yield %
cashflow_monthly    numeric(12,2)             -- Monthly cashflow after all costs
score_numeric       integer                    -- 0-100 investment score
score_band          text                       -- A+, A, B, C, D, F
explain_json        jsonb                      -- {drivers: [], risks: [], opportunities: []}
assumptions         jsonb                      -- Financial assumptions used
dscr                numeric                    -- Debt Service Coverage Ratio
irr_10yr            numeric                    -- 10-year IRR projection
cash_on_cash_return numeric                    -- Cash-on-cash return %
cap_rate            numeric                    -- Capitalization rate
capex_total         numeric DEFAULT 0
capex_breakdown     jsonb DEFAULT '{}'
rank_score          numeric                    -- Relative ranking score
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

**Indexes:**
- `idx_listing_metrics_listing_id` - btree(listing_id)
- `idx_listing_metrics_yield` - btree(gross_yield_pct DESC NULLS LAST)
- `idx_listing_metrics_score` - btree(score_numeric DESC NULLS LAST)

**RLS Policies:**
- Anonymous/Free: SELECT for public active listings (last 7 days)
- Authenticated (Free/Starter): SELECT basic metrics
- Authenticated (Pro/Team/Agency): SELECT all advanced metrics (DSCR, IRR, etc.)
- Service role: Full access

### `public.fx_rates`

Foreign exchange rates for multi-currency conversion.

**Schema:**
```sql
base                char(3) NOT NULL           -- ISO 4217 base currency
target              char(3) NOT NULL           -- ISO 4217 target currency
rate                numeric(18,8) NOT NULL     -- Exchange rate
fetched_at          timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (base, target)
```

**Update Schedule:**
- Automated hourly updates via `update-fx-rates-cron` edge function
- Triggers yield recalculation for all active listings on update

**RLS:**
- SELECT: Public (anyone)
- INSERT/UPDATE/DELETE: Service role only

## Views

### `v_active_listings`

Active listings with real-time FX conversion to USD and EUR.

**Computed Columns:**
- `price_usd` - Property price converted to USD using latest FX rate
- `price_eur` - Property price converted to EUR using latest FX rate

**Usage:**
```sql
SELECT * FROM v_active_listings 
WHERE country = 'GB' 
  AND price_usd BETWEEN 300000 AND 500000
ORDER BY created_at DESC;
```

### `v_investor_deals`

Full investment view with denormalized metrics for investor dashboards.

**Includes:**
- All fields from `v_active_listings` (with FX conversions)
- All metrics from `listing_metrics`
- Subscription-tier gated access to advanced columns

**Usage:**
```sql
SELECT 
  id, address_line1, city, price_usd, 
  gross_yield_pct, net_yield_pct, score_band
FROM v_investor_deals
WHERE net_yield_pct >= 6.0
  AND score_band IN ('A', 'A+')
ORDER BY score_numeric DESC
LIMIT 50;
```

**RLS:**
- Free users: Basic columns only
- Pro/Team/Agency: All columns including advanced metrics

## Edge Functions

### `ingest-provider`

Multi-region ingestion orchestrator supporting 8+ property data sources.

**Supported Providers:**
- **UK**: Rightmove, Zoopla (via Apify scrapers)
- **US**: Zillow, Redfin, Realtor (via Apify scrapers)
- **ES**: Idealista (via Apify scraper)
- **FR**: SeLoger (via Apify scraper)
- **DE**: ImmobilienScout24 (via Apify scraper)

**Request:**
```json
{
  "provider": "rightmove-uk",
  "url": "https://www.rightmove.co.uk/property-for-sale/...",
  "maxItems": 100,
  "userId": "optional-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "rightmove-uk",
  "runId": "apify-run-id",
  "itemsFetched": 45,
  "itemsInserted": 45,
  "listingIds": ["uuid1", "uuid2", ...]
}
```

**Flow:**
1. Validates provider and starts Apify actor run
2. Polls for completion (max 5 min)
3. Normalizes raw data to canonical schema
4. Inserts into `listings` table
5. Triggers `calculate-deal` for each listing to compute metrics

### `update-fx-rates-cron`

Automated FX rate updates + yield recalculation.

**Scheduled:** Hourly via pg_cron

**Process:**
1. Fetches latest rates from ExchangeRate-API for GBP/USD/EUR
2. Upserts into `fx_rates` table
3. Triggers `calculate-deal` for all active listings to refresh yield calculations

### `calculate-deal`

Computes investment metrics for a listing.

**Request:**
```json
{
  "listingId": "uuid"
}
```

**Calculations:**
- Gross/Net Yield %
- Monthly Cashflow
- DSCR (Debt Service Coverage Ratio)
- 10-year IRR projection
- Investment score (0-100) and band (A+ to F)
- Risk/driver analysis

## Data Flow

```
┌─────────────────┐
│ Apify Scrapers  │ (Rightmove, Zoopla, Zillow, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ingest-provider │ (Normalize to canonical schema)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ public.listings │ (Canonical global schema)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ calculate-deal  │ (Compute metrics)
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│ listing_metrics    │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ v_investor_deals   │ (Investor dashboard)
└────────────────────┘
```

## Location Providers

Multi-region location normalization in `src/lib/location/providers/`.

**UK Provider** (`uk.ts`)
- Postcode patterns (SW1A 1AA)
- Region mapping (London, West Midlands, etc.)
- Haversine distance in km

**US Provider** (`us.ts`)
- ZIP code patterns (12345 or 12345-6789)
- State codes (CA, NY, TX, etc.)
- Haversine distance in miles

**ES Provider** (`es.ts`)
- Postal code patterns (28013)
- Autonomous communities
- Haversine distance in km

**Usage:**
```typescript
import { normalizeLocation, filterByRadius } from '@/lib/location';

const location = normalizeLocation('Manchester, UK');
// { country: 'GB', region: 'Greater Manchester', city: 'Manchester' }

const nearby = filterByRadius(listings, 53.4808, -2.2426, 10);
// Returns listings within 10km radius
```

## RLS Security Model

YieldPilot implements a tiered access model:

| Tier | listings Access | Metrics Access |
|------|----------------|----------------|
| **Anonymous** | Last 7 days, max 100 rows | Basic (yield, score) |
| **Free** | All active listings | Basic (yield, score) |
| **Starter** | All active listings | Basic + cashflow |
| **Pro** | All active listings | Full (DSCR, IRR, cap rate) |
| **Team/Agency** | All active listings | Full + bulk export |

**Implementation:**
```sql
-- Example: Pro tier check
CREATE POLICY "Pro users full metrics access"
  ON listing_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND subscription_tier IN ('pro', 'team', 'agency')
    )
  );
```

## Testing RLS

### Simulate Anonymous User:
```sql
SET ROLE anon;
SELECT COUNT(*) FROM v_active_listings; -- Should return ≤100
RESET ROLE;
```

### Simulate Free User:
```sql
BEGIN;
  SET LOCAL role = authenticated;
  SET LOCAL request.jwt.claims.sub = 'test-user-uuid';
  SELECT * FROM v_investor_deals LIMIT 10;
ROLLBACK;
```

### Simulate Pro User:
```sql
-- First set user to Pro tier
UPDATE profiles SET subscription_tier = 'pro' WHERE id = 'test-user-uuid';

-- Then query as that user
BEGIN;
  SET LOCAL role = authenticated;
  SET LOCAL request.jwt.claims.sub = 'test-user-uuid';
  SELECT dscr, irr_10yr FROM v_investor_deals; -- Should succeed
ROLLBACK;
```

## Migrations

All schema changes are versioned in `supabase/migrations/` with timestamps:

- `20251030_230215_*.sql` - Initial canonical schema
- `20251030_230742_*.sql` - Enhanced schema with seed data

**Run migrations:**
```bash
# Automatic via Lovable Cloud
# Migrations deploy on push

# Manual local testing:
supabase db reset
```

## Performance Considerations

- **Indexes**: All high-cardinality columns (country, region, price, created_at) are indexed
- **Views**: Use materialized views for heavy aggregations (not implemented yet)
- **Partitioning**: Consider partitioning `listings` by `country` if >1M rows
- **FX Caching**: FX rates cached in table, subqueries optimized by planner

## Backup & Recovery

- **Automated**: Supabase provides daily backups (7-day retention)
- **Point-in-Time**: Recovery available for Pro/Team tiers
- **Manual Export**: Use `v_investor_deals` for CSV/JSON exports

## Future Enhancements

- [ ] Materialized view for `v_investor_deals` (refresh every 1hr)
- [ ] Geospatial clustering for area-based searches
- [ ] Time-series tables for price history tracking
- [ ] ML model scores in `listing_metrics`
- [ ] Realtime subscriptions for new A+ grade deals
- [ ] API rate limiting per subscription tier
- [ ] Archived listings table for historical analysis
