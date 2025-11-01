# YieldPilot Investment Reports System

## Overview

The YieldPilot reports system provides professional, branded PDF reports for property investment analysis with built-in monetization and entitlements.

## Architecture

### Components

1. **Report Viewer** (`/reports/:id`)
   - Client-side React route
   - Loads report JSON from `investor_reports` table
   - Applies branding and entitlements
   - Supports print mode (`?print=1`)

2. **PDF Generation** (`generate-report-pdf` Edge Function)
   - Uses jsPDF for server-side PDF generation
   - Stores PDFs in Supabase Storage (`investment-reports` bucket)
   - Returns signed URLs with 1-hour expiry

3. **Purchase Flow** (`purchase-report-pdf` Edge Function)
   - Stripe Checkout integration
   - Webhook handling for payment confirmation
   - Updates `investor_reports_metadata` on purchase

## Entitlements & Features

### Free Plan
- Limited preview (2 risk items max)
- Blurred comparable addresses
- "DEMO" watermark overlay
- No PDF download

### Pro+ Plans
- Full risk analysis
- Complete comparable data
- No watermark
- Unlimited PDF downloads
- Custom branding

## Branding System

### Database Schema

```sql
org_branding:
  - logo_url: Custom logo for reports
  - primary_color: Main brand color (hex)
  - accent_color: Secondary brand color (hex)
  - footer_text: Custom footer text
  - watermark_text: Optional watermark
```

### Usage

```typescript
// Load branding
const { data: branding } = await supabase
  .from('org_branding')
  .select('*')
  .eq('user_id', userId)
  .single();

// Apply to report
<h2 style={{ color: branding.primary_color }}>
  {reportTitle}
</h2>
```

## Report Integrity

### Hash Generation

Reports include a SHA-256 hash of the content for verification:

```typescript
const hash = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(JSON.stringify(reportContent))
);
```

### Verification

Users can verify report authenticity at `/verify?hash={hash}`:
- Compares stored hash with provided hash
- Shows report metadata and generation date
- QR code links to verification page

## Monetization

### Report Purchase Flow

1. User clicks "Buy Full Report" (£29)
2. `purchase-report-pdf` creates Stripe Checkout session
3. On success, redirects to `/reports/:id?purchased=true`
4. Webhook updates `investor_reports_metadata.is_purchased`
5. User gains full access to report and PDF download

### Stripe Products

Create products using Stripe CLI or dashboard:

```bash
# Full Report
stripe products create \
  --name="Full Investment Report" \
  --description="Complete property analysis with forecasts"

stripe prices create \
  --product=prod_xxx \
  --unit-amount=2900 \
  --currency=gbp
```

### City Pack

Bundle multiple reports for a specific city:

```typescript
// Generate city pack
const cityReports = await supabase
  .from('investor_reports')
  .select('*')
  .eq('deal.city', 'Surrey')
  .limit(10);

// Create checkout with city pack price
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: 'price_city_pack', quantity: 1 }],
  metadata: { productType: 'city_pack', city: 'Surrey' }
});
```

## API Reference

### Generate PDF

```typescript
const { data, error } = await supabase.functions.invoke(
  'generate-report-pdf',
  {
    body: {
      reportId: 'uuid',
      deal: { /* deal data */ },
      summary: 'AI summary',
      assumptions: { /* assumptions */ },
      forecast: [ /* forecast data */ ]
    }
  }
);

// Returns: { url: 'signed-url', fileName: 'report.pdf' }
```

### Purchase Report

```typescript
const { data, error } = await supabase.functions.invoke(
  'purchase-report-pdf',
  {
    body: {
      reportId: 'uuid',
      priceId: 'price_xxx'
    }
  }
);

// Returns: { url: 'stripe-checkout-url' }
```

## Webhook Handling

Configure Stripe webhook endpoint: `https://your-project.supabase.co/functions/v1/billing-webhooks`

Events handled:
- `checkout.session.completed`: Mark report as purchased
- `payment_intent.succeeded`: Update payment status

```typescript
// In billing-webhooks edge function
if (event.type === 'checkout.session.completed') {
  const { reportId, userId } = session.metadata;
  
  await supabase
    .from('investor_reports_metadata')
    .update({ 
      is_purchased: true,
      purchased_at: new Date(),
      stripe_payment_intent_id: session.payment_intent
    })
    .eq('report_id', reportId)
    .eq('user_id', userId);
}
```

## Testing Locally

### Sample Report

Use the provided `public/sample-report.json`:

```bash
# View sample report
open http://localhost:5173/reports/sample-001

# Print mode
open http://localhost:5173/reports/sample-001?print=1
```

### Test PDF Generation

```typescript
// scripts/test-pdf.ts
import { supabase } from './client';

const { data } = await supabase.functions.invoke('generate-report-pdf', {
  body: JSON.parse(
    await Deno.readTextFile('./public/sample-report.json')
  )
});

console.log('PDF URL:', data.url);
```

## Print Styles

Reports include print-optimized CSS:

```css
@media print {
  /* Hide navigation */
  .no-print { display: none; }
  
  /* A4 dimensions */
  @page {
    size: A4;
    margin: 10mm;
  }
  
  /* Prevent page breaks in sections */
  section {
    page-break-inside: avoid;
  }
}
```

## Best Practices

1. **Branding**: Always load and apply branding for logged-in users
2. **Caching**: Store generated PDFs, regenerate only on content change
3. **Hashing**: Generate hash on report creation, store in metadata
4. **Watermarks**: Apply watermarks at render time, not in stored data
5. **Security**: Verify user ownership before allowing PDF download

## Troubleshooting

### PDF Not Generating
- Check Supabase Storage bucket permissions
- Verify `investment-reports` bucket exists
- Check edge function logs for errors

### Branding Not Applying
- Ensure `org_branding` record exists for user
- Check RLS policies on `org_branding` table
- Verify color format (must be hex)

### Purchase Not Working
- Confirm Stripe webhook is configured
- Check `billing-webhooks` function logs
- Verify `STRIPE_SECRET_KEY` environment variable

## Future Enhancements

- [ ] Bulk report generation for portfolios
- [ ] Custom report templates
- [ ] Multi-language support
- [ ] Comparative analysis reports
- [ ] Excel export option
- [ ] White-label domains
