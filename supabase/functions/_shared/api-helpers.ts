// Hardened API helpers for edge functions
import { corsHeaders } from './cors.ts';

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

/**
 * Create JSON response with proper headers
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders,
    },
  });
}

/**
 * Create error response
 */
export function errorResponse(
  error: string,
  status = 400,
  details?: unknown
): Response {
  const body: ApiError = { error };
  if (details) body.details = details;
  
  console.error(`[API Error ${status}]`, error, details);
  
  return jsonResponse(body, status);
}

/**
 * Safely parse JSON from request body
 */
export async function parseJsonBody<T = unknown>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return null;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('[parseJsonBody] Invalid JSON:', error);
    return null;
  }
}

/**
 * Validate request method
 */
export function validateMethod(
  req: Request,
  allowedMethods: string[]
): Response | null {
  if (!allowedMethods.includes(req.method)) {
    return errorResponse(
      'method_not_allowed',
      405,
      { allowed: allowedMethods }
    );
  }
  return null;
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: T | null,
  requiredFields: (keyof T)[]
): Response | null {
  if (!body) {
    return errorResponse('invalid_body', 400, { message: 'Request body is required' });
  }

  const missing = requiredFields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return errorResponse('missing_fields', 400, { fields: missing });
  }

  return null;
}

/**
 * Handle CORS preflight
 */
export function handleCorsPreflightResponse(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Create standardized success response
 */
export function successResponse<T>(data: T, message?: string): Response {
  const body = message ? { success: true, message, data } : { success: true, data };
  return jsonResponse(body, 200);
}
