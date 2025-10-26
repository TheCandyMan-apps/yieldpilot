import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.posthog.com';

export function initAnalytics() {
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured - analytics disabled');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (posthog) => {
      if (import.meta.env.MODE === 'development') {
        posthog.debug();
      }
    },
    // Privacy settings
    mask_all_text: false,
    mask_all_element_attributes: false,
    // Performance
    autocapture: false, // Only track events we explicitly define
  });
}

// Track key events
export const analytics = {
  // Page views (handled automatically by PostHog)
  
  // Property paste/URL entry
  propertyUrlPasted: (url: string, source: 'zoopla' | 'rightmove' | 'unknown') => {
    posthog.capture('property_url_pasted', { source, url_length: url.length });
  },
  
  // Ingestion events
  ingestStart: (source: 'zoopla' | 'rightmove', maxResults: number) => {
    posthog.capture('ingest_start', { source, max_results: maxResults });
  },
  
  ingestSuccess: (source: 'zoopla' | 'rightmove', itemCount: number, durationMs: number) => {
    posthog.capture('ingest_success', { source, item_count: itemCount, duration_ms: durationMs });
  },
  
  ingestFail: (source: 'zoopla' | 'rightmove', error: string) => {
    posthog.capture('ingest_fail', { source, error_type: error });
  },
  
  // PDF export
  pdfExportStart: (dealId: string) => {
    posthog.capture('pdf_export_start', { deal_id: dealId });
  },
  
  pdfExportSuccess: (dealId: string, durationMs: number) => {
    posthog.capture('pdf_export_success', { deal_id: dealId, duration_ms: durationMs });
  },
  
  pdfExportFail: (dealId: string, error: string) => {
    posthog.capture('pdf_export_fail', { deal_id: dealId, error_type: error });
  },
  
  // Deal interactions
  dealViewed: (dealId: string, score?: number) => {
    posthog.capture('deal_viewed', { deal_id: dealId, score });
  },
  
  dealSaved: (dealId: string) => {
    posthog.capture('deal_saved', { deal_id: dealId });
  },
  
  // Summary generation
  summaryGenerated: (dealId: string, source: 'ai' | 'heuristic' | 'heuristic_fallback') => {
    posthog.capture('summary_generated', { deal_id: dealId, source });
  },
  
  // Identify user (for logged-in analytics)
  identify: (userId: string, properties?: Record<string, any>) => {
    posthog.identify(userId, properties);
  },
  
  // Reset on logout
  reset: () => {
    posthog.reset();
  },
};
