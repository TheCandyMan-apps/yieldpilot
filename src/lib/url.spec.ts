import { describe, it, expect } from 'vitest';

// Helpers to test (extracted for testing)
export function normalizeUrl(rawUrl: string): URL | null {
  try {
    let url = rawUrl.trim();
    // Auto-prefix https:// if starts with www.
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function detectSite(url: URL): 'zoopla' | 'rightmove' | null {
  const hostname = url.hostname.toLowerCase();
  if (hostname.includes('zoopla.co.uk')) return 'zoopla';
  if (hostname.includes('rightmove.co.uk')) return 'rightmove';
  return null;
}

describe('URL normalization', () => {
  it('should normalize valid https URLs', () => {
    const url = normalizeUrl('https://www.zoopla.co.uk/for-sale/property/london/');
    expect(url).not.toBeNull();
    expect(url?.protocol).toBe('https:');
  });

  it('should auto-prefix www. URLs with https://', () => {
    const url = normalizeUrl('www.rightmove.co.uk/property-for-sale/');
    expect(url).not.toBeNull();
    expect(url?.protocol).toBe('https:');
    expect(url?.hostname).toBe('www.rightmove.co.uk');
  });

  it('should reject non-http(s) protocols', () => {
    expect(normalizeUrl('ftp://example.com')).toBeNull();
    expect(normalizeUrl('file:///local/path')).toBeNull();
  });

  it('should handle whitespace', () => {
    const url = normalizeUrl('  https://www.zoopla.co.uk/for-sale/  ');
    expect(url).not.toBeNull();
    expect(url?.hostname).toBe('www.zoopla.co.uk');
  });

  it('should reject malformed URLs', () => {
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('https://')).toBeNull();
  });
});

describe('Site detection', () => {
  it('should detect Zoopla URLs', () => {
    const url = new URL('https://www.zoopla.co.uk/for-sale/property/london/');
    expect(detectSite(url)).toBe('zoopla');
  });

  it('should detect Rightmove URLs', () => {
    const url = new URL('https://www.rightmove.co.uk/property-for-sale/find.html');
    expect(detectSite(url)).toBe('rightmove');
  });

  it('should be case insensitive', () => {
    const url1 = new URL('https://WWW.ZOOPLA.CO.UK/for-sale/');
    const url2 = new URL('https://WWW.RIGHTMOVE.CO.UK/property/');
    expect(detectSite(url1)).toBe('zoopla');
    expect(detectSite(url2)).toBe('rightmove');
  });

  it('should return null for unsupported sites', () => {
    const url = new URL('https://www.example.com/property/');
    expect(detectSite(url)).toBeNull();
  });

  it('should handle detail page URLs', () => {
    const zooplaDetail = new URL('https://www.zoopla.co.uk/for-sale/details/67891234/');
    const rightmoveDetail = new URL('https://www.rightmove.co.uk/properties/123456789#/?channel=RES_BUY');
    expect(detectSite(zooplaDetail)).toBe('zoopla');
    expect(detectSite(rightmoveDetail)).toBe('rightmove');
  });
});
