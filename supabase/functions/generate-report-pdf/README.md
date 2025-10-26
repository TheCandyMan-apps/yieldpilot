# Generate Report PDF - Server-Side PDF Generation

## Overview
Server-side edge function that generates investment report PDFs, stores them in Supabase Storage with content-based naming, and returns signed URLs with 24-hour expiry.

## Features

### 1. Server-Side Generation
- Generates PDF using jsPDF on the server
- Eliminates client-side memory issues
- Consistent rendering across devices
- Better error handling and logging

### 2. Storage with Content Hashing
- Saves PDFs to `investment-reports` bucket
- Filename format: `{user_id}/{assumptions_hash}-{version_hash}.pdf`
- Content hash from assumptions enables regeneration detection
- Version hash for uniqueness and traceability

### 3. Signed URLs (24h expiry)
- Secure access without making bucket public
- 24-hour expiration for security
- Direct download/view in browser
- No need for authentication to access URL

### 4. PDF Footer Metadata
- Line 1: Generated timestamp + Assumptions summary
- Line 2: Version hash + Page number
- Example:
  ```
  Generated: 2025-01-10T14:30:00Z | Assumptions: 25% deposit, 5.5% APR, IO
  Version: v1abc2def3 | Page 1 of 2
  ```

### 5. Error Handling
- Graceful failure with detailed error messages
- Logs for debugging
- Returns structured error responses

## API Usage

### Request
```typescript
const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
  body: {
    deal: {
      address: "123 Main St, Manchester",
      price: 200000,
      rent: 1000,
      grossYield: 6.0,
      netYield: 5.2,
      roi: 8.5,
      cashFlow: 150,
      city: "Manchester",
    },
    summary: {
      drivers: ["Strong 5.2% net yield", "Positive cashflow", "Good EPC"],
      risks: ["DSCR below threshold", "Rent estimate", "Medium crime"]
    },
    assumptions: {
      deposit_pct: 25,
      apr: 5.5,
      term_years: 25,
      interest_only: true,
      voids_pct: 5,
      maintenance_pct: 8,
      management_pct: 10,
      insurance_annual: 300
    }
  }
});
```

### Response (Success)
```typescript
{
  success: true,
  url: "https://...supabase.co/storage/v1/object/sign/investment-reports/...",
  fileName: "user-id/abc123-v1def456.pdf",
  assumptionsHash: "abc123",
  versionHash: "v1def456",
  expiresAt: "2025-01-11T14:30:00Z"
}
```

### Response (Error)
```typescript
{
  success: false,
  error: "Failed to upload PDF: Storage quota exceeded"
}
```

## Regeneration Detection

### How It Works
1. **Hash Generation**: `hashAssumptions(assumptions)` creates deterministic hash from assumptions
2. **Comparison**: Compare `savedAssumptionsHash` (from last PDF) with `currentAssumptionsHash`
3. **Detection**: If hashes differ, assumptions changed → show "Regenerate" button

### UI Flow
```
1. User generates PDF → Store hash
2. User changes assumptions → Detect difference
3. Show "Regenerate PDF (Assumptions Changed)" button
4. User clicks → Generate new PDF with updated assumptions
5. Update stored hash
```

## Storage Structure

### Bucket: `investment-reports`
```
investment-reports/
├── {user-id-1}/
│   ├── abc123-v1def456.pdf  (BTL assumptions)
│   ├── def456-v2ghi789.pdf  (HMO assumptions)
│   └── ghi789-v3jkl012.pdf  (Cash buyer assumptions)
└── {user-id-2}/
    └── ...
```

### File Naming Convention
- Format: `{user_id}/{assumptions_hash}-{version_hash}.pdf`
- `assumptions_hash`: Hash of assumptions object (for regeneration detection)
- `version_hash`: `v{timestamp_base36}` (ensures uniqueness even for same assumptions)

### Storage Policies (RLS)
```sql
-- Users can view their own reports
bucket_id = 'investment-reports' AND auth.uid()::text = (foldername(name))[1]

-- Users can upload their own reports  
bucket_id = 'investment-reports' AND auth.uid()::text = (foldername(name))[1]

-- Users can delete their own reports
bucket_id = 'investment-reports' AND auth.uid()::text = (foldername(name))[1]
```

## Error Handling

### Client-Side UI
```tsx
{pdfError && (
  <Alert variant="destructive">
    <AlertCircle />
    <AlertDescription>
      {pdfError}
      <Button onClick={downloadPDF}>Try Again</Button>
      <Button asChild>
        <a href="mailto:support@yieldpilot.app">Contact Support</a>
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### Common Errors
1. **Storage Quota Exceeded**: User has reached storage limit
2. **Upload Failed**: Network or permission issue
3. **PDF Generation Failed**: jsPDF error (rare)
4. **Unauthorized**: Missing or invalid auth token

## Frontend Integration

### DealSummaryGenerator Component
```tsx
const [pdfUrl, setPdfUrl] = useState("");
const [pdfError, setPdfError] = useState("");
const [pdfLoading, setPdfLoading] = useState(false);
const [savedAssumptionsHash, setSavedAssumptionsHash] = useState("");

// Generate PDF
const downloadPDF = async () => {
  setPdfLoading(true);
  setPdfError("");
  
  const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
    body: { deal, summary, assumptions }
  });
  
  if (data.success) {
    setPdfUrl(data.url);
    setSavedAssumptionsHash(data.assumptionsHash);
    window.open(data.url, "_blank");
  } else {
    setPdfError(data.error);
  }
  
  setPdfLoading(false);
};

// Detect regeneration need
const needsRegeneration = savedAssumptionsHash && 
  currentAssumptionsHash && 
  savedAssumptionsHash !== currentAssumptionsHash;
```

## Database Schema

### deal_summaries table
```sql
-- New columns for PDF tracking
assumptions_hash TEXT  -- Hash of assumptions used for this report
generated_at TIMESTAMPTZ DEFAULT now()  -- When PDF was generated
```

## Limitations
- PDF size limit: 10MB (bucket configuration)
- Signed URL expiry: 24 hours
- Storage quota: Per workspace limits apply
- jsPDF features: Limited compared to full PDF libraries

## Future Enhancements
- Custom branding/white-labeling
- Multiple PDF templates (investor, lender, etc.)
- Batch PDF generation for portfolios
- Email delivery of PDFs
- Watermarking for free tier
- Extended signed URL expiry for paid users
