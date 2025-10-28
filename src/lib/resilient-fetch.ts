// Resilient fetch utility with retry, backoff, and timeout

import { logger } from './log';

interface ResilientFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryOn?: number[];
  requestId?: string;
}

const DEFAULT_TIMEOUT = 30000; // 30s
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1s
const DEFAULT_RETRY_ON = [429, 500, 502, 503, 504];

// Jittered exponential backoff
function calculateBackoff(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponential + jitter, 60000); // Max 60s
}

// Check if error is retryable
function isRetryableError(error: any, retryOn: number[]): boolean {
  if (error.name === 'AbortError') return true;
  if (error.response && retryOn.includes(error.response.status)) return true;
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
  return false;
}

export async function resilientFetch<T = any>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryOn = DEFAULT_RETRY_ON,
    requestId,
    ...fetchOptions
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if we should retry on this status
      if (!response.ok && retryOn.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success
      if (attempt > 0) {
        logger.info(`Request succeeded after ${attempt} retries`, { url, attempt }, requestId);
      }

      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      // Check if we should retry
      if (attempt < retries && isRetryableError(error, retryOn)) {
        const backoff = calculateBackoff(attempt, retryDelay);
        logger.warn(
          `Request failed, retrying in ${backoff}ms (attempt ${attempt + 1}/${retries})`,
          { url, error: error.message },
          requestId
        );
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      // No more retries or non-retryable error
      logger.error(
        `Request failed after ${attempt} attempts`,
        { url, error: error.message },
        requestId
      );
      throw error;
    }
  }

  throw lastError;
}

// Specialized resilient fetch for Apify with quota/memory awareness
export async function resilientApifyFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  try {
    return await resilientFetch(url, {
      ...options,
      retryOn: [402, 429, 500, 502, 503, 504], // Include 402 (payment required)
    });
  } catch (error: any) {
    // Check for Apify-specific errors
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('quota') || errorMessage.includes('402')) {
      logger.error('Apify quota exceeded', { url, error: error.message }, options.requestId);
      throw new Error('QUOTA_EXCEEDED: Apify API quota has been reached. Please try again later.');
    }
    
    if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {
      logger.error('Apify memory limit reached', { url, error: error.message }, options.requestId);
      throw new Error('MEMORY_LIMIT: Apify run exceeded memory limits. Try with fewer items.');
    }
    
    throw error;
  }
}
