# Generate Deal Summary - AI-Powered Drivers & Risks

## Overview
Edge function that generates crisp, actionable deal summaries using Lovable AI (Gemini 2.5 Flash) with heuristic fallback.

## Features

### 1. Structured AI Output
- **Exactly 3 Drivers**: Positive investment factors (1 line each, ~10-15 words)
- **Exactly 3 Risks**: Concerns or caveats (1 line each, ~10-15 words)
- Investor-friendly, direct tone
- No disclaimers ("not financial advice") - focus on facts

### 2. Guardrails for Missing Data
Handles missing inputs gracefully:
- **EPC unknown** → "EPC: unknown (treat as upgrade risk)"
- **Crime unknown** → Noted in prompt, AI may flag uncertainty
- **Flood unknown** → Noted in prompt, AI may flag uncertainty
- **Rent source** → If "estimated", flagged as "estimated (treat as indicative)"

### 3. Schema Validation
Validates AI output against:
```typescript
interface DealSummarySchema {
  drivers: string[];  // Max 3 items, each ≤100 chars
  risks: string[];    // Max 3 items, each ≤100 chars
}
```

If validation fails → Falls back to heuristic summary

### 4. Heuristic Fallback (Non-AI)
When AI fails or returns invalid schema, uses rule-based logic:

**Drivers:**
- Net yield ≥7% → "Strong X% net yield"
- Cashflow ≥£200/mo → "Positive £X/mo cashflow"
- DSCR ≥1.25 → "Healthy DSCR X"
- Default → "Stable rental income potential"

**Risks:**
- Net yield <5% → "Low yield (<5%)"
- Cashflow <0 → "Negative monthly cashflow"
- EPC unknown or E/F/G → "EPC: unknown/E/F/G - upgrade risk"
- Default → "Standard market risks apply"

## API Usage

### Request
```typescript
const { data } = await supabase.functions.invoke('generate-deal-summary', {
  body: {
    deal: {
      address: "123 Main St, Manchester",
      price: 200000,
      rent: 1000,
      grossYield: 6.0,
      netYield: 5.2,
      roi: 8.5,
      cashFlow: 150,
      dscr: 1.15,
      rentSource: "Zoopla", // or "estimated"
      epc: "C", // or "unknown"
      crime: "Medium", // or "unknown"
      flood: "Low", // or "unknown"
    }
  }
});
```

### Response
```typescript
{
  success: true,
  source: "ai" | "heuristic" | "heuristic_fallback",
  summary: {
    drivers: [
      "Strong 5.2% net yield above market average",
      "Positive £150/mo cashflow for stable returns",
      "Good EPC C rating, no immediate upgrade costs"
    ],
    risks: [
      "DSCR 1.15 slightly below typical lender threshold",
      "Rent source: estimated (treat as indicative)",
      "Medium crime area may affect tenant demand"
    ]
  }
}
```

## Fallback Hierarchy
1. **AI Generation** (primary): Lovable AI with structured prompt
2. **Heuristic on API Error**: If AI gateway returns error (429, 402, 500)
3. **Heuristic on Schema Fail**: If AI output doesn't match schema
4. **Heuristic on Parse Error**: If JSON extraction/parsing fails
5. **Final Error**: If all else fails, returns error response

## Integration Notes

### Required Environment Variables
- `LOVABLE_API_KEY`: Auto-provisioned by Lovable Cloud

### Calling from Frontend
```typescript
const { data, error } = await supabase.functions.invoke('generate-deal-summary', {
  body: { deal: dealObject },
  headers: {
    Authorization: `Bearer ${session.access_token}` // Required
  }
});

if (data?.success) {
  const { drivers, risks } = data.summary;
  const source = data.source; // "ai" or "heuristic"
}
```

### Edge Function Configuration
```toml
[functions.generate-deal-summary]
# Authentication required as of security update
# verify_jwt defaults to true
```

**IMPORTANT**: This function now requires authentication. All requests must include a valid user JWT token.

## Error Handling

### AI API Errors
- **429 Too Many Requests**: Rate limit → Heuristic fallback
- **402 Payment Required**: Credits exhausted → Heuristic fallback
- **500 Gateway Error**: AI service issue → Heuristic fallback

### Validation Errors
- Drivers/risks count >3 → Schema fail → Heuristic fallback
- String length >100 chars → Schema fail → Heuristic fallback
- Missing arrays → Schema fail → Heuristic fallback

## Logging
All stages are logged for debugging:
```
"Generating deal summary for: <address>"
"AI response: <raw content>"
"AI summary validated: <parsed JSON>"
"Falling back to heuristic summary"
"Schema validation failed: <details>"
```

## Score Badge Integration
This function **does not** affect the scoring logic in `score-deal/index.ts`. The score badge weights remain unchanged:
- Financial: 40%
- Value: 20%
- Demand: 15%
- Risk: 15%
- Upgrade: 10%

## Testing
```bash
# Test with curl
curl -X POST <SUPABASE_URL>/functions/v1/generate-deal-summary \
  -H "Content-Type: application/json" \
  -d '{
    "deal": {
      "address": "Test Property",
      "price": 150000,
      "rent": 800,
      "netYield": 6.4,
      "cashFlow": 120,
      "dscr": 1.35,
      "epc": "unknown"
    }
  }'
```

## Future Enhancements
- Tool calling for structured output (more reliable than JSON parsing)
- Fine-tuned prompts for specific property types (HMO, commercial, etc.)
- Support for custom driver/risk count (e.g., 5 drivers, 2 risks)
- Caching to reduce AI calls for similar deals
