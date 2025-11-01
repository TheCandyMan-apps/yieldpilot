import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Common validation schemas for API endpoints

export const ApiQueryParamsSchema = z.object({
  region: z.string().max(10).regex(/^[A-Z]{2,3}$/).optional(),
  minYield: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).refine(n => n >= 0 && n <= 100).optional(),
  maxPrice: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).refine(n => n > 0 && n <= 100000000).optional(),
  propertyType: z.string().max(50).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n > 0 && n <= 1000).optional(),
  beds: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0 && n <= 20).optional(),
});

export const ForecastParamsSchema = z.object({
  listingId: z.string().uuid(),
  horizon: z.string().regex(/^\d+m$/).refine(h => {
    const months = parseInt(h);
    return months >= 6 && months <= 60;
  }).optional(),
});

export type ApiQueryParams = z.infer<typeof ApiQueryParamsSchema>;
export type ForecastParams = z.infer<typeof ForecastParamsSchema>;

// Error handling utilities

const ERROR_CODES = {
  AUTH_FAILED: 'Authentication required',
  INVALID_INPUT: 'Invalid request parameters',
  NOT_FOUND: 'Resource not found',
  RATE_LIMITED: 'Too many requests',
  INTERNAL_ERROR: 'Internal server error',
  PERMISSION_DENIED: 'Permission denied',
  INVALID_API_KEY: 'Invalid or inactive API key',
} as const;

export function sanitizeError(error: unknown, isDev = false): { error: string; code: string } {
  if (isDev && error instanceof Error) {
    return {
      error: error.message,
      code: 'ERR_DETAILED',
    };
  }

  // Map known errors to safe messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('jwt') || message.includes('token') || message.includes('auth')) {
      return { error: ERROR_CODES.AUTH_FAILED, code: 'ERR_AUTH' };
    }
    
    if (message.includes('not found') || message.includes('does not exist')) {
      return { error: ERROR_CODES.NOT_FOUND, code: 'ERR_NOT_FOUND' };
    }
    
    if (message.includes('permission') || message.includes('access denied')) {
      return { error: ERROR_CODES.PERMISSION_DENIED, code: 'ERR_PERMISSION' };
    }
  }

  return {
    error: ERROR_CODES.INTERNAL_ERROR,
    code: 'ERR_INTERNAL',
  };
}

export function createErrorResponse(
  error: unknown,
  status = 500,
  corsHeaders: Record<string, string>
): Response {
  const isDev = Deno.env.get('ENVIRONMENT') === 'development';
  const { error: message, code } = sanitizeError(error, isDev);
  
  // Log full error server-side
  console.error('[API Error]', error instanceof Error ? error.message : String(error));
  
  return new Response(
    JSON.stringify({ error: message, code }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
