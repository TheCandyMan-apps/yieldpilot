# Property URL Ingestion API

Rock-solid Zoopla/Rightmove ingestion with retries, diagnostics, and VPN-proof server calls.

## Overview

This edge function provides a unified API for ingesting property listings from Zoopla and Rightmove via Apify actors. All Apify API calls happen server-side to avoid VPN/proxy issues in browser environments.

## Features

- ✅ **URL Normalization & Validation**: Rejects non-http(s) URLs and malformed inputs
- ✅ **Site Auto-Detection**: Automatically detects Zoopla vs Rightmove from URL
- ✅ **Intelligent Retries**: Falls back to reduced settings on quota/memory errors (402/429)
- ✅ **Polling with Timeout**: Polls Apify runs up to 120 seconds
- ✅ **Structured Logging**: JSON logs for all events (start, retry, success, errors)
- ✅ **Consistent Response Format**: Typed success/error responses with detailed diagnostics
- ✅ **Background Import**: Triggers data import to Supabase asynchronously

## API Specification

### Endpoint

```
POST /functions/v1/ingest-property-url
```

### Request Body

```typescript
{
  url: string;        // Zoopla or Rightmove URL (required)
  maxResults?: number; // Max properties to fetch (default: 50)
}
```

### Success Response (200)

```typescript
{
  ok: true;
  site: 'zoopla' | 'rightmove';
  runId: string;      // Apify run ID
  datasetId: string;  // Apify dataset ID
  items: any[];       // Raw property items
  itemCount: number;  // Number of items fetched
}
```

### Error Responses

#### 400 - Missing/Invalid URL
```typescript
{
  ok: false;
  error: 'missing_url';
  details: {
    message: 'URL parameter is required' | 'Invalid URL format. Must be http or https.'
  }
}
```

#### 400 - Unsupported Site
```typescript
{
  ok: false;
  error: 'unsupported_site';
  details: {
    message: 'URL must be from zoopla.co.uk or rightmove.co.uk';
    url: string;
  }
}
```

#### 402/429 - Apify Quota/Rate Limit
```typescript
{
  ok: false;
  error: 'apify_start_failed';
  details: {
    status: 402 | 429;
    message: string;
    response: any;
  }
}
```

#### 404 - No Items Found
```typescript
{
  ok: false;
  error: 'no_items';
  details: {
    message: 'Dataset is empty or invalid format';
  }
}
```

#### 504 - Polling Timeout
```typescript
{
  ok: false;
  error: 'polling_timeout';
  details: {
    message: 'Polling timed out after 120s';
    pollCount: number;
  }
}
```

#### 500 - Server Error
```typescript
{
  ok: false;
  error: 'server_error';
  details: {
    message: string;
  }
}
```

## Retry Logic

When Apify returns quota/memory/rate limit errors (402/429), the function automatically:

1. **First Attempt**: Uses `fullPropertyDetails: true`, memory: 2048MB, timeout: 300s
2. **Second Attempt** (on failure): Uses `fullPropertyDetails: false`, memory: 512MB, timeout: 120s

This ensures maximum success rate while respecting resource constraints.

## Actor Configuration

### Rightmove
- **Actor ID**: `yyyyuaYekB0HQkfoy`
- **Input Format**: `startUrls` array
- **Proxy**: RESIDENTIAL via GB

### Zoopla
- **Actor ID**: `dhrumil/zoopla-scraper`
- **Input Format**: `listUrls` array with objects
- **Proxy**: RESIDENTIAL via GB

Both actors receive:
```typescript
{
  maxItems: number;
  fullPropertyDetails: boolean;
  monitoringMode: false;
  proxy: {
    useApifyProxy: true;
    apifyProxyGroups: ['RESIDENTIAL'];
    apifyProxyCountry: 'GB';
  }
}
```

## Structured Logging

All events are logged as JSON for easy parsing:

```typescript
// Start attempt
{ event: 'apify_start_attempt', attempt: 1, site: 'zoopla', fullDetails: true, ... }

// Quota error with retry
{ event: 'apify_quota_error_retry', status: 402, nextAttempt: 'reduced_settings' }

// Success
{ event: 'apify_start_success', runId: '...', datasetId: '...', attempt: 1 }

// Polling status
{ event: 'poll_status', pollCount: 5, status: 'RUNNING', elapsedSeconds: 25 }

// Dataset fetched
{ event: 'dataset_fetched', itemCount: 42 }

// Completion
{ event: 'ingest_complete', site: 'rightmove', runId: '...', itemCount: 42 }
```

## Example Usage

### Client-side (TypeScript/React)

```typescript
import { supabase } from '@/integrations/supabase/client';

const result = await supabase.functions.invoke('ingest-property-url', {
  body: {
    url: 'https://www.zoopla.co.uk/for-sale/property/london/',
    maxResults: 50
  }
});

if (result.data?.ok) {
  console.log(`Fetched ${result.data.itemCount} properties from ${result.data.site}`);
  console.log('Run ID:', result.data.runId);
} else {
  console.error(`Error: ${result.data?.error}`, result.data?.details);
}
```

## Testing

Unit tests are provided in `test.ts`:

```bash
cd supabase/functions/ingest-property-url
deno test test.ts
```

Tests cover:
- URL normalization (valid/invalid protocols, whitespace, malformed URLs)
- Site detection (Zoopla, Rightmove, unsupported sites)
- Case insensitivity

## Environment Variables

Required environment variables (managed by Supabase):
- `APIFY_API_KEY`: Your Apify API token
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database writes

## Background Import

After successful ingestion, the function triggers `apify-import` in the background to:
1. Filter items by location
2. Map data to `deals_feed` schema
3. Insert into Supabase database

This happens asynchronously and doesn't block the response.

## Migration from Old Functions

This function replaces:
- `sync-apify-rightmove`
- `sync-apify-zoopla`

Client code should construct full URLs and call this unified function instead.

### Before
```typescript
await supabase.functions.invoke('sync-apify-rightmove', {
  body: { location: 'London', maxResults: 50 }
});
```

### After
```typescript
const url = 'https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=London';
await supabase.functions.invoke('ingest-property-url', {
  body: { url, maxResults: 50 }
});
```
