# Regulation-Adjusted ROI System

## Overview

YieldPilot's Yield Intelligence Platform provides **regulation-adjusted ROI** calculations that reflect real-world tax, compliance, and retrofit costs. This transforms optimistic gross yields into actionable, after-tax net returns.

## Key Features

### 1. Reality Mode
Toggle between standard and adjusted views to see:
- **Standard View**: Gross yield, basic deductions
- **Reality Mode**: After-tax yield including Section 24, EPC costs, licensing

### 2. Country-Specific Tax Modeling

#### UK (Section 24)
- **No mortgage interest deduction** from rental income
- **20% tax credit** on mortgage interest payments
- Progressive income tax bands (20%/40%/45%)
- Modeled per `regulation_country_params` table

#### Extensible to Other Countries
The system supports US, ES, FR, DE with configurable:
- Mortgage interest deductibility %
- Tax credit rates
- Operating expense defaults
- Licensing requirements

### 3. EPC Retrofit Advisor

Provides property-specific upgrade recommendations:
- Current EPC → Target EPC (default: C)
- Cost estimates by property type and year built
- Amortization over 7 years (configurable)
- Expected yield uplift
- Payback period calculation

**Usage:**
```typescript
import { getEPCAdvice } from '@/lib/sdk/adjusted';

const advice = await getEPCAdvice(listingId, 'C');
// Returns: measures, costs, payback years
```

### 4. Strategy Simulation

Compare investment strategies:
- **LTR** (Long-Term Rental): Standard buy-to-let
- **HMO** (House in Multiple Occupation): Higher yield, higher costs
- **BRRR** (Buy-Refurb-Rent-Refinance): Value-add with refi
- **STR** (Short-Term Rental): Airbnb/holiday lets

Each strategy applies different assumptions:
- LTV ratios
- Operating expense %
- Vacancy rates
- Rent uplift potential
- Licensing costs
- Exit/refinance timing

**Usage:**
```typescript
import { runStrategySimulation } from '@/lib/sdk/adjusted';

const sim = await runStrategySimulation(listingId, 'HMO', {
  ltv: 70,
  licensing_monthly: 150
});
// Returns: DSCR, IRR, 10-year projection
```

## Database Schema

### Core Tables

1. **regulation_country_params**
   - Country-specific tax rules by year
   - Mortgage deductibility, tax credits
   - Default operating assumptions

2. **tax_bands_income**
   - Progressive tax brackets
   - Supports unlimited bands per country/year

3. **epc_upgrade_costs**
   - Retrofit cost estimates
   - Indexed by property type, year built, current/target EPC

4. **strategy_presets**
   - BRRR, HMO, LTR, STR templates
   - JSON params for assumptions

5. **user_scenarios**
   - User-saved custom analyses
   - Links to listings and strategy keys

### Views

- **v_adjusted_metrics**: Real-time adjusted ROI calculations
  - Joins listings, metrics, regulation params
  - Computes tax, EPC costs, licensing
  - Outputs: `adjusted_net_yield_pct`, `score_adjusted`, `explain_json`

## Assumptions & Defaults

### UK 2025 Defaults
```sql
-- Seeded in migration
mortgage_interest_deductible_pct: 0     -- Section 24: no deduction
basic_rate_tax_credit_pct: 20           -- 20% credit on interest
default_operating_exp_pct: 25           -- 25% of gross rent
default_vacancy_pct: 6                  -- 6% vacancy allowance
epc_required_min: 'C'                   -- Policy target
hmo_additional_cost_month: 150          -- Licensing/compliance
```

### Override Hierarchy
1. **User-specific** (in Underwrite drawer)
2. **Listing-specific** (stored in `listing_metrics`)
3. **Strategy-specific** (from `strategy_presets`)
4. **Country defaults** (from `regulation_country_params`)

## Formulas

### Adjusted Net Yield

```
annual_rent = gross_rent_month × 12
operating_expenses = annual_rent × opex_pct
vacancy_cost = annual_rent × vacancy_pct
pre_interest_net = annual_rent - operating_expenses - vacancy_cost

mortgage_interest = price × ltv × interest_rate

# UK Section 24:
taxable_income = pre_interest_net (no deduction)
tax_due = apply_progressive_bands(taxable_income) - (mortgage_interest × 0.20)

# If deductible (US, etc):
taxable_income = pre_interest_net - mortgage_interest
tax_due = apply_progressive_bands(taxable_income)

epc_upgrade_amortized = (epc_cost_median / 7 years) / 12 months
licensing_monthly = hmo_additional_cost_month (if applicable)

after_tax_cashflow = pre_interest_net - mortgage_interest - tax_due - 
                     epc_upgrade_amortized - licensing_monthly

adjusted_net_yield_pct = (after_tax_cashflow / price) × 100
```

### Score Adjustment

```
score_adjusted = base_score - epc_penalty - licensing_penalty

epc_penalty = 15 points if current_epc > required_min
licensing_penalty = 10 points if STR in licensed zone
```

## API Endpoints

### Edge Functions

1. **adjusted-recompute** (POST)
   - Refreshes adjusted metrics
   - Body: `{ listing_id?, batch_size? }`

2. **epc-advisor** (POST)
   - Returns retrofit recommendations
   - Body: `{ listing_id, target? }`

3. **strategy-sim** (POST)
   - Simulates investment strategy
   - Body: `{ listing_id, strategy_key, overrides? }`

## Frontend Integration

### Reality Mode Toggle
```tsx
import { RealityModeToggle } from '@/components/deals/RealityModeToggle';

<RealityModeToggle
  enabled={realityMode}
  onChange={setRealityMode}
/>
```

### Adjusted Filters
```tsx
import { AdjustedFilters } from '@/components/deals/AdjustedFilters';

<AdjustedFilters
  minAdjustedYield={4.5}
  onMinAdjustedYieldChange={setMinYield}
  strategyFilter="HMO"
  onStrategyFilterChange={setStrategy}
/>
```

## Compliance & Disclaimers

**Important**: This system models regulations using publicly available rates and assumptions:

1. **Not Tax Advice**: Consult a qualified tax advisor
2. **Estimates Only**: EPC costs vary by property condition
3. **User Verification**: Always verify local licensing requirements
4. **Assumptions Visible**: All calculations show their inputs in `explain_json`

## Testing

Run end-to-end tests:
```bash
npm run test:e2e -- tests/e2e/adjusted.spec.ts
```

## Extending to New Countries

1. **Add regulation params**:
```sql
INSERT INTO regulation_country_params (country, tax_year, ...)
VALUES ('ES', 2025, ...);
```

2. **Add tax bands**:
```sql
INSERT INTO tax_bands_income (country, tax_year, band_lower, band_upper, rate_pct)
VALUES ('ES', 2025, 0, 12450, 19), ...;
```

3. **Add EPC costs** (if applicable)
4. **Update frontend** country selector

## Scheduled Jobs

Recommended cron schedule:
```sql
-- Refresh adjusted metrics every 15 minutes
SELECT cron.schedule('refresh-adjusted-metrics', '*/15 * * * *', $$
  SELECT net.http_post(
    url:='https://[project].supabase.co/functions/v1/adjusted-recompute',
    headers:='{"Authorization": "Bearer [key]"}'::jsonb,
    body:='{"batch_size": 1000}'::jsonb
  );
$$);
```

## Performance

- **View queries**: <100ms for single listing
- **Batch recompute**: ~1s per 5,000 listings
- **Indexes**: On `(country, tax_year)`, `(listing_id)`, `(is_active)`

## Support

For questions or issues:
- Check `explain_json` field in adjusted metrics
- Review `advice_audit` table for EPC/strategy logs
- Consult `regulation_country_params` for current rules
