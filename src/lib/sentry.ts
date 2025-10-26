import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // PII redaction
    beforeSend(event) {
      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      
      // Redact potential PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const redacted = { ...breadcrumb.data };
            ['email', 'phone', 'password', 'token', 'apikey', 'authorization'].forEach(key => {
              if (redacted[key]) redacted[key] = '[REDACTED]';
            });
            return { ...breadcrumb, data: redacted };
          }
          return breadcrumb;
        });
      }
      
      return event;
    },
    
    // Ignore known non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection',
    ],
  });
}

// Capture custom events
export function captureEvent(name: string, data?: Record<string, any>) {
  Sentry.captureMessage(name, {
    level: 'info',
    extra: data,
  });
}

// Capture errors with context
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}
