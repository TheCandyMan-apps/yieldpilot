import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// URL normalization tests
Deno.test("normalizeUrl - valid https URL", () => {
  function normalizeUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }
  
  const result = normalizeUrl("https://www.zoopla.co.uk/for-sale/property/london/");
  assertExists(result);
  assertEquals(result.protocol, "https:");
  assertEquals(result.hostname, "www.zoopla.co.uk");
});

Deno.test("normalizeUrl - valid http URL", () => {
  function normalizeUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }
  
  const result = normalizeUrl("http://www.rightmove.co.uk/property-for-sale/find.html");
  assertExists(result);
  assertEquals(result.protocol, "http:");
});

Deno.test("normalizeUrl - rejects non-http protocols", () => {
  function normalizeUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }
  
  assertEquals(normalizeUrl("ftp://example.com"), null);
  assertEquals(normalizeUrl("file:///path/to/file"), null);
  assertEquals(normalizeUrl("javascript:alert(1)"), null);
});

Deno.test("normalizeUrl - handles whitespace", () => {
  function normalizeUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }
  
  const result = normalizeUrl("  https://www.zoopla.co.uk/  ");
  assertExists(result);
  assertEquals(result.hostname, "www.zoopla.co.uk");
});

Deno.test("normalizeUrl - rejects invalid URLs", () => {
  function normalizeUrl(rawUrl: string): URL | null {
    try {
      const url = new URL(rawUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }
  
  assertEquals(normalizeUrl("not a url"), null);
  assertEquals(normalizeUrl(""), null);
  assertEquals(normalizeUrl("www.example.com"), null);
});

// Site detection tests
Deno.test("detectSite - recognizes Zoopla", () => {
  function detectSite(url: URL): 'zoopla' | 'rightmove' | null {
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('zoopla.co.uk')) return 'zoopla';
    if (hostname.includes('rightmove.co.uk')) return 'rightmove';
    return null;
  }
  
  const url = new URL("https://www.zoopla.co.uk/for-sale/property/london/");
  assertEquals(detectSite(url), "zoopla");
});

Deno.test("detectSite - recognizes Rightmove", () => {
  function detectSite(url: URL): 'zoopla' | 'rightmove' | null {
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('zoopla.co.uk')) return 'zoopla';
    if (hostname.includes('rightmove.co.uk')) return 'rightmove';
    return null;
  }
  
  const url = new URL("https://www.rightmove.co.uk/property-for-sale/find.html");
  assertEquals(detectSite(url), "rightmove");
});

Deno.test("detectSite - rejects unsupported sites", () => {
  function detectSite(url: URL): 'zoopla' | 'rightmove' | null {
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('zoopla.co.uk')) return 'zoopla';
    if (hostname.includes('rightmove.co.uk')) return 'rightmove';
    return null;
  }
  
  assertEquals(detectSite(new URL("https://www.onthemarket.com")), null);
  assertEquals(detectSite(new URL("https://www.example.com")), null);
});

Deno.test("detectSite - case insensitive", () => {
  function detectSite(url: URL): 'zoopla' | 'rightmove' | null {
    const hostname = url.hostname.toLowerCase();
    if (hostname.includes('zoopla.co.uk')) return 'zoopla';
    if (hostname.includes('rightmove.co.uk')) return 'rightmove';
    return null;
  }
  
  assertEquals(detectSite(new URL("https://WWW.ZOOPLA.CO.UK/test")), "zoopla");
  assertEquals(detectSite(new URL("https://WWW.RIGHTMOVE.CO.UK/test")), "rightmove");
});
