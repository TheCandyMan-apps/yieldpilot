# Assumptions & KPI Calculations

## Overview
This module provides underwriting assumptions management and KPI calculations for property deals.

## Features

### 1. Presets
Three built-in presets for common UK investment strategies:

- **BTL UK**: Standard Buy-to-Let
  - 25% deposit (75% LTV)
  - 5.5% APR
  - 25-year term
  - Interest-only
  - 5% voids, 8% maintenance, 10% management
  - £300/year insurance

- **HMO UK**: House in Multiple Occupation
  - 20% deposit (80% LTV)
  - 6.5% APR
  - 25-year term
  - Interest-only
  - 8% voids, 12% maintenance, 12% management
  - £600/year insurance

- **Cash Buyer**: 100% cash purchase
  - 100% deposit (no mortgage)
  - 0% APR
  - 4% voids, 6% maintenance, 0% management (self-managed)
  - £250/year insurance

### 2. Show Working
Collapsible section showing intermediate calculations:
- Purchase price
- Deposit amount and percentage
- Loan amount
- Monthly rent
- Monthly mortgage payment
- Monthly operating expenses

### 3. Persistence

#### Per-Deal Assumptions
When a `listingId` is provided, assumptions are saved to the `listing_metrics` table and loaded automatically when viewing that deal.

#### User Defaults
Users can save their preferred assumptions as defaults by checking "Save as my default for future deals". These are stored in the `profiles.default_assumptions` column.

#### Fallback Hierarchy
1. Deal-specific assumptions (if listingId provided)
2. User default assumptions (from profile)
3. UK market defaults (BTL UK preset)

## Usage

### Basic Usage
```tsx
import { AssumptionsDrawer } from "@/components/deals/AssumptionsDrawer";

<AssumptionsDrawer
  assumptions={currentAssumptions}
  onUpdate={(newAssumptions) => {
    // Update KPIs with new assumptions
    recalculateKPIs(newAssumptions);
  }}
/>
```

### With Persistence
```tsx
import { useAssumptions } from "@/hooks/useAssumptions";

const MyComponent = ({ listingId }) => {
  const { assumptions, saveAssumptions } = useAssumptions(listingId);
  
  return (
    <AssumptionsDrawer
      assumptions={assumptions}
      listingId={listingId}
      price={dealPrice}
      rent={monthlyRent}
      onUpdate={async (newAssumptions, saveAsDefault) => {
        const success = await saveAssumptions(newAssumptions, saveAsDefault);
        if (success) {
          // Recalculate KPIs
          await recalculateKPIs(listingId, newAssumptions);
        }
        return success;
      }}
    />
  );
};
```

## KPI Calculations

The `calculate-deal` edge function calculates:

### Financial Metrics
- **Gross Yield**: `(Annual Rent / Purchase Price) × 100`
- **Net Yield**: `((Annual Rent - OpEx - Mortgage) / Purchase Price) × 100`
- **Cashflow**: Monthly and annual net income after all costs
- **ROI**: `(Annual Cashflow / Deposit) × 100`
- **DSCR**: Debt Service Coverage Ratio = `NOI / Annual Debt Service`

### Cost Breakdown
- Mortgage payment (interest-only or principal & interest)
- Voids (percentage of rent)
- Maintenance (percentage of rent)
- Management (percentage of rent)
- Insurance (annual flat fee)

## Testing

Unit tests are provided in `supabase/functions/calculate-deal/index.test.ts`:

```bash
cd supabase/functions/calculate-deal
deno test
```

Tests cover three scenarios:
1. Standard BTL (25% deposit, 5.5% APR, IO)
2. HMO (20% deposit, 6.5% APR, IO, higher costs)
3. Cash buyer (100% deposit, no mortgage)

## Database Schema

### profiles.default_assumptions
```sql
default_assumptions JSONB DEFAULT jsonb_build_object(
  'deposit_pct', 25,
  'apr', 5.5,
  'term_years', 25,
  'interest_only', true,
  'voids_pct', 5,
  'maintenance_pct', 8,
  'management_pct', 10,
  'insurance_annual', 300
)
```

### listing_metrics.assumptions
Per-deal assumptions stored in the same format, automatically loaded when available.
