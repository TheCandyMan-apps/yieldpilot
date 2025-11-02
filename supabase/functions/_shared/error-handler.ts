import { corsHeaders } from './cors.ts';

/**
 * Standardized error handling to prevent information leakage
 * Only expose detailed errors in development mode
 */

const isDevelopment = Deno.env.get('DENO_ENV') === 'development';

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Create a safe error response that doesn't leak internal details
 */
export function createErrorResponse(
  error: unknown,
  statusCode = 500,
  errorCode?: string
): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Log full error server-side for debugging
  console.error('[Error]', {
    message: errorMessage,
    code: errorCode,
    stack: error instanceof Error ? error.stack : undefined
  });
  
  // Create safe client response
  const response: ErrorResponse = {
    error: isDevelopment ? errorMessage : 'An error occurred processing your request',
    code: errorCode,
  };
  
  // Only include details in development
  if (isDevelopment) {
    response.details = error instanceof Error ? error.stack : undefined;
  }
  
  return new Response(
    JSON.stringify(response),
    {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create a validation error response
 */
export function createValidationError(message: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      message
    }),
    {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create an authentication error response
 */
export function createAuthError(message = 'Authentication required'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
