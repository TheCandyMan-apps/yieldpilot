# YieldPilot API v2 - Partner Integration Guide

## Overview

YieldPilot API v2 provides secure programmatic access to deal data for enterprise partners and integrations. Access is granted via API keys with specific scopes and rate limits.

## Base URL

```
https://rgckrmuuathxrpohacds.supabase.co/functions/v1
```

## Authentication

All API requests must include an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your_api_key_here" \
     https://rgckrmuuathxrpohacds.supabase.co/functions/v1/api-v2-deals
```

## Obtaining API Keys

1. Log in to your YieldPilot account
2. Navigate to Settings → API Keys
3. Create a new API key with required scopes
4. Store the key securely (it will only be shown once)

## Available Endpoints

### 1. GET /api-v2-deals

Retrieve filtered property deals based on criteria.

**Parameters:**
- `region` (string, optional): Filter by region (UK, US, DE, FR, ES)
- `minYield` (number, optional): Minimum net yield percentage
- `maxPrice` (number, optional): Maximum property price
- `propertyType` (string, optional): Filter by property type
- `limit` (number, optional): Max results to return (default: 50, max: 100)

**Example Request:**
```bash
curl -G \
  -H "x-api-key: your_api_key" \
  --data-urlencode "region=UK" \
  --data-urlencode "minYield=6.0" \
  --data-urlencode "maxPrice=500000" \
  --data-urlencode "limit=20" \
  https://rgckrmuuathxrpohacds.supabase.co/functions/v1/api-v2-deals
```

**Example Response:**
```json
{
  "success": true,
  "count": 15,
  "deals": [
    {
      "id": "uuid",
      "property_address": "123 Main Street",
      "price": 250000,
      "bedrooms": 3,
      "bathrooms": 2,
      "property_type": "residential",
      "region": "UK",
      "currency": "GBP",
      "city": "Manchester",
      "postcode": "M1 1AA",
      "listing_url": "https://...",
      "images": ["url1", "url2"],
      "listing_metrics": {
        "gross_yield_pct": 7.2,
        "net_yield_pct": 6.1,
        "score": 82,
        "rank_score": 0.89
      }
    }
  ]
}
```

### 2. GET /api-v2-metrics/{listing_id}

Get detailed metrics for a specific listing.

**Example Request:**
```bash
curl -H "x-api-key: your_api_key" \
  https://rgckrmuuathxrpohacds.supabase.co/functions/v1/api-v2-metrics/uuid-here
```

**Example Response:**
```json
{
  "success": true,
  "listing": {
    "id": "uuid",
    "property_address": "123 Main Street",
    "price": 250000,
    "listing_metrics": {
      "gross_yield_pct": 7.2,
      "net_yield_pct": 6.1,
      "score": 82,
      "kpis": {
        "cashflow": 450,
        "roi": 12.5
      },
      "assumptions": {
        "deposit_pct": 25,
        "apr": 5.5
      }
    }
  }
}
```

## Rate Limits

Default rate limits per API key:
- 1,000 requests per hour
- 10,000 requests per day

Contact enterprise@yieldpilot.com for higher limits.

## Error Responses

All errors return appropriate HTTP status codes with JSON body:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `401`: Missing API key
- `403`: Invalid or inactive API key, or insufficient permissions
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Scopes

API keys support the following scopes:
- `read:deals` - Read access to deal listings and metrics
- `write:deals` - Create/update deal data (enterprise only)

## Regional Data

All prices and metrics are returned in the source region's currency. To convert:

1. Query the `fx_rates` endpoint for current exchange rates
2. Use the `MultiCurrencyPrice` component for client-side display
3. Or perform server-side conversions using our normalization library

## Support

For API support, feature requests, or partnership inquiries:
- Email: api@yieldpilot.com
- Docs: https://docs.yieldpilot.com/api
- Status: https://status.yieldpilot.com

## Changelog

### v2.0.0 (2025-10-28)
- Initial release with global multi-region support
- Support for UK, US, DE, FR, ES markets
- Multi-currency pricing
- Deal filtering by region, yield, price
