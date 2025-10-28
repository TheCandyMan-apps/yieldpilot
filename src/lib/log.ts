// Structured logging utility

import { supabase } from '@/integrations/supabase/client';

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Generate a simple request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Mask sensitive data
function maskSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = { ...obj };
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'apiKey', 'api_key'];
  
  for (const key in masked) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitive(masked[key]);
    }
  }
  
  return masked;
}

// Log to console and optionally to Supabase
async function log(entry: LogEntry): Promise<void> {
  const { level, message, requestId, userId, metadata } = entry;
  
  // Always log to console
  const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  const maskedMetadata = metadata ? maskSensitive(metadata) : undefined;
  
  logMethod(`[${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ''} ${message}`, maskedMetadata || '');
  
  // Optionally persist to Supabase (fire and forget)
  try {
    await supabase.from('app_logs').insert({
      level,
      message,
      request_id: requestId,
      user_id: userId,
      metadata: maskedMetadata || {},
    });
  } catch (error) {
    // Silently fail - don't block on logging
    console.warn('Failed to persist log to Supabase:', error);
  }
}

export const logger = {
  info: (message: string, metadata?: Record<string, any>, requestId?: string) => 
    log({ level: 'info', message, metadata, requestId }),
    
  warn: (message: string, metadata?: Record<string, any>, requestId?: string) => 
    log({ level: 'warn', message, metadata, requestId }),
    
  error: (message: string, metadata?: Record<string, any>, requestId?: string) => 
    log({ level: 'error', message, metadata, requestId }),
};
