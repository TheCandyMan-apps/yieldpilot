export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const logger = {
  info: (message: string, metadata?: Record<string, any>, requestId?: string) => {
    console.log(`[INFO]${requestId ? ` [${requestId}]` : ''} ${message}`, metadata || '');
  },
  
  warn: (message: string, metadata?: Record<string, any>, requestId?: string) => {
    console.warn(`[WARN]${requestId ? ` [${requestId}]` : ''} ${message}`, metadata || '');
  },
  
  error: (message: string, metadata?: Record<string, any>, requestId?: string) => {
    console.error(`[ERROR]${requestId ? ` [${requestId}]` : ''} ${message}`, metadata || '');
  }
};